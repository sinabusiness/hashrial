import { referralReward } from "../api-worker/src/index.js";
let pass=0, fail=0;
const eq=(n,g,w)=>{const a=JSON.stringify(g),b=JSON.stringify(w);
  if(a===b){pass++;console.log("  ok   "+n);}else{fail++;console.log(`  FAIL ${n}\n    got  ${a}\n    want ${b}`);}};

console.log("referralReward — 2% fee, referrer gets half of it (= 1% of gross)");
eq("1 BTC gross", referralReward(1), { gross:1, fee:0.02, reward:0.01 });
eq("0.5 BTC gross", referralReward(0.5), { gross:0.5, fee:0.01, reward:0.005 });
eq("reward is exactly 1% of gross", referralReward(2).reward, 0.02);
eq("rounds to 8dp, never more", referralReward(0.000000123).reward, 0);
eq("small but non-zero survives", referralReward(0.0001).reward, 0.000001);
eq("zero", referralReward(0), { gross:0, fee:0, reward:0 });
eq("negative rejected", referralReward(-5), { gross:0, fee:0, reward:0 });
eq("non-numeric rejected", referralReward("abc"), { gross:0, fee:0, reward:0 });
eq("null rejected", referralReward(null), { gross:0, fee:0, reward:0 });

console.log("\nthe referred user is never worse off");
const g=1, r=referralReward(g);
eq("referred user still keeps 98%", +(g - r.fee).toFixed(8), 0.98);
eq("referrer reward comes OUT of the fee, not the user", r.reward <= r.fee, true);
eq("Hashrial keeps the other half", +(r.fee - r.reward).toFixed(8), 0.01);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
