/* The three upstream naming models, and the fee mechanism each implies.
 *
 *   node scripts/test-pool-modes.mjs
 *
 * Getting this wrong does not throw — it credits one user's hashrate to
 * another account, or to nobody. Every case below is a way that has already
 * happened or was one edit away from happening.
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

let pass = 0, fail = 0;
const ok = (n, cond) => { if (cond) { pass++; console.log("  ok   " + n); } else { fail++; console.log("  FAIL " + n); } };
const eq = (n, a, b) => ok(`${n}  (${JSON.stringify(a)})`, JSON.stringify(a) === JSON.stringify(b));

function load(env) {
  for (const k of Object.keys(process.env)) if (/^(ACTIVE_POOL|POOL_|BRAIINS_|SPIDERPOOL_|MAIN_SUBACCOUNT|FEE_SUBACCOUNT|ANTPOOL_)/.test(k)) delete process.env[k];
  Object.assign(process.env, env);
  delete require.cache[require.resolve("../proxy/src/poolConfig.js")];
  return require("../proxy/src/poolConfig.js");
}

const SESSION = { username: "alice", workerName: "rig01", poolIndex: 1, poolSubaccount: "hrrrr1m4anj61r" };

console.log("spiderpool — one real sub-account per user, opaque name from the DB");
{
  const m = load({ ACTIVE_POOL: "spiderpool" });
  const POOL = m.loadPoolConfig();
  eq("upstream name is subaccount.worker", m.buildUpstreamUsername(POOL, SESSION), "hrrrr1m4anj61r.rig01");
  ok("exactly one dot — SpiderPool rejects a second one",
     (m.buildUpstreamUsername(POOL, SESSION).match(/\./g) || []).length === 1);
  ok("the username never appears upstream", !m.buildUpstreamUsername(POOL, SESSION).includes("alice"));
  eq("no sub-account yet -> null, never a fallback",
     m.buildUpstreamUsername(POOL, { ...SESSION, poolSubaccount: null }), null);
  ok("fee is arithmetic, not share tagging", POOL.feeViaShareTagging === false);
  eq("missing worker name still yields a valid label",
     m.buildUpstreamUsername(POOL, { ...SESSION, workerName: null }), "hrrrr1m4anj61r.default");
}

console.log("\nbraiins — one aggregate account, user encoded in the worker label");
{
  const m = load({ ACTIVE_POOL: "braiins" });
  const POOL = m.loadPoolConfig();
  eq("upstream name is account.user_worker", m.buildUpstreamUsername(POOL, SESSION), "hashrial.alice_rig01");
  eq("fee share is tagged with the fee- marker", m.buildFeeUsername(POOL, SESSION), "hashrial.fee-alice_rig01");
  ok("fee IS share tagging here", POOL.feeViaShareTagging !== false);
  ok("dots in a rig name are sanitised away (Braiins would bin it into [auto])",
     (m.buildUpstreamUsername(POOL, { ...SESSION, workerName: "rig.01" }).match(/\./g) || []).length === 1);
}

console.log("\nantpool — pre-created sub-account per user, sharded by pool index");
{
  const m = load({ ACTIVE_POOL: "antpool" });
  const POOL = m.loadPoolConfig();
  eq("upstream name is accountN.user.worker", m.buildUpstreamUsername(POOL, SESSION), "hashrial1.alice.rig01");
  ok("fee IS share tagging here too", POOL.feeViaShareTagging !== false);
}

console.log("\nthe modes must not bleed into one another");
{
  const sp = load({ ACTIVE_POOL: "spiderpool" });
  const spPool = sp.loadPoolConfig();
  ok("spiderpool is not sharded", spPool.sharded === false);
  ok("spiderpool ignores poolIndex entirely",
     sp.buildUpstreamUsername(spPool, { ...SESSION, poolIndex: 7 }) === sp.buildUpstreamUsername(spPool, SESSION));
  const br = load({ ACTIVE_POOL: "braiins" });
  ok("braiins ignores a stray poolSubaccount",
     !br.buildUpstreamUsername(br.loadPoolConfig(), SESSION).includes("hrrrr1m4anj61r"));
}

console.log("\nunknown pool names still fail loudly at startup");
{
  let threw = false;
  try { load({ ACTIVE_POOL: "nosuchpool" }).loadPoolConfig(); } catch { threw = true; }
  ok("ACTIVE_POOL=nosuchpool throws rather than mining somewhere wrong", threw);
}

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
