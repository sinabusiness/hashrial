/* MD5-with-RSA signing for SpiderPool.
 *
 *   node scripts/test-spiderpool-sign.mjs
 *
 * The Worker cannot use WebCrypto for this (no MD5, no raw RSA), so the digest,
 * the PKCS#1 v1.5 padding and the modular exponentiation are all hand-rolled in
 * api-worker/src/spiderpoolSign.js. Hand-rolled crypto is worth exactly as much
 * as its verification, so this checks the output byte-for-byte against Node's
 * own OpenSSL-backed RSA-MD5 over freshly generated keys.
 *
 * A wrong signature here is not a loud failure — SpiderPool simply rejects
 * every request, and the symptom is a poller that silently reports nothing.
 */
import crypto from "node:crypto";
import { md5, signMd5Rsa, spiderpoolSignedBody } from "../api-worker/src/spiderpoolSign.js";

let pass = 0, fail = 0;
const ok = (n, cond) => { if (cond) { pass++; console.log("  ok   " + n); } else { fail++; console.log("  FAIL " + n); } };
const hex = (b) => Buffer.from(b).toString("hex");

console.log("MD5 — RFC 1321 test vectors");
const VECTORS = [
  ["", "d41d8cd98f00b204e9800998ecf8427e"],
  ["a", "0cc175b9c0f1b6a831c399e269772661"],
  ["abc", "900150983cd24fb0d6963f7d28e17f72"],
  ["message digest", "f96b697d7cb7938d525a2f31aaf161d0"],
  ["abcdefghijklmnopqrstuvwxyz", "c3fcd3d76192e4007dfb496cca67e13b"],
  ["12345678901234567890123456789012345678901234567890123456789012345678901234567890",
   "57edf4a22be3c955ac49da2e2107b67a"],
];
for (const [input, expect] of VECTORS) {
  ok(`md5(${JSON.stringify(input.slice(0, 24))}${input.length > 24 ? "…" : ""})`,
     hex(md5(new TextEncoder().encode(input))) === expect);
}

console.log("\nMD5 — agrees with Node across lengths (block-boundary padding)");
let mismatches = 0;
for (let len = 0; len < 200; len++) {
  const buf = crypto.randomBytes(len);
  const mine = hex(md5(new Uint8Array(buf)));
  const theirs = crypto.createHash("md5").update(buf).digest("hex");
  if (mine !== theirs) { mismatches++; console.log(`    length ${len}: ${mine} != ${theirs}`); }
}
ok("lengths 0..199 all match Node", mismatches === 0);

console.log("\nRSA-MD5 — byte-identical to Node's signer, over fresh keys");
for (const bits of [2048, 3072]) {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: bits });
  const jwk = privateKey.export({ format: "jwk" });
  const modulusHex = Buffer.from(jwk.n, "base64url").toString("hex");
  const dHex = Buffer.from(jwk.d, "base64url").toString("hex");

  let bad = 0;
  for (let i = 0; i < 5; i++) {
    const msg = `{"coin":"BTC","subaccount":"hrtest${i}"}|${1628381288000 + i}`;
    const theirs = crypto.createSign("RSA-MD5").update(msg).sign(privateKey, "base64");
    const mine = signMd5Rsa(msg, modulusHex, dHex);
    if (mine !== theirs) { bad++; console.log(`    ${bits}-bit msg ${i} differs`); }
  }
  ok(`${bits}-bit: 5/5 signatures identical to OpenSSL`, bad === 0);

  // And the signature actually verifies against the public key, which is what
  // SpiderPool will do with the public key we upload.
  const msg = `{"coin":"BTC"}|1628381288000`;
  const sig = signMd5Rsa(msg, modulusHex, dHex);
  ok(`${bits}-bit: verifies against the public key`,
     crypto.createVerify("RSA-MD5").update(msg).verify(publicKey, Buffer.from(sig, "base64")));
}

console.log("\nrequest body — the exact shape SpiderPool expects");
const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = privateKey.export({ format: "jwk" });
const nHex = Buffer.from(jwk.n, "base64url").toString("hex");
const dHex = Buffer.from(jwk.d, "base64url").toString("hex");

const body = spiderpoolSignedBody({ coin: "BTC", subaccount: "hrrrr1m4anj61r" }, "ACCESSKEY123", nHex, dHex, 1628381288000);
ok("has exactly dataJson/accessKey/timestamp/sign",
   JSON.stringify(Object.keys(body).sort()) === JSON.stringify(["accessKey", "dataJson", "sign", "timestamp"]));
ok("dataJson is a STRING, not a nested object", typeof body.dataJson === "string");
ok("signs dataJson|timestamp, in that order and with that separator",
   crypto.createVerify("RSA-MD5").update(`${body.dataJson}|${body.timestamp}`)
     .verify(privateKey.export({ type: "pkcs1", format: "pem" }), Buffer.from(body.sign, "base64")));
ok("signature is base64", /^[A-Za-z0-9+/]+=*$/.test(body.sign));

console.log("\nrefuses to produce a signature it knows is wrong");
let threw = false;
try { signMd5Rsa("x", "0101", "0101"); } catch { threw = true; }
ok("a modulus too small for MD5 padding throws rather than signing garbage", threw);

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
