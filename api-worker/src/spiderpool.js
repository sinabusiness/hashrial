/* SpiderPool API client and sub-account provisioning.
 *
 * The model this supports: one SpiderPool main account owned by Hashrial, one
 * sub-account per Hashrial user underneath it. SpiderPool does the per-user
 * accounting; Hashrial reads it, takes 2%, and pays users from its own wallet.
 * SpiderPool never sees a user's payout address.
 *
 * The 2% is arithmetic here, not a share-tagging trick upstream. There is no
 * rewriting of params[0] in this model and no dependence on whether a pool
 * honours the worker name in a submit.
 *
 * Everything below is mapped from LIVE responses captured on 2026-08-03, not
 * from the documentation. The documentation was wrong in five separate places
 * and each one would have failed silently:
 *
 *   coin must be "btc"        "BTC" returns HTTP 500 / "Unsupported coin"
 *   success is inconsistent   subaccount/* answer code:"SUCCESS" (a string),
 *                             sp/* answer code:200 (a number) + success:true
 *   duplicate is a code       SUBACCOUNT_EXIST / "Account has been in
 *                             existence" — no form of the word "already"
 *   dayEstimateProfit         there is no todayProfit
 *   worker/list paginates     {total,pageNum,pageSize:10,pages,records} — a
 *                             naive read sees only the first 10 workers
 *
 * Captured envelopes live in scripts/test-spiderpool-client.mjs as fixtures.
 */
import { spiderpoolSignedBody } from "./spiderpoolSign.js";

const BASE = "https://api.spiderpool.com";

/* Every endpoint is POST, and the whole body is the signed envelope. */
export async function spiderpoolCall(env, path, data = {}, { timestamp } = {}) {
  const accessKey = env.SPIDERPOOL_ACCESS_KEY;
  const modulus = env.SPIDERPOOL_KEY_MODULUS;
  const d = env.SPIDERPOOL_KEY_D;
  if (!accessKey || !modulus || !d) {
    console.error("[spiderpool] SPIDERPOOL_ACCESS_KEY / _KEY_MODULUS / _KEY_D not all set — refusing to call");
    return null;
  }

  const body = spiderpoolSignedBody(data, accessKey, modulus, d, timestamp ?? Date.now());
  let r;
  try {
    r = await fetch(BASE + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error(`[spiderpool] ${path} threw: ${e.message}`);
    return null;
  }
  if (!r.ok) {
    console.error(`[spiderpool] ${path} HTTP ${r.status}`);
    return null;
  }
  try { return await r.json(); } catch (e) {
    console.error(`[spiderpool] ${path} returned non-JSON: ${e.message}`);
    return null;
  }
}

/* Two different success shapes, depending on which half of the API answered:
     /v2/subaccount/*     {"code":"SUCCESS","msg":"Operation is successful"}
     /v2/sp/*             {"code":200,"msg":"Success","success":true,...}
   Note code is a NUMBER on the sp/* success path and a STRING everywhere else,
   including on every error ("INVALID_PARAM", "500"). Compare accordingly —
   `code == 200` would also match the string "200" from some other path, and
   treating an unrecognised envelope as success writes zeros over real
   balances. */
export function spiderpoolOk(res) {
  if (!res || typeof res !== "object") return false;
  return res.code === "SUCCESS" || res.code === 200 || res.success === true;
}

/* A sub-account that already exists is SUCCESS for our purposes — it is the
   convergence path after a provisioning call that reached SpiderPool but whose
   result we failed to record. Since the name is derived from the user id, the
   retry asks for the same name and we simply adopt it.

   Confirmed live: {"code":"SUBACCOUNT_EXIST","msg":"Account has been in
   existence"}. Worth noting the message contains no form of the word
   "already" — a loose text match would miss it, mark the user unprovisioned
   forever, and retry the same creation on every cron run. */
export function isAlreadyExists(res) {
  return res?.code === "SUBACCOUNT_EXIST";
}

export async function createSubaccount(env, subaccount, { coin = "btc", walletAddress } = {}) {
  const data = { coin, subaccount };
  // Deliberately omitted unless explicitly given. In this model payouts go to
  // Hashrial's own wallet, and putting a user's address here would hand the
  // pool an identifiable Iranian payout address per user.
  if (walletAddress) data.walletAddress = walletAddress;
  return spiderpoolCall(env, "/v2/subaccount/createSubaccount", data);
}

/* Live shape: data {unpaidProfit, totalProfit, yesterdayProfit, dayEstimateProfit}.
   Numbers, in BTC. There is no todayProfit despite what the docs list. */
export const getSubaccountProfit = (env, subaccount, coin = "btc") =>
  spiderpoolCall(env, "/v2/subaccount/getSubaccountProfitInfo", { coin, subaccount });

/* Live shape: data {subaccount, hashRate, staleRate, rejectRate,
   secondTimestamp, lastShareTime}. The rates arrive as STRINGS and there is no
   unit field on this endpoint at all — see HASHRATE_UNIT below. */
export const getSubaccountHashrate = (env, subaccount, coin = "btc") =>
  spiderpoolCall(env, "/v2/sp/hashrate/subaccount/realHashRate", { coin, subaccount });

export const listSubaccounts = (env, coin = "btc") =>
  spiderpoolCall(env, "/v2/sp/subaccount/list", { coin });

/* Every worker, not just the first page.
   worker/list is paginated and defaults to pageSize 10 — reading data.records
   once would silently attribute nothing to everyone past the tenth rig, which
   is the same failure the Antpool poller had for months. Pages until it has
   `total`, with a hard stop so a bad `pages` value cannot spin forever. */
export async function getAllWorkers(env, subaccount, coin = "btc", pageSize = 100) {
  const out = [];
  let pageNum = 1, pages = 1, total = null;
  while (pageNum <= pages && pageNum <= 200) {
    const res = await spiderpoolCall(env, "/v2/sp/hashrate/worker/list", { coin, subaccount, pageNum, pageSize });
    if (!spiderpoolOk(res)) {
      console.error(`[spiderpool] worker/list page ${pageNum} for ${subaccount}: ${JSON.stringify(res)}`);
      return null; // partial pages would understate a user's rigs
    }
    const d = res.data || {};
    if (total === null) { total = Number(d.total || 0); pages = Number(d.pages || 1); }
    out.push(...(d.records || []));
    if (!d.records?.length) break;
    pageNum++;
  }
  if (total !== null && out.length !== total) {
    console.error(`[spiderpool] ${subaccount}: read ${out.length} workers but total says ${total}`);
  }
  return out;
}

/* SpiderPool states no unit on the hashrate endpoints. Until a rig is actually
   mining and the number can be compared against a known machine, this is an
   assumption — and a wrong one is a 1000x error in what a user appears to have
   contributed, which is exactly how the Antpool poller mispriced payouts.
   Deliberately a named constant rather than an inline guess. */
export const HASHRATE_UNIT_ASSUMED = "H/s";
export const HASHRATE_TO_TH = 1e-12;

/* ── Provisioning ─────────────────────────────────────────────────────
   Idempotent in both directions, which is the entire design constraint:
   a SpiderPool sub-account can never be deleted, so a half-completed run
   must be safe to repeat rather than leaving orphans behind.

   Ordering is deliberate. The name is written to the DB BEFORE the pool is
   called, so a crash between the two leaves a reserved name with
   provisioned_at NULL — the retry asks for the same name and converges. The
   reverse order (call, then record) would risk a created-but-unknown
   sub-account if the write failed. */
export async function ensureSubaccount(env, adminDb, user, nameFor) {
  // Registration calls this unconditionally. Until SpiderPool is the active
  // pool there is nothing to provision, and reserving names against a pool
  // Hashrial may never use would write identifiers that can never be reissued.
  if ((env.ACTIVE_POOL || "").trim().toLowerCase() !== "spiderpool") return null;

  if (user.pool_subaccount && user.pool_subaccount_provisioned_at) {
    return { subaccount: user.pool_subaccount, created: false };
  }

  const name = user.pool_subaccount || await nameFor(user.id);

  if (!user.pool_subaccount) {
    const { error } = await adminDb.from("users").update({ pool_subaccount: name }).eq("id", user.id);
    if (error) {
      console.error(`[spiderpool] could not reserve ${name} for ${user.id}: ${error.message}`);
      return null;
    }
  }

  const res = await createSubaccount(env, name);
  if (!spiderpoolOk(res) && !isAlreadyExists(res)) {
    console.error(`[spiderpool] createSubaccount(${name}) failed: ${JSON.stringify(res)}`);
    return null;
  }

  const { error } = await adminDb.from("users")
    .update({ pool_subaccount_provisioned_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) {
    // The sub-account exists at the pool; we just failed to note it. The next
    // run re-derives the same name and takes the already-exists path.
    console.error(`[spiderpool] ${name} created but not recorded: ${error.message}`);
    return null;
  }
  return { subaccount: name, created: true };
}

/* Backfills everyone who has no confirmed sub-account yet. Runs on the cron.
   Bounded per invocation: sub-account creation is a write against a
   rate-limited third-party API, and a burst of them is how an IP ban starts. */
export async function provisionPendingSubaccounts(env, adminDb, nameFor, limit = 10) {
  if ((env.ACTIVE_POOL || "").trim().toLowerCase() !== "spiderpool") return;

  const { data: users, error } = await adminDb.from("users")
    .select("id, pool_subaccount, pool_subaccount_provisioned_at")
    .is("pool_subaccount_provisioned_at", null)
    .limit(limit);
  if (error) { console.error("[spiderpool] pending lookup failed:", error.message); return; }
  if (!users?.length) return;

  let done = 0;
  for (const u of users) {
    const r = await ensureSubaccount(env, adminDb, u, nameFor);
    if (r) done++;
  }
  console.log(`[spiderpool] provisioned ${done}/${users.length} pending sub-account(s)`);
  if (users.length === limit) console.log(`[spiderpool] hit the per-run cap of ${limit}; the rest follow next run`);
}
