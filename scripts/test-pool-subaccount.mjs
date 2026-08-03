/* Pool sub-account naming.
 *
 *   node scripts/test-pool-subaccount.mjs
 *
 * This identifier is permanent in a way almost nothing else here is: at
 * SpiderPool a sub-account cannot be deleted, so a name that is wrong, that
 * collides, or that changes between two runs leaves damage that cannot be
 * undone. Hence rather more tests than a string function usually earns.
 */
import { poolSubaccountName, SUBACCOUNT_RE } from "../api-worker/src/index.js";

let pass = 0, fail = 0;
const ok = (n, cond) => { if (cond) { pass++; console.log("  ok   " + n); } else { fail++; console.log("  FAIL " + n); } };
const eq = (n, a, b) => ok(`${n}  (${JSON.stringify(a)} === ${JSON.stringify(b)})`, JSON.stringify(a) === JSON.stringify(b));

const UUIDS = [
  "6830a5d0-c5fa-4515-bff1-f0badf7a770b",
  "00000000-0000-0000-0000-000000000000",
  "ffffffff-ffff-ffff-ffff-ffffffffffff",
  "1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809",
];

console.log("format — must satisfy BOTH pools, so a switch needs no re-provisioning");
for (const id of UUIDS) {
  const n = await poolSubaccountName(id);
  ok(`${id.slice(0, 8)}… -> ${n}`, SUBACCOUNT_RE.test(n));
}

const sample = await poolSubaccountName(UUIDS[0]);
eq("length is 14", sample.length, 14);
ok("starts with a letter (F2Pool requires it)", /^[a-z]/.test(sample));
ok("lowercase alphanumeric only", /^[a-z0-9]+$/.test(sample));
ok("within SpiderPool's 5-20", sample.length >= 5 && sample.length <= 20);
ok("within F2Pool's 2-15", sample.length >= 2 && sample.length <= 15);

console.log("\ndeterminism — a retry after a half-failed provisioning must ask for the SAME name");
const twice = await Promise.all([poolSubaccountName(UUIDS[0]), poolSubaccountName(UUIDS[0])]);
eq("same input, same name", twice[0], twice[1]);
eq("and again, cold", await poolSubaccountName(UUIDS[0]), sample);

console.log("\nthe name must not leak the user");
const named = await poolSubaccountName("6830a5d0-c5fa-4515-bff1-f0badf7a770b");
ok("contains no part of any username", !/alice|bob|sina|hashrial/.test(named.slice(2)));

console.log("\ncollision — distinct users must never share a sub-account");
const seen = new Map();
let collisions = 0;
for (let i = 0; i < 20000; i++) {
  // Deterministic pseudo-UUIDs so this test is reproducible.
  const id = `${i.toString(16).padStart(8, "0")}-0000-4000-8000-000000000000`;
  const n = await poolSubaccountName(id);
  if (seen.has(n)) { collisions++; console.log(`    ${n} <- ${seen.get(n)} AND ${id}`); }
  seen.set(n, id);
}
eq("20000 distinct ids -> 20000 distinct names", collisions, 0);

console.log("\nthe usernames that motivated deriving from the UUID instead");
// bob_1 and bob1 both sanitise to "bob1" if you strip illegal characters, which
// would merge two real users permanently. Deriving from the id cannot do that.
const a = await poolSubaccountName("aaaaaaaa-0000-4000-8000-000000000000");
const b = await poolSubaccountName("bbbbbbbb-0000-4000-8000-000000000000");
ok("two users differing only by an illegal char are still distinct", a !== b);

console.log("\nrejects input it cannot derive from");
for (const bad of [null, undefined, "", 123, {}]) {
  let threw = false;
  try { await poolSubaccountName(bad); } catch { threw = true; }
  ok(`${JSON.stringify(bad)} throws rather than returning something unusable`, threw);
}

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
