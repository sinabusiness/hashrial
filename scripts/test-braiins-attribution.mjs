/* Unit tests for Braiins aggregate-account attribution.
 *
 * These cover the arithmetic that decides what each user is owed when all
 * hashrate sits in ONE pool account. The API field names still need checking
 * against a live response (scripts/verify-braiins.js) — this file verifies the
 * logic that runs once those fields arrive.
 *
 *   node scripts/test-braiins-attribution.mjs
 */
import { parseBraiinsWorkerLabel, buildBraiinsAttribution, toTeraHash } from "../api-worker/src/index.js";

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}\n         got  ${g}\n         want ${w}`); }
};

console.log("parseBraiinsWorkerLabel");
eq("strips the account prefix",
   parseBraiinsWorkerLabel("hashrial.alice_rig01", "hashrial"), { username: "alice", worker: "rig01" });
eq("works without the prefix",
   parseBraiinsWorkerLabel("alice_rig01", "hashrial"), { username: "alice", worker: "rig01" });
eq("worker names may contain underscores",
   parseBraiinsWorkerLabel("hashrial.alice_rig_01_b", "hashrial"), { username: "alice", worker: "rig_01_b" });
eq("fee-routed shares are flagged, not attributed",
   parseBraiinsWorkerLabel("hashrial.fee.alice_rig01", "hashrial"), { fee: true });
eq("bare fee label", parseBraiinsWorkerLabel("hashrial.fee", "hashrial"), { fee: true });
eq("no underscore is unparseable", parseBraiinsWorkerLabel("hashrial.alice", "hashrial"), null);
eq("leading underscore is unparseable", parseBraiinsWorkerLabel("_rig01", "hashrial"), null);
eq("trailing underscore is unparseable", parseBraiinsWorkerLabel("alice_", "hashrial"), null);
eq("empty", parseBraiinsWorkerLabel("", "hashrial"), null);
eq("non-string", parseBraiinsWorkerLabel(null, "hashrial"), null);

console.log("\nbuildBraiinsAttribution — refuses to write on a bad shape");
const goodProfile = { btc: { current_balance: "0.05", all_time_reward: "1.2", today_reward: "0.01" } };
const goodWorkers = { btc: { workers: {
  "hashrial.alice_rig01": { shares_24h: 600, hash_rate_5m: 100, hash_rate_60m: 98, hash_rate_24h: 97, state: "ok", last_share: 1785340000, hash_rate_unit: "Th/s" },
  "hashrial.bob_rig01":   { shares_24h: 300, hash_rate_5m: 50,  hash_rate_60m: 49, hash_rate_24h: 48, state: "ok", last_share: 1785340001, hash_rate_unit: "Th/s" },
  "hashrial.fee.alice_rig01": { shares_24h: 100, hash_rate_5m: 5, state: "ok", last_share: 1785340002 },
} } };

eq("null profile -> null", buildBraiinsAttribution(null, goodWorkers, "hashrial"), null);
eq("null workers -> null", buildBraiinsAttribution(goodProfile, null, "hashrial"), null);
eq("profile missing current_balance -> null",
   buildBraiinsAttribution({ btc: { all_time_reward: 1, today_reward: 1 } }, goodWorkers, "hashrial"), null);
eq("workers present but none carry shares_24h -> null",
   buildBraiinsAttribution(goodProfile,
     { btc: { workers: { "hashrial.alice_rig01": { hash_rate_5m: 100 } } } }, "hashrial"), null);

console.log("\nbuildBraiinsAttribution — happy path");
const a = buildBraiinsAttribution(goodProfile, goodWorkers, "hashrial");
eq("account balance parsed", a.account.balance, 0.05);
eq("two users attributed (fee row excluded)", a.rows.length, 2);
eq("fee shares excluded from the split total", a.totalShares, 900);
eq("alice attributed", a.rows.find(r => r.username === "alice").shares, 600);
eq("bob attributed", a.rows.find(r => r.username === "bob").shares, 300);
eq("hash rate unit carried through", a.rows[0].unit, "Th/s");

console.log("\nrevenue split (what each user is actually owed)");
const split = a.rows.map(r => ({
  username: r.username,
  share: r.shares / a.totalShares,
  owed: +(a.account.balance * (r.shares / a.totalShares)).toFixed(8),
}));
eq("alice gets 2/3", split.find(s => s.username === "alice").share, 2 / 3);
eq("bob gets 1/3", split.find(s => s.username === "bob").share, 1 / 3);
eq("owed sums to the account balance",
   +(split.reduce((n, s) => n + s.owed, 0)).toFixed(8), 0.05);

console.log("\nbare-root envelope (no 'btc' nesting) still parses");
const bare = buildBraiinsAttribution(
  { current_balance: "0.02", all_time_reward: "1", today_reward: "0.5" },
  { workers: { "alice_rig01": { shares_24h: 10, hash_rate_5m: 1, state: "ok" } } },
  "hashrial");
eq("bare root handled", bare && bare.rows.length, 1);

console.log("\ntoTeraHash — unit normalisation (a 1000x slip here misprices payouts)");
eq("Th/s passes through", toTeraHash(100, "Th/s"), 100);
eq("Gh/s scales down", toTeraHash(1000, "Gh/s"), 1);
eq("Ph/s scales up", toTeraHash(2, "Ph/s"), 2000);
eq("Eh/s scales up", toTeraHash(1, "Eh/s"), 1e6);
eq("Mh/s", toTeraHash(1e6, "Mh/s"), 1);
eq("case insensitive", toTeraHash(1000, "gh/s"), 1);
eq("whitespace tolerated", toTeraHash(1000, " Gh/s "), 1);
eq("missing unit assumed TH/s", toTeraHash(50, null), 50);
eq("unknown unit falls back rather than zeroing", toTeraHash(50, "furlongs"), 50);
eq("non-numeric -> 0", toTeraHash("abc", "Th/s"), 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
