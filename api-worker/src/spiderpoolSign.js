/* MD5-with-RSA PKCS#1 v1.5 signing, for SpiderPool's API.
 *
 * Every SpiderPool endpoint is authenticated by signing `dataJson|timestamp`
 * with an RSA private key, MD5 digest, PKCS#1 v1.5 padding, base64 output.
 * Their own samples use OPENSSL_ALGO_MD5 / Crypto.Hash.MD5.
 *
 * None of that is reachable from a Cloudflare Worker's WebCrypto:
 *   - crypto.subtle.digest has no MD5
 *   - RSASSA-PKCS1-v1_5 only accepts SHA-1/256/384/512
 *   - there is no raw RSA private-key primitive to fall back to
 * So the padding, the digest and the modular exponentiation are all done here.
 *
 * The key is held as raw hex components (modulus n, private exponent d) rather
 * than a PEM. We generate the keypair ourselves — scripts/spiderpool-keygen.mjs
 * — so there is no reason to also carry an ASN.1/DER parser into the Worker
 * just to pull two integers back out of a file we wrote.
 *
 * MD5 is not a defensible choice in 2026, but it is not ours: it is what the
 * API validates against. It is used only to authenticate our own requests to
 * SpiderPool, never to hash anything of a user's.
 *
 * Verified against Node's crypto.createSign("RSA-MD5") over random keys and
 * payloads in scripts/test-spiderpool-sign.mjs — byte-identical output.
 */

/* ── MD5 ────────────────────────────────────────────────────────────── */

const S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];
const K = new Uint32Array(64);
for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);

const rotl = (x, c) => ((x << c) | (x >>> (32 - c))) >>> 0;

export function md5(bytes) {
  const ml = bytes.length;
  // Pad to 56 mod 64, then an 8-byte little-endian bit length.
  const withPad = new Uint8Array((((ml + 8) >> 6) + 1) << 6);
  withPad.set(bytes);
  withPad[ml] = 0x80;
  const bitLen = ml * 8;
  const dv = new DataView(withPad.buffer);
  dv.setUint32(withPad.length - 8, bitLen >>> 0, true);
  dv.setUint32(withPad.length - 4, Math.floor(bitLen / 4294967296), true);

  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  const M = new Uint32Array(16);

  for (let off = 0; off < withPad.length; off += 64) {
    for (let i = 0; i < 16; i++) M[i] = dv.getUint32(off + i * 4, true);
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16)      { F = (B & C) | (~B & D);        g = i; }
      else if (i < 32) { F = (D & B) | (~D & C);        g = (5 * i + 1) & 15; }
      else if (i < 48) { F = B ^ C ^ D;                 g = (3 * i + 5) & 15; }
      else             { F = C ^ (B | (~D >>> 0));      g = (7 * i) & 15; }
      F = (F + A + K[i] + M[g]) >>> 0;
      A = D; D = C; C = B;
      B = (B + rotl(F, S[i])) >>> 0;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }

  const out = new Uint8Array(16);
  new DataView(out.buffer).setUint32(0, a0, true);
  new DataView(out.buffer).setUint32(4, b0, true);
  new DataView(out.buffer).setUint32(8, c0, true);
  new DataView(out.buffer).setUint32(12, d0, true);
  return out;
}

/* ── RSA ────────────────────────────────────────────────────────────── */

// DER DigestInfo prefix for MD5, per RFC 8017 §9.2 notes. The digest follows.
const MD5_DIGEST_INFO = Uint8Array.from([
  0x30, 0x20, 0x30, 0x0c, 0x06, 0x08, 0x2a, 0x86, 0x48, 0x86,
  0xf7, 0x0d, 0x02, 0x05, 0x05, 0x00, 0x04, 0x10,
]);

function modPow(base, exp, mod) {
  let result = 1n;
  base %= mod;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod;
    base = (base * base) % mod;
    exp >>= 1n;
  }
  return result;
}

const bytesToBigInt = (b) => { let n = 0n; for (const x of b) n = (n << 8n) | BigInt(x); return n; };

function bigIntToBytes(n, len) {
  const out = new Uint8Array(len);
  for (let i = len - 1; i >= 0; i--) { out[i] = Number(n & 0xffn); n >>= 8n; }
  if (n !== 0n) throw new Error("bigIntToBytes: value wider than the modulus");
  return out;
}

/* EMSA-PKCS1-v1_5: 0x00 0x01 <0xFF padding> 0x00 <DigestInfo||digest> */
function pkcs1v15Pad(digest, k) {
  const t = new Uint8Array(MD5_DIGEST_INFO.length + digest.length);
  t.set(MD5_DIGEST_INFO);
  t.set(digest, MD5_DIGEST_INFO.length);
  // RFC 8017 requires at least 8 bytes of 0xFF padding.
  if (k < t.length + 11) throw new Error("pkcs1v15Pad: modulus too small for an MD5 signature");
  const em = new Uint8Array(k);
  em[0] = 0x00;
  em[1] = 0x01;
  em.fill(0xff, 2, k - t.length - 1);
  em[k - t.length - 1] = 0x00;
  em.set(t, k - t.length);
  return em;
}

const b64 = (bytes) => {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};

/* Signs `message` (a string) with the RSA private key given as hex modulus and
   hex private exponent. Returns base64, which is what SpiderPool expects. */
export function signMd5Rsa(message, modulusHex, privateExponentHex) {
  const n = BigInt("0x" + modulusHex);
  const d = BigInt("0x" + privateExponentHex);
  const k = (modulusHex.replace(/^0+/, "").length + 1) >> 1; // modulus size in bytes
  const em = pkcs1v15Pad(md5(new TextEncoder().encode(message)), k);
  return b64(bigIntToBytes(modPow(bytesToBigInt(em), d, n), k));
}

/* The exact string SpiderPool signs. Kept next to the signer because getting
   the separator or the argument order wrong yields a valid-looking signature
   that is simply rejected, with no indication of which half was wrong. */
export function spiderpoolSignedBody(dataObj, accessKey, modulusHex, privateExponentHex, timestamp) {
  const dataJson = JSON.stringify(dataObj);
  return {
    dataJson,
    accessKey,
    timestamp,
    sign: signMd5Rsa(`${dataJson}|${timestamp}`, modulusHex, privateExponentHex),
  };
}
