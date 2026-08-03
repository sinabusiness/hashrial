/* Checks SpiderPool's LIVE responses against every field the poller reads.
 *
 *   SPIDERPOOL_ACCESS_KEY=… SPIDERPOOL_KEY_MODULUS=… SPIDERPOOL_KEY_D=… \
 *   node scripts/verify-spiderpool.js <existing-subaccount>
 *
 * Run this before any real balance depends on the integration. The field names
 * in api-worker/src/spiderpool.js come from SpiderPool's documentation, and
 * documentation is precisely what made the Antpool poller write zero worker
 * rows for months: account.htm was read for hashrate fields it has never had,
 * and nothing anywhere said so.
 *
 * READ-ONLY BY DESIGN. It never calls createSubaccount, because a SpiderPool
 * sub-account cannot be deleted — a verification run must not leave permanent
 * litter on the account. Pass the name of one that already exists.
 */
import { spiderpoolSignedBody } from "../api-worker/src/spiderpoolSign.js";

const BASE = "https://api.spiderpool.com";
const SUB = process.argv[2];
const { SPIDERPOOL_ACCESS_KEY: KEY, SPIDERPOOL_KEY_MODULUS: N, SPIDERPOOL_KEY_D: D } = process.env;

if (!KEY || !N || !D) {
  console.error("Set SPIDERPOOL_ACCESS_KEY, SPIDERPOOL_KEY_MODULUS and SPIDERPOOL_KEY_D.");
  console.error("Generate the keypair with: node scripts/spiderpool-keygen.mjs");
  process.exit(1);
}
if (!SUB) {
  console.error("Pass an EXISTING sub-account name: node scripts/verify-spiderpool.js hrxxxxxxxxxxxx");
  console.error("(this script never creates one — SpiderPool sub-accounts cannot be deleted)");
  process.exit(1);
}

let problems = 0;
const call = async (path, data) => {
  const body = spiderpoolSignedBody(data, KEY, N, D, Date.now());
  const r = await fetch(BASE + path, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: r.status, json, text };
};

const show = (label, v) => console.log(`    ${label.padEnd(26)} ${v === undefined ? "\x1b[31mMISSING\x1b[0m" : JSON.stringify(v)}`);

function expect(obj, fields, where) {
  for (const f of fields) {
    const v = obj?.[f];
    show(f, v);
    if (v === undefined) { problems++; console.log(`      ^ ${where} does not carry "${f}" — the poller reads it`); }
  }
}

console.log(`\nSpiderPool live verification — sub-account "${SUB}"\n`);

// 1. Does the signature authenticate at all?
console.log("1. authentication");
const profit = await call("/v2/subaccount/getSubaccountProfitInfo", { coin: "BTC", subaccount: SUB });
console.log(`    HTTP ${profit.status}`);
if (!profit.json) {
  console.log(`    \x1b[31mnon-JSON response\x1b[0m: ${profit.text.slice(0, 300)}`);
  problems++;
} else {
  // The success envelope is the thing spiderpoolOk() has to recognise. Print it
  // verbatim so it can be tightened from evidence rather than guessed at.
  console.log(`    envelope keys: ${JSON.stringify(Object.keys(profit.json))}`);
  console.log(`    raw: ${JSON.stringify(profit.json).slice(0, 400)}`);
}

// 2. Earnings — this is what a user is paid on.
console.log("\n2. earnings fields (getSubaccountProfitInfo)");
const pdata = profit.json?.data ?? profit.json?.result ?? profit.json;
expect(pdata, ["totalProfit", "unpaidProfit", "yesterdayProfit", "todayProfit"], "profit info");
console.log("    ^ names above are from the docs; whichever exist are the real ones.");
console.log("      Update readSubaccountEarnings() in api-worker/src/spiderpool.js to match.");

// 3. Hashrate.
console.log("\n3. hashrate fields (realHashRate)");
const hr = await call("/v2/sp/hashrate/subaccount/realHashRate", { coin: "BTC", subaccount: SUB });
const hdata = hr.json?.data ?? hr.json?.result ?? hr.json;
expect(hdata, ["hashRate", "hashRateUnit", "onlineWorkerCount", "offlineWorkerCount"], "hashrate");
console.log("    ^ the UNIT matters: mixing Gh/s with Th/s is a 1000x error in what a user is owed.");

// 4. Workers.
console.log("\n4. worker rows (worker/list)");
const wl = await call("/v2/sp/hashrate/worker/list", { coin: "BTC", subaccount: SUB });
const wdata = wl.json?.data ?? wl.json?.result ?? wl.json;
const rows = Array.isArray(wdata) ? wdata : (wdata?.rows ?? wdata?.list ?? wdata?.records);
if (!Array.isArray(rows)) {
  console.log(`    \x1b[31mcould not find the row array\x1b[0m — shape: ${JSON.stringify(wdata).slice(0, 300)}`);
  problems++;
} else {
  console.log(`    ${rows.length} row(s)`);
  if (rows.length === 0) {
    console.log("    (no workers mining — re-run with a live rig to confirm the row fields)");
  } else {
    expect(rows[0], ["workerName", "hashRate", "status"], "worker row");
  }
}

// 5. Pagination — a forwarding pool can have thousands of workers.
console.log("\n5. pagination");
console.log(`    keys on the worker payload: ${JSON.stringify(Object.keys(wdata || {})).slice(0, 200)}`);
console.log("    ^ if there is no total/page field, ask SpiderPool what happens past N workers.");
console.log("      A silent cap means everyone past it is attributed nothing and paid nothing.");

console.log(`\n${problems === 0
  ? "\x1b[32mEvery field the poller reads was present.\x1b[0m"
  : `\x1b[31m${problems} problem(s).\x1b[0m Fix the field names before real balances depend on this.`}\n`);
process.exit(problems === 0 ? 0 : 1);
