/* Generates the RSA keypair SpiderPool's API authenticates with.
 *
 *   node scripts/spiderpool-keygen.mjs
 *
 * SpiderPool signs with your private key and verifies with the public key you
 * give them. The Worker stores the key as two hex integers rather than a PEM,
 * so it does not need an ASN.1 parser just to read back a file we wrote.
 *
 * The private key is printed ONCE and never written to disk. Set the secrets,
 * then close the terminal.
 */
import crypto from "node:crypto";

const BITS = 2048;

const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: BITS });
const jwk = privateKey.export({ format: "jwk" });
const modulusHex = Buffer.from(jwk.n, "base64url").toString("hex");
const dHex = Buffer.from(jwk.d, "base64url").toString("hex");

// Prove the pair works before anyone pastes it anywhere.
const probe = '{"coin":"BTC"}|1628381288000';
const sig = crypto.createSign("RSA-MD5").update(probe).sign(privateKey);
if (!crypto.createVerify("RSA-MD5").update(probe).verify(publicKey, sig)) {
  console.error("generated keypair failed its own verification — do not use it");
  process.exit(1);
}

console.log(`
────────────────────────────────────────────────────────────────────────
1. GIVE THIS PUBLIC KEY TO SPIDERPOOL
   Account Management → Access Key. They verify your requests with it.
────────────────────────────────────────────────────────────────────────
${publicKey.export({ type: "spki", format: "pem" }).toString().trim()}

────────────────────────────────────────────────────────────────────────
2. SET THESE THREE SECRETS ON THE WORKER
   Never in wrangler.toml — that file is committed.
────────────────────────────────────────────────────────────────────────
cd api-worker
npx wrangler secret put SPIDERPOOL_ACCESS_KEY      # from their console, not generated here
npx wrangler secret put SPIDERPOOL_KEY_MODULUS
npx wrangler secret put SPIDERPOOL_KEY_D

SPIDERPOOL_KEY_MODULUS
${modulusHex}

SPIDERPOOL_KEY_D
${dHex}

────────────────────────────────────────────────────────────────────────
3. CONFIRM IT WORKS END TO END
────────────────────────────────────────────────────────────────────────
node scripts/verify-spiderpool.js

The private exponent above is secret and is not saved anywhere. If you lose
it, generate a new pair and give SpiderPool the new public key.
────────────────────────────────────────────────────────────────────────
`);
