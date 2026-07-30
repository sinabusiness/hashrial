/* Simulates the crediting job's arithmetic against a fake ledger to prove the
   three properties that matter for money: exact, self-healing, never double. */
import { referralReward } from "../api-worker/src/index.js";
let pass=0, fail=0;
const eq=(n,g,w)=>{const a=JSON.stringify(g),b=JSON.stringify(w);
  if(a===b){pass++;console.log("  ok   "+n);}else{fail++;console.log(`  FAIL ${n}\n    got  ${a}\n    want ${b}`);}};

// ledger = the referral_earnings rows for one referred user
function runJob(lifetimeTotal, ledger, settleDate) {
  const credited = ledger.reduce((n,r)=>n+r.referred_gross_btc, 0);
  const newGross = lifetimeTotal - credited;
  if (!(newGross > 0)) return null;
  const { gross, fee, reward } = referralReward(newGross);
  if (!(reward > 0)) return null;
  // UNIQUE(referrer, referred, settle_date)
  if (ledger.some(r => r.settle_date === settleDate)) return "duplicate-rejected";
  return { settle_date: settleDate, referred_gross_btc: gross, fee_btc: fee, reward_btc: reward };
}

console.log("day 1 — first ever credit");
const led=[];
let r1=runJob(1.0, led, "2026-07-30");
eq("credits 1% of gross", r1.reward_btc, 0.01);
led.push(r1);

console.log("\nsame day, job runs again (retry / restart)");
// The delta arithmetic catches this BEFORE the UNIQUE constraint is reached:
// gross already credited == lifetime, so there is nothing to write. Two
// independent protections, and this is the first one.
eq("re-run same day writes nothing (delta layer)", runJob(1.0, led, "2026-07-30"), null);

console.log("\nsame day, but the user earned MORE after the first credit");
// Now the delta IS positive, so the UNIQUE constraint is what protects us —
// the second layer. The increment is not lost: the next day's run recomputes
// from the ledger and picks it up.
eq("UNIQUE rejects a second row for the same day", runJob(1.2, led, "2026-07-30"), "duplicate-rejected");
eq("and the deferred 0.2 is picked up the next day",
   runJob(1.2, led, "2026-07-31").referred_gross_btc, 0.2);

console.log("\nday 2 — user earned another 0.5");
let r2=runJob(1.5, led, "2026-07-31");
eq("credits only the NEW 0.5, not the lifetime 1.5", r2.referred_gross_btc, 0.5);
eq("reward is 1% of the delta", r2.reward_btc, 0.005);
led.push(r2);

console.log("\njob does not run for 3 days, user earned 0.9 across them");
let r3=runJob(2.4, led, "2026-08-04");
eq("self-heals: credits the whole 0.9 gap", r3.referred_gross_btc, 0.9);
eq("nothing lost", r3.reward_btc, 0.009);
led.push(r3);

console.log("\nno new earnings");
eq("writes nothing rather than a zero row", runJob(2.4, led, "2026-08-05"), null);

console.log("\ntotals reconcile");
const totalReward=led.reduce((n,r)=>n+r.reward_btc,0);
const totalGross=led.reduce((n,r)=>n+r.referred_gross_btc,0);
eq("sum of credited gross equals lifetime earnings", +totalGross.toFixed(8), 2.4);
eq("sum of rewards is exactly 1% of lifetime", +totalReward.toFixed(8), 0.024);

console.log("\nadversarial");
eq("earnings going backwards (correction) credits nothing", runJob(1.0, led, "2026-08-06"), null);
eq("zero lifetime credits nothing", runJob(0, [], "2026-08-06"), null);
eq("dust below a satoshi of reward writes nothing", runJob(0.0000001, [], "2026-08-06"), null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
