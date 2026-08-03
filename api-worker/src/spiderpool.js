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
 * ⚠ Field names below come from SpiderPool's published docs, NOT from a real
 * response. Do not trust them until scripts/verify-spiderpool.js has been run
 * against a live account. Believing the docs over an actual response is exactly
 * what made the Antpool poller write zero worker rows for months.
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

/* SpiderPool wraps results in a status envelope. The exact success code is one
   of the things verify-spiderpool.js must confirm; treating an unrecognised
   envelope as success would mean writing zeros over real balances. */
export function spiderpoolOk(res) {
  if (!res || typeof res !== "object") return false;
  const code = res.code ?? res.status ?? res.errno;
  return code === 0 || code === 200 || code === "0" || res.success === true;
}

/* A sub-account that already exists is SUCCESS for our purposes — it is the
   convergence path after a provisioning call that reached SpiderPool but whose
   result we failed to record. Since the name is derived from the user id, the
   retry asks for the same name and we simply adopt it.

   The exact duplicate signal is unknown until seen against the live API, so
   this matches loosely and logs the raw envelope. Tighten it once known:
   matching too loosely could swallow a real failure and mark a user
   provisioned when they are not, and they would silently never mine. */
export function isAlreadyExists(res) {
  const blob = JSON.stringify(res || {}).toLowerCase();
  return /already\s*exist|duplicate|has\s*been\s*used|exists/.test(blob);
}

export async function createSubaccount(env, subaccount, { coin = "BTC", walletAddress } = {}) {
  const data = { coin, subaccount };
  // Deliberately omitted unless explicitly given. In this model payouts go to
  // Hashrial's own wallet, and putting a user's address here would hand the
  // pool an identifiable Iranian payout address per user.
  if (walletAddress) data.walletAddress = walletAddress;
  return spiderpoolCall(env, "/v2/subaccount/createSubaccount", data);
}

export const getSubaccountProfit = (env, subaccount, coin = "BTC") =>
  spiderpoolCall(env, "/v2/subaccount/getSubaccountProfitInfo", { coin, subaccount });

export const getSubaccountHashrate = (env, subaccount, coin = "BTC") =>
  spiderpoolCall(env, "/v2/sp/hashrate/subaccount/realHashRate", { coin, subaccount });

export const getWorkerList = (env, subaccount, coin = "BTC") =>
  spiderpoolCall(env, "/v2/sp/hashrate/worker/list", { coin, subaccount });

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
