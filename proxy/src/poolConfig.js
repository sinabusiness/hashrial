"use strict";
// poolConfig.js — selects which upstream pool this proxy forwards to.
//
// Set ACTIVE_POOL in .env to one of the preset names below, or to
// "custom" plus POOL_HOST/POOL_PORT to point anywhere else.
//
//   ACTIVE_POOL=braiins
//   ACTIVE_POOL=antpool
//   ACTIVE_POOL=custom  (then set POOL_HOST + POOL_PORT)
//
// If ACTIVE_POOL is unset, falls back to the legacy ANTPOOL_STRATUM /
// MAIN_SUBACCOUNT / FEE_SUBACCOUNT env vars so an existing deployment
// keeps working unchanged with no config edits required.
//
// ── The one thing that differs meaningfully between pools ──
// "sharded" controls how a miner's upstream username is built:
//
//   sharded: true   → {prefix}{poolIndex}.{username}.{worker}
//                     e.g. hashrial1.alice.rig01
//                     Use when you've created a real per-user sub-account
//                     on the pool for every Hashrial user (current Antpool
//                     setup). Each user shows up separately on the pool's
//                     own dashboard.
//
//   sharded: false  → {accountName}.{username}_{worker}
//                     e.g. hashrial.alice_rig01
//                     One aggregate pool account, with the real user and
//                     worker embedded in the worker label so it stays
//                     legible on the pool's dashboard. This is the model
//                     Braiins described: point aggregated hashrate at a
//                     single account and keep user accounts, fees, and
//                     payouts entirely on Hashrial's side. Hashrial's own
//                     DB (fee_shares, hashrate_history, the Redis share
//                     counters) remains the authoritative per-user record.

//   perUserSubaccount: true
//                     → {pool_subaccount}.{worker}
//                       e.g. hrrrr1m4anj61r.rig01
//                       One real pool sub-account per Hashrial user, created
//                       through the pool's API and stored on the user row. The
//                       POOL does the per-user accounting, so Hashrial never
//                       divides one balance by share counts — which is where
//                       the aggregate model's arithmetic goes wrong.
//                       The name is opaque: it is derived from the user's UUID,
//                       so the pool learns nothing about who is mining.
//
// ── How the 2% is taken ──
// feeViaShareTagging: true   every 50th share is relayed with params[0]
//                            rewritten to a fee label, so the POOL attributes
//                            it away from the user. Requires the pool to both
//                            read params[0] and accept a second authorized
//                            worker on the connection.
// feeViaShareTagging: false  the fee is arithmetic, applied to the per-user
//                            earnings the pool reports. Nothing is rewritten.
//                            Rewriting params[0] against a pool that validates
//                            it gets the share REJECTED, not reattributed.

const PRESETS = {
  // SpiderPool — per-user sub-accounts created via their API.
  // Sub-account names are 5-20 lowercase alphanumeric and can never be
  // deleted, which is why the name is derived and stored rather than built
  // from the username here.
  spiderpool: {
    name: "spiderpool",
    host: "btc-as.spiderpool.com",   // Asia; -eu/-us/-af also exist
    port: 2309,                      // alternates 3333, 1800, 443 (all plain TCP)
    sharded: false,
    perUserSubaccount: true,
    feeViaShareTagging: false,
    accountName:   process.env.SPIDERPOOL_ACCOUNT || "hashrial",
    feeSubaccount: null,
  },

  // Braiins Pool — single global endpoint, geo-routed automatically.
  // Their docs are explicit that the old region-specific URLs
  // (eu./us./sg. etc) are deprecated; use the one hostname.
  // Username format is accountName.workerName; password is unused.
  // Alternate ports if 3333 is blocked in a region: 443, 25.
  braiins: {
    name: "braiins",
    host: "stratum.braiins.com",
    port: 3333,
    sharded: false,
    accountName:   process.env.BRAIINS_ACCOUNT     || "hashrial",
    feeSubaccount: process.env.BRAIINS_FEE_ACCOUNT || "hashrial.fee",
  },

  // Antpool — existing setup, per-user sub-accounts already provisioned.
  antpool: {
    name: "antpool",
    host: "ss.antpool.com",
    port: 3333,
    sharded: true,
    accountName:   process.env.MAIN_SUBACCOUNT || "hashrial",
    feeSubaccount: process.env.FEE_SUBACCOUNT  || "hashrialfee",
  },
};

function loadPoolConfig() {
  const active = (process.env.ACTIVE_POOL || "").trim().toLowerCase();

  // Legacy fallback — no ACTIVE_POOL set, behave exactly as before.
  if (!active) {
    const stratum = process.env.ANTPOOL_STRATUM || "ss.antpool.com:3333";
    const [host, portStr] = stratum.split(":");
    return {
      name: "antpool (legacy config)",
      host,
      port: parseInt(portStr || "3333"),
      sharded: true,
      accountName:   process.env.MAIN_SUBACCOUNT || "hashrial",
      feeSubaccount: process.env.FEE_SUBACCOUNT  || "hashrialfee",
    };
  }

  if (active === "custom") {
    if (!process.env.POOL_HOST) {
      throw new Error('ACTIVE_POOL=custom requires POOL_HOST (and normally POOL_PORT) to be set');
    }
    return {
      name: process.env.POOL_NAME || "custom",
      host: process.env.POOL_HOST,
      port: parseInt(process.env.POOL_PORT || "3333"),
      sharded: process.env.POOL_SHARDED === "true",
      accountName:   process.env.POOL_ACCOUNT     || "hashrial",
      feeSubaccount: process.env.POOL_FEE_ACCOUNT || "hashrial.fee",
    };
  }

  const preset = PRESETS[active];
  if (!preset) {
    throw new Error(
      `Unknown ACTIVE_POOL "${active}". Valid: ${Object.keys(PRESETS).join(", ")}, custom`
    );
  }

  // Allow host/port override even on a preset, in case a pool changes
  // its endpoint or you need an alternate port for regional reachability.
  return {
    ...preset,
    host: process.env.POOL_HOST || preset.host,
    port: parseInt(process.env.POOL_PORT || preset.port),
  };
}

// Builds the username this proxy authorizes with upstream, for a miner.
function buildUpstreamUsername(pool, session) {
  if (pool.perUserSubaccount) {
    /* Refuse rather than guess. If the user's sub-account has not been
       provisioned yet there is no correct name to mine under, and inventing
       one — or falling back to the aggregate account — would credit their work
       to somebody else's balance. The caller turns this into a real error for
       the miner. */
    if (!session.poolSubaccount) return null;
    return `${session.poolSubaccount}.${session.workerName || "default"}`;
  }
  if (pool.sharded) {
    return `${pool.accountName}${session.poolIndex || 1}.${session.username}.${session.workerName}`;
  }
  return `${pool.accountName}.${sanitizeAggregateLabel(session.username, session.workerName)}`;
}


// Braiins documents the valid worker name as ^[-a-zA-Z0-9_@+:]+$ and — this is
// the dangerous part — a name that FAILS the regex is not rejected. The
// hashrate is silently accounted to an automatic worker called [auto].
//
// The previous sanitizer permitted "." (illegal at Braiins) and stripped
// "@ + :" (legal). Worker names come from the miner's own config and dots are
// everywhere in ASIC naming ("rig.01", "farm.a"), so any such miner would have
// had its hashrate pooled into [auto] — unattributable to a Hashrial user, and
// therefore unpaid, while Braiins still counted the work. No error anywhere.
const BRAIINS_WORKER_OK = /^[-a-zA-Z0-9_@+:]+$/;

function sanitizeAggregateLabel(username, workerName, maxLen = 60) {
  const label = `${username}_${workerName}`
    .replace(/[^-a-zA-Z0-9_@+:]/g, "_")   // exactly Braiins' allowed set
    .slice(0, maxLen);
  // Never emit a label the upstream will silently discard.
  return BRAIINS_WORKER_OK.test(label) ? label : "invalid";
}

// Marker for fee-routed shares in aggregate mode. A hyphen is deliberate:
// Hashrial usernames are validated as ^[a-z0-9_]{3,20}$, so a hyphen cannot
// appear in one and this prefix can never be mistaken for a real user when the
// label is parsed back out. It also keeps the worker name to a single segment —
// "hashrial.fee.alice_rig01" would put a dot INSIDE the worker name, which not
// every pool accepts.
const AGGREGATE_FEE_PREFIX = "fee-";

// Builds the username used for the 2% fee shares.
function buildFeeUsername(pool, session) {
  if (pool.sharded) {
    return `${pool.feeSubaccount}.${session.workerName || "default"}`;
  }
  const label = AGGREGATE_FEE_PREFIX + sanitizeAggregateLabel(session.username || "unknown", session.workerName || "default", 60 - AGGREGATE_FEE_PREFIX.length);
  // In aggregate mode all revenue lands in ONE pool account, so the fee is not
  // a separate payee — it is simply the slice Hashrial does not redistribute.
  // Tagging those shares keeps them out of the per-user split and leaves an
  // auditable trail in the pool's own worker list.
  return `${pool.accountName}.${label}`;
}

module.exports = { loadPoolConfig, buildUpstreamUsername, buildFeeUsername, PRESETS, AGGREGATE_FEE_PREFIX, sanitizeAggregateLabel, BRAIINS_WORKER_OK };
