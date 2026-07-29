#!/usr/bin/env node
"use strict";
/* verify-braiins.js — check Braiins' REAL API response against what the
   pollers expect, before any of it is trusted with user balances.
 *
 * CLAUDE.md records what happens otherwise: Antpool's field names were taken
 * from docs rather than a live response, so `workers.htm` was read as
 * data.workers instead of data.rows, zero worker rows were ever written, and
 * every user's hashrate displayed 0 — for months, silently.
 *
 * Usage:
 *   BRAIINS_TOKEN=xxxx node scripts/verify-braiins.js
 *   BRAIINS_TOKEN=xxxx BRAIINS_ACCOUNT=hashrial node scripts/verify-braiins.js --json
 *
 * Generate the token at: Braiins Pool -> Settings -> Access Profiles ->
 * "Allow access to web APIs" -> Generate New token.
 *
 * Exits 0 if every field the pollers depend on is present, 1 otherwise.
 */

const TOKEN   = process.env.BRAIINS_TOKEN;
const ACCOUNT = process.env.BRAIINS_ACCOUNT || "hashrial";
const AS_JSON = process.argv.includes("--json");

if (!TOKEN) {
  console.error("BRAIINS_TOKEN is not set.\n" +
    "  BRAIINS_TOKEN=xxxx node scripts/verify-braiins.js");
  process.exit(1);
}

const BASE = "https://pool.braiins.com";
const ENDPOINTS = {
  profile: "/accounts/profile/json/btc/",
  workers: "/accounts/workers/json/btc",
  payouts: "/accounts/payouts/json/btc",
  stats:   "/stats/json/btc",
};

// Exactly what the pollers read. Keep in step with buildBraiinsAttribution()
// in api-worker/src/index.js and api/src/braiinsPoller.js.
const REQUIRED = {
  profile: ["current_balance", "all_time_reward", "today_reward"],
  worker:  ["shares_24h", "hash_rate_5m", "hash_rate_60m", "hash_rate_24h", "state", "last_share"],
};

function unwrap(j, key) {
  if (!j || typeof j !== "object") return null;
  const root = (j.btc && typeof j.btc === "object") ? j.btc : j;
  if (!key) return root;
  return root[key] ?? null;
}

async function get(path) {
  const res = await fetch(BASE + path, {
    headers: { "Pool-Auth-Token": TOKEN, "User-Agent": "hashrial-verify/1.0" },
  });
  const body = await res.text();
  let json = null;
  try { json = JSON.parse(body); } catch {}
  return { status: res.status, json, raw: body.slice(0, 400) };
}

(async () => {
  const out = {};
  let ok = true;
  const say = (...a) => { if (!AS_JSON) console.log(...a); };

  say(`Braiins API check — account "${ACCOUNT}"\n${"=".repeat(58)}`);

  for (const [name, path] of Object.entries(ENDPOINTS)) {
    const r = await get(path);
    out[name] = { status: r.status, ok: r.status === 200 };
    say(`\n${name.padEnd(8)} ${path}\n  HTTP ${r.status}`);
    if (r.status !== 200) {
      ok = false;
      say(`  FAILED. ${r.status === 401 || r.status === 403
        ? "Token rejected — check it has web API access enabled."
        : "Body: " + r.raw}`);
      continue;
    }
    if (!r.json) { ok = false; say("  Response was not JSON."); continue; }

    // Did the payload nest under the coin key, as documented?
    const nested = !!(r.json.btc && typeof r.json.btc === "object");
    out[name].nestedUnderBtc = nested;
    say(`  envelope: ${nested ? 'nested under "btc"' : "bare root"}`);

    if (name === "profile") {
      const p = unwrap(r.json);
      const missing = REQUIRED.profile.filter(f => p?.[f] === undefined);
      out[name].missing = missing;
      out[name].sample = p ? Object.fromEntries(REQUIRED.profile.map(f => [f, p[f]])) : null;
      if (missing.length) { ok = false; say(`  MISSING: ${missing.join(", ")}`); }
      else say("  all required fields present");
      say(`  keys: ${p ? Object.keys(p).join(", ").slice(0, 240) : "-"}`);
    }

    if (name === "workers") {
      const w = unwrap(r.json, "workers") || unwrap(r.json);
      const labels = w && typeof w === "object" ? Object.keys(w) : [];
      out[name].workerCount = labels.length;
      out[name].sampleLabels = labels.slice(0, 5);
      say(`  workers returned: ${labels.length}`);
      if (!labels.length) {
        say("  No workers — point at least one miner at the account, then re-run.");
      } else {
        const first = w[labels[0]];
        const missing = REQUIRED.worker.filter(f => first?.[f] === undefined);
        out[name].missing = missing;
        out[name].sampleWorker = first;
        say(`  sample label: ${labels[0]}`);
        if (missing.length) { ok = false; say(`  MISSING on worker: ${missing.join(", ")}`); }
        else say("  all required worker fields present");
        say(`  worker keys: ${first ? Object.keys(first).join(", ").slice(0, 240) : "-"}`);
        if (first && first.hash_rate_unit) say(`  hash_rate_unit: ${first.hash_rate_unit}`);

        // The whole aggregate model rests on labels round-tripping to a user.
        const parsed = labels.map(l => {
          let s = l.startsWith(ACCOUNT + ".") ? l.slice(ACCOUNT.length + 1) : l;
          if (s.startsWith("fee.") || s === "fee") return { label: l, fee: true };
          const i = s.indexOf("_");
          return (i > 0 && i < s.length - 1)
            ? { label: l, username: s.slice(0, i), worker: s.slice(i + 1) }
            : { label: l, unparseable: true };
        });
        const bad = parsed.filter(p => p.unparseable);
        out[name].unparseable = bad.map(b => b.label);
        say(`  parsed to a user: ${parsed.filter(p => p.username).length}` +
            `, fee-routed: ${parsed.filter(p => p.fee).length}` +
            `, UNPARSEABLE: ${bad.length}`);
        if (bad.length) {
          ok = false;
          say(`  These will be dropped from revenue splitting: ${bad.map(b => b.label).slice(0, 8).join(", ")}`);
          say("  Expected `" + ACCOUNT + ".{user}_{worker}` — check poolConfig.js sharded:false naming.");
        }
      }
    }
  }

  say(`\n${"=".repeat(58)}`);
  say(ok ? "PASS — the pollers' field expectations match the live response."
         : "FAIL — do not enable ACTIVE_POOL=braiins until the above is resolved.");
  if (AS_JSON) console.log(JSON.stringify(out, null, 2));
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error("verify failed:", e.message); process.exit(1); });
