/* Converts the RSA private key SpiderPool issues into the two integers the
 * Worker signs with.
 *
 *   node scripts/spiderpool-key.mjs < private-key.b64
 *   node scripts/spiderpool-key.mjs --set < private-key.b64     # writes the secrets
 *
 * SpiderPool generates the keypair and keeps the public half — you do not
 * create it. What they hand back is a base64 PKCS#8 private key. The Worker
 * stores it as hex modulus + private exponent rather than a PEM so it does not
 * need an ASN.1 parser at runtime just to read two integers.
 *
 * Prints the modulus and a fingerprint; never prints the private exponent.
 * With --set it pipes the values straight into `wrangler secret put`, so the
 * secret is not echoed anywhere.
 */
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const b64 = (await new Promise((res) => {
  let d = ""; process.stdin.on("data", (c) => (d += c)); process.stdin.on("end", () => res(d));
})).replace(/\s+/g, "");

if (!b64) { console.error("Pipe SpiderPool's base64 private key in on stdin."); process.exit(1); }

let key;
try {
  key = crypto.createPrivateKey({ key: Buffer.from(b64, "base64"), format: "der", type: "pkcs8" });
} catch {
  try {
    key = crypto.createPrivateKey({ key: Buffer.from(b64, "base64"), format: "der", type: "pkcs1" });
  } catch (e) { console.error("Not a PKCS#8 or PKCS#1 RSA private key:", e.message); process.exit(1); }
}

const jwk = key.export({ format: "jwk" });
if (jwk.kty !== "RSA") { console.error(`Expected an RSA key, got ${jwk.kty}`); process.exit(1); }
const modulusHex = Buffer.from(jwk.n, "base64url").toString("hex");
const dHex = Buffer.from(jwk.d, "base64url").toString("hex");
const bits = Buffer.from(jwk.n, "base64url").length * 8;

// Prove it before anyone depends on it: a key that cannot sign its own probe
// would show up only as SpiderPool rejecting every request.
const probe = '{"coin":"BTC"}|1628381288000';
const sig = crypto.createSign("RSA-MD5").update(probe).sign(key);
const pub = crypto.createPublicKey(key);
if (!crypto.createVerify("RSA-MD5").update(probe).verify(pub, sig)) {
  console.error("key failed its own sign/verify round trip — do not use it");
  process.exit(1);
}

console.error(`RSA ${bits}-bit, sign/verify OK`);
console.error(`public key (must match what SpiderPool shows):`);
console.error(pub.export({ type: "spki", format: "der" }).toString("base64"));

if (process.argv.includes("--set")) {
  for (const [name, value] of [["SPIDERPOOL_KEY_MODULUS", modulusHex], ["SPIDERPOOL_KEY_D", dHex]]) {
    execFileSync("npx", ["wrangler", "secret", "put", name], {
      cwd: new URL("../api-worker/", import.meta.url).pathname,
      input: value, stdio: ["pipe", "inherit", "inherit"],
    });
  }
  console.error("secrets set. SPIDERPOOL_ACCESS_KEY still has to be set separately.");
} else {
  console.error(`\nSPIDERPOOL_KEY_MODULUS\n${modulusHex}\n`);
  console.error("SPIDERPOOL_KEY_D  (not printed — re-run with --set to write it directly)");
}
