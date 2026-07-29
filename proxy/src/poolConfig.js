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

const PRESETS = {
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
  if (pool.sharded) {
    return `${pool.accountName}${session.poolIndex || 1}.${session.username}.${session.workerName}`;
  }
  const label = `${session.username}_${session.workerName}`
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 64);
  return `${pool.accountName}.${label}`;
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
  const label = `${session.username || "unknown"}_${session.workerName || "default"}`
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 60);
  // In aggregate mode all revenue lands in ONE pool account, so the fee is not
  // a separate payee — it is simply the slice Hashrial does not redistribute.
  // Tagging those shares keeps them out of the per-user split and leaves an
  // auditable trail in the pool's own worker list.
  return `${pool.accountName}.${AGGREGATE_FEE_PREFIX}${label}`;
}

module.exports = { loadPoolConfig, buildUpstreamUsername, buildFeeUsername, PRESETS, AGGREGATE_FEE_PREFIX };
