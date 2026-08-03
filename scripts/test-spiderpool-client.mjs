/* SpiderPool client, against envelopes captured from the LIVE API.
 *
 *   node scripts/test-spiderpool-client.mjs
 *
 * Every fixture below is a verbatim response recorded on 2026-08-03 from
 * api.spiderpool.com with a real access key. They are here because the
 * published documentation disagreed with the live API in five places, and each
 * disagreement fails silently rather than loudly:
 *
 *   coin "BTC" -> HTTP 500          the poller would just write nothing
 *   code "SUCCESS" vs 200           a good response read as a failure
 *   SUBACCOUNT_EXIST                a duplicate read as a failure, so the user
 *                                   is never marked provisioned and the same
 *                                   creation is retried on every cron run
 *   dayEstimateProfit               undefined read as 0 earnings
 *   worker/list pagination          only the first 10 rigs ever attributed
 */
import { spiderpoolOk, isAlreadyExists } from "../api-worker/src/spiderpool.js";

let pass = 0, fail = 0;
const ok = (n, cond) => { if (cond) { pass++; console.log("  ok   " + n); } else { fail++; console.log("  FAIL " + n); } };

/* ── verbatim live captures ──────────────────────────────────────────── */
const CREATE_OK    = { code: "SUCCESS", msg: "Operation is successful", showErrorCode: null, data: null };
const CREATE_DUPE  = { code: "SUBACCOUNT_EXIST", msg: "Account has been in existence", showErrorCode: null, data: null };
const PROFIT_OK    = { code: "SUCCESS", msg: null, showErrorCode: null,
                       data: { unpaidProfit: 0, totalProfit: 0, yesterdayProfit: 0, dayEstimateProfit: 0 } };
const HASHRATE_OK  = { code: 200, msg: "Success", t: 1785773207657, success: true,
                       data: { subaccount: "hrrrr1m4anj61r", hashRate: "0", staleRate: "0", rejectRate: "0",
                               secondTimestamp: 1785773207, lastShareTime: 1785773207 } };
const WORKERS_OK   = { code: 200, msg: "Success", t: 1785773208299, success: true,
                       data: { total: 0, pageNum: 1, pageSize: 10, pages: 0, records: [] } };
const LIST_OK      = { code: 200, msg: "Success", t: 1785773206465, success: true,
                       data: [{ subaccount: "hrrrr1m4anj61r", coin: "btc", withdrawAddress: "" }] };
const ERR_COIN     = { code: "INVALID_PARAM", msg: "Unsupported coin", showErrorCode: null, data: null };
const ERR_NOSUB    = { code: "INVALID_PARAM", msg: "The subaccount does not exist", showErrorCode: null, data: null };
const ERR_PARAM    = { code: "INVALID_PARAM", msg: "Parameter error", showErrorCode: null, data: null };
const ERR_500      = { code: "500", msg: "Internal Server Error", showErrorCode: null, data: null };
const ERR_404      = { timestamp: "2026-08-03T16:05:47.424+00:00", status: 404, error: "Not Found", path: "/v2/subaccount/list" };

console.log("success detection — two different shapes, one of them a string");
ok('subaccount/* answers code:"SUCCESS"', spiderpoolOk(CREATE_OK));
ok("sp/* answers code:200 with success:true", spiderpoolOk(HASHRATE_OK));
ok("profit info counts as success", spiderpoolOk(PROFIT_OK));
ok("sub-account list counts as success", spiderpoolOk(LIST_OK));

console.log("\nfailures must NOT read as success");
ok('"Unsupported coin" is a failure', !spiderpoolOk(ERR_COIN));
ok('"The subaccount does not exist" is a failure', !spiderpoolOk(ERR_NOSUB));
ok('"Parameter error" is a failure', !spiderpoolOk(ERR_PARAM));
ok('code "500" (a STRING) is a failure', !spiderpoolOk(ERR_500));
ok("a Spring 404 envelope is a failure", !spiderpoolOk(ERR_404));
ok("null is a failure", !spiderpoolOk(null));
ok("a bare string is a failure", !spiderpoolOk("SUCCESS"));
// The string "200" appears as a code on error paths; only the number means success.
ok('code as the STRING "200" is not success', !spiderpoolOk({ code: "200" }));

console.log("\nduplicate detection — the retry path after a half-failed provisioning");
ok("SUBACCOUNT_EXIST is recognised", isAlreadyExists(CREATE_DUPE));
ok("a fresh creation is not a duplicate", !isAlreadyExists(CREATE_OK));
ok("an unrelated failure is not a duplicate", !isAlreadyExists(ERR_COIN));
ok("null is not a duplicate", !isAlreadyExists(null));
// The message is "Account has been in existence" — no "already", no "exists".
ok("detection does not depend on the message wording",
   isAlreadyExists({ code: "SUBACCOUNT_EXIST", msg: null }));
ok("a message that merely mentions existing is not enough",
   !isAlreadyExists({ code: "INVALID_PARAM", msg: "Account has been in existence" }));

console.log("\nprofit fields — the docs' todayProfit does not exist");
const p = PROFIT_OK.data;
ok("unpaidProfit present", p.unpaidProfit !== undefined);
ok("totalProfit present", p.totalProfit !== undefined);
ok("yesterdayProfit present", p.yesterdayProfit !== undefined);
ok("dayEstimateProfit present", p.dayEstimateProfit !== undefined);
ok("todayProfit is NOT a field (reading it would credit 0)", p.todayProfit === undefined);

console.log("\nhashrate fields — strings, and no unit is stated anywhere");
const h = HASHRATE_OK.data;
ok("hashRate arrives as a string", typeof h.hashRate === "string");
ok("lastShareTime present (needed for offline detection)", h.lastShareTime !== undefined);
ok("no unit field — the unit is an assumption, not data", h.hashRateUnit === undefined);

console.log("\nworker list is paginated — the default page holds 10");
const w = WORKERS_OK.data;
ok("rows live under .records, not .workers", Array.isArray(w.records));
ok("carries total", w.total !== undefined);
ok("carries pages", w.pages !== undefined);
ok("default pageSize is 10, so one read is not enough", w.pageSize === 10);

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
