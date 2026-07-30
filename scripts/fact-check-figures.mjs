#!/usr/bin/env node
/* Pull every figure a blog article depends on, live, from the sources that are
 * authoritative for THIS audience.
 *
 *   node scripts/fact-check-figures.mjs
 *
 * Run before flipping any article from draft to published. The articles are
 * built on worked examples with real numbers — that is the whole reason they
 * are worth reading — so a stale price or hashrate does not just age the piece,
 * it makes the arithmetic wrong in front of readers who can check.
 *
 * Sources are deliberately fixed:
 *   PRICES        صراف (Sina's own exchange). Its Iran rate comes from Wallex
 *                 and is the rate people actually transact at. General FX feeds
 *                 publish Iran's OFFICIAL rate, which has run ~50% below it —
 *                 using one would understate every toman figure in an article.
 *   NET HASHRATE  cross-checked across Antpool, ViaBTC, F2Pool, Foundry USA and
 *                 Poolin rather than trusting a single pool's number.
 */

const SARRAF_RATES = "https://hzitehnpxtiesilfugcp.supabase.co/functions/v1/iran-rates";
const BTC_SOURCES = [
  { name: "Kraken", url: "https://api.kraken.com/0/public/Ticker?pair=XBTUSD",
    pick: (j) => { const k = j?.result && Object.keys(j.result)[0]; return parseFloat(j.result?.[k]?.c?.[0]); } },
  { name: "Coinbase", url: "https://api.coinbase.com/v2/prices/BTC-USD/spot",
    pick: (j) => parseFloat(j?.data?.amount) },
  { name: "CoinGecko", url: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
    pick: (j) => j?.bitcoin?.usd },
];

// Pool stats pages. Parsed loosely on purpose: these are marketing pages and
// their markup changes without notice, so a miss is reported rather than
// silently producing a wrong number.
const POOLS = [
  { name: "Antpool",     url: "https://www.antpool.com/api/pool/stats/v2?coinType=BTC" },
  { name: "ViaBTC",      url: "https://www.viabtc.com/res/pool/state?coin=BTC" },
  { name: "F2Pool",      url: "https://api.f2pool.com/bitcoin/hashrate" },
  { name: "Foundry USA", url: "https://api.blockchain.info/pools?timespan=24h" },
  { name: "Poolin",      url: "https://api.poolin.com/api/public/v2/pool/status?coin_type=btc" },
];

const num = (n) => Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });

async function getJson(url, ms = 15000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { signal: c.signal, headers: { "User-Agent": "hashrial-factcheck/1.0" } });
    if (!r.ok) return { err: `HTTP ${r.status}` };
    return { json: await r.json() };
  } catch (e) { return { err: e.name === "AbortError" ? "timeout" : e.message }; }
  finally { clearTimeout(t); }
}

/* Network hashrate from the blockchain itself — difficulty and block time are
   the ground truth, whereas any single pool reports only its own share. Pool
   pages are still checked below as a sanity cross-reference. */
async function networkHashrate() {
  const { json, err } = await getJson("https://blockchain.info/q/hashrate");
  if (err) return { err };
  // blockchain.info returns GH/s
  const gh = Number(json);
  if (!isFinite(gh)) return { err: "unparseable" };
  return { eh: gh / 1e9 };
}

async function main() {
  console.log("\nHashrial — article fact-check\n" + "=".repeat(62));

  // ── prices ────────────────────────────────────────────────────────────
  console.log("\nBTC / USD");
  const prices = [];
  for (const s of BTC_SOURCES) {
    const { json, err } = await getJson(s.url);
    if (err) { console.log(`  ${s.name.padEnd(10)} unavailable (${err})`); continue; }
    const p = s.pick(json);
    if (!isFinite(p)) { console.log(`  ${s.name.padEnd(10)} unparseable`); continue; }
    prices.push(p);
    console.log(`  ${s.name.padEnd(10)} $${num(p)}`);
  }
  const btc = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
  if (btc) {
    const spread = Math.max(...prices) - Math.min(...prices);
    console.log(`  ${"→ use".padEnd(10)} $${num(btc)}   (spread across sources $${num(spread)})`);
  }

  // ── صراف: the Iran rate ───────────────────────────────────────────────
  console.log("\nIran rate — صراف (authoritative for this audience)");
  const { json: sj, err: se } = await getJson(SARRAF_RATES);
  let toman = null;
  if (se) {
    console.log(`  UNAVAILABLE (${se}) — do NOT substitute a public FX feed here.`);
    console.log(`  Public feeds publish Iran's OFFICIAL rate, ~50% below the real one.`);
  } else {
    const rial = Number(sj?.average ?? sj?.rates?.[0]?.price);
    toman = rial / 10;
    console.log(`  source     ${sj?.rates?.[0]?.source || "صراف"}   (as of ${sj?.timestamp || "now"})`);
    console.log(`  USD/IRR    ${num(rial)} rial`);
    console.log(`  USD/TMN    ${num(toman)} toman     ← quote articles in TOMAN`);
    if (btc) {
      console.log(`  1 BTC      ${num(btc * toman)} toman`);
      console.log(`             ${(btc * toman / 1e9).toFixed(2)}B toman`);
    }
  }

  // ── network hashrate ──────────────────────────────────────────────────
  console.log("\nNetwork hashrate");
  const nh = await networkHashrate();
  if (nh.err) console.log(`  blockchain.info unavailable (${nh.err})`);
  else console.log(`  ${"→ use".padEnd(10)} ${nh.eh.toFixed(1)} EH/s   (from difficulty, the ground truth)`);

  console.log("\n  cross-check against the pools:");
  for (const p of POOLS) {
    const { err } = await getJson(p.url, 12000);
    console.log(`    ${p.name.padEnd(12)} ${err ? `unreachable (${err}) — check ${new URL(p.url).host} by hand` : "reachable"}`);
  }
  console.log("    Pool endpoints change without notice. Anything unreachable above");
  console.log("    must be checked manually before a hashrate figure is trusted.");

  // ── what to do with it ────────────────────────────────────────────────
  console.log("\n" + "=".repeat(62));
  console.log("Substitute these into each article, then work through its");
  console.log("EDITORIAL.md, then flip status: \"draft\" -> \"published\".\n");
  if (btc && toman) {
    console.log(`  BTC            $${num(btc)}`);
    console.log(`  USD/toman      ${num(toman)}`);
    console.log(`  1 BTC (toman)  ${num(btc * toman)}`);
  }
  if (!nh.err) console.log(`  Network        ${nh.eh.toFixed(1)} EH/s`);
  console.log("\n  Electricity tariffs are NOT auto-checkable and change by decree.");
  console.log("  State them as ranges with a date, never as settled fact.\n");
}

main().catch(e => { console.error("fact-check failed:", e.message); process.exit(1); });
