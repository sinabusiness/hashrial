import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { Area, Line, ComposedChart, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../lib/api";
import { useLang } from "../i18n";
import { PriceRail, useDenomination, makeMoneyFormatter } from "../components/PriceWidget";

/* ─────────────────────────────────────────────────────────────
   Design direction: telemetry, not analytics.

   A miner's real question is "is my hardware earning right now, and
   is anything broken?" — so hashrate is a vital sign with its own
   panel rather than one of six identical stat cards.

   Three things here came out of surveying Antpool, ViaBTC, F2Pool,
   Braiins, Luxor and Foundry:

   1. No serious pool shows an instantaneous hashrate — they all show
      a windowed average. But most never say which window, which is
      why "why does the pool show less than my miner?" is the #1
      support question at every one of them. The window is labelled
      here, next to the number.

   2. Worker health is never usefully binary. The state that matters
      and that binary UIs lose is degraded-but-alive — the rig running
      at 40% because two hashboards died. It never turns red anywhere.
      Comparing each rig to ITS OWN 1h average gives a correct trip
      point for a 13 TH/s S9 and a 200 TH/s S21 with no configuration.

   3. The default fleet view should be the exceptions, not the
      inventory. Nobody wants to count 40 blocks to find one dead rig.
   ───────────────────────────────────────────────────────────── */

// A rig below this fraction of its own 1h average is degraded. Compares each
// rig to itself, so it needs no per-model configuration and no new data.
const DEGRADED_RATIO = 0.6;

// Module scope so it is not a hook dependency.
const STATE_RANK = { offline: 0, degraded: 1, online: 2 };

function fmt(val) {
  const n = parseFloat(val || 0);
  if (n === 0) return "0.00";
  if (n >= 1e6) return (n / 1e6).toFixed(2);
  if (n >= 1e3) return (n / 1e3).toFixed(2);
  if (n >= 1)   return n.toFixed(2);
  return (n * 1000).toFixed(2);
}
function unit(val) {
  const n = parseFloat(val || 0);
  if (n >= 1e6) return "EH/s";
  if (n >= 1e3) return "PH/s";
  if (n >= 1)   return "TH/s";
  return "GH/s";
}
function fmtFull(val) { return fmt(val) + " " + unit(val); }

const NUM = { fontFamily: "var(--mono)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" };
const EYEBROW = { fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text3)" };

/* Logical properties throughout — physical ones (marginRight, borderRight)
   land on the wrong side in Persian. */
function Metric({ label, value, color, last, title }) {
  return (
    <div title={title} style={{
      paddingInlineEnd: last ? 0 : 30, marginInlineEnd: last ? 0 : 30,
      borderInlineEnd: last ? "none" : "1px solid var(--border)",
    }}>
      <div style={{ ...EYEBROW, marginBottom: 5 }}>{label}</div>
      <div className="num" style={{ ...NUM, fontSize: 16, fontWeight: 600, color: color || "var(--text)" }}>{value}</div>
    </div>
  );
}

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const hs = payload.find(p => p.dataKey === "hs");
  const st = payload.find(p => p.dataKey === "stalePct");
  return (
    <div style={{ background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 8, padding: "9px 13px" }}>
      <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 3 }}>{label}</div>
      <div className="num" style={{ ...NUM, fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>{fmtFull(hs?.value)}</div>
      {st && st.value > 0 && (
        <div className="num" style={{ ...NUM, fontSize: 11, color: "var(--red)", marginTop: 2 }}>
          {st.value.toFixed(1)}% stale
        </div>
      )}
    </div>
  );
};

export default function Dashboard() {
  const { t, lang } = useLang();
  const [overview, setOverview] = useState(null);
  const [chart, setChart]       = useState([]);
  const [workers, setWorkers]   = useState([]);
  const [priceData, setPriceData] = useState(null);
  const [priceStale, setPriceStale] = useState(false);
  const [period, setPeriod]     = useState("1h");
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [focusWorker, setFocusWorker] = useState(null);

  const { denom, setDenom, localCurrency } = useDenomination();

  const loadOverview = useCallback(() => {
    return Promise.all([api.overview(), api.workers()])
      .then(([ov, ws]) => { setOverview(ov); setWorkers(ws || []); setError(null); setUpdatedAt(Date.now()); })
      .catch(e => setError(e.message));
  }, []);

  const loadChart = useCallback((p) => {
    return api.hashrate(p)
      .then(rows => setChart((rows || []).map(r => {
        const a = parseFloat(r.accepted || 0), s = parseFloat(r.stale || 0);
        return {
          time: new Date(r.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          // hs_10m is the real sample. Falling back to hs_1h would draw an
          // outage as a flat line at the pre-outage rate instead of a drop.
          hs: parseFloat(r.hs_10m || 0),
          stalePct: (a + s) > 0 ? (s / (a + s)) * 100 : 0,
        };
      })))
      .catch(() => {});
  }, []);

  const loadPrice = useCallback(() => api.btcPrice()
    .then(d => { setPriceData(d); setPriceStale(false); })
    .catch(() => {}), []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadOverview(), loadPrice()]).finally(() => setLoading(false));
    const t1 = setInterval(loadOverview, 60000);
    const t3 = setInterval(loadPrice, 30000);
    return () => { clearInterval(t1); clearInterval(t3); };
  }, [loadOverview, loadPrice]);

  useEffect(() => {
    loadChart(period);
    const t2 = setInterval(() => loadChart(period), 60000);
    return () => clearInterval(t2);
  }, [loadChart, period]);

  const earn = overview?.earnings || {};
  const hr   = overview?.hashrate  || {};

  const money = useMemo(() => makeMoneyFormatter(denom, priceData, lang), [denom, priceData, lang]);

  /* Three states, all derived from fields that already exist. */
  const rigs = useMemo(() => (workers || []).map(w => {
    const h10 = parseFloat(w.hs_10m || 0);
    const h1h = parseFloat(w.hs_1h || 0);
    const offline = w.status !== "online";
    const degraded = !offline && h1h > 0 && h10 < DEGRADED_RATIO * h1h;
    // Height in the strip = this rig against its own 1h average, floored so a
    // dead rig is still a visible stub rather than nothing.
    const ratio = h1h > 0 ? Math.max(0.25, Math.min(1, h10 / h1h)) : (offline ? 0.25 : 1);
    return { ...w, h10, h1h, offline, degraded, ratio,
             state: offline ? "offline" : degraded ? "degraded" : "online" };
  }), [workers]);

  const offlineRigs  = rigs.filter(r => r.offline);
  const degradedRigs = rigs.filter(r => r.degraded);
  const attention    = [...offlineRigs, ...degradedRigs];
  const onlineCount  = rigs.length - offlineRigs.length;

  // Worst first — problems cluster at the start of both the strip and the table.
  const sortedRigs = useMemo(
    () => [...rigs].sort((a, b) => STATE_RANK[a.state] - STATE_RANK[b.state] || a.ratio - b.ratio),
    [rigs]
  );

  const acceptedN = parseInt(hr.accepted || 0);
  const staleN    = parseInt(hr.stale || 0);
  const acceptPct = (acceptedN + staleN) > 0 ? (acceptedN / (acceptedN + staleN)) * 100 : null;

  const health = rigs.length === 0 ? "var(--text3)"
    : offlineRigs.length > 0 ? "var(--red)"
    : degradedRigs.length > 0 ? "var(--amber)"
    : "var(--green)";

  const secondsAgo = updatedAt ? Math.max(0, Math.round((Date.now() - updatedAt) / 1000)) : null;

  /* The bridge number: what a terahash earned in the last day, in whatever
     denomination the user picked. Luxor's hashprice and F2Pool's $/T, in the
     currency someone actually pays their electricity bill in. */
  const perThDay = useMemo(() => {
    const th = parseFloat(hr.hs_1d || 0);
    const e24 = parseFloat(earn.earn24h || 0);
    if (!(th > 0) || !(e24 > 0)) return null;
    return money(e24 / th);
  }, [hr.hs_1d, earn.earn24h, money]);

  const showStale = chart.some(c => c.stalePct > 0.5);
  const visibleRigs = focusWorker ? sortedRigs.filter(r => r.worker_name === focusWorker) : sortedRigs;

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--text2)" }}>{t("loading2")}</div>;

  const bal = money(earn.balance);

  return (
    <div style={{ padding: "26px 30px", maxWidth: 1360 }}>
      <style>{`
        @keyframes hr-pulse {
          0%   { box-shadow: 0 0 0 0 currentColor; opacity: 1; }
          70%  { box-shadow: 0 0 0 7px transparent; opacity: .85; }
          100% { box-shadow: 0 0 0 0 transparent; opacity: 1; }
        }
        .hr-live-dot { animation: hr-pulse 2.4s infinite; }
        @media (prefers-reduced-motion: reduce) { .hr-live-dot { animation: none; } }
        .hr-range:focus-visible, .hr-link:focus-visible, .hr-rig:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
        .hr-row:hover { background: var(--bg-card); }
        .hr-rig { border: 0; padding: 0; cursor: pointer; background: transparent; }
        @media (max-width: 900px) {
          .hr-split { grid-template-columns: 1fr !important; }
          .hr-telebody { flex-direction: column !important; align-items: stretch !important; gap: 20px !important; }
          .hr-readout-v { font-size: 46px !important; }
          .hr-foot { flex-wrap: wrap; gap: 16px 0; }
          .hr-hide-sm { display: none !important; }
        }
      `}</style>

      {error && (
        <div style={{ color: "var(--red)", fontSize: 12.5, background: "var(--red-weak)", border: "1px solid var(--border2)", padding: "10px 14px", borderRadius: "var(--r)", marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* ── Vital sign ───────────────────────────────────────── */}
      <section style={{ position: "relative", overflow: "hidden", border: "1px solid var(--border)", borderRadius: "var(--r3)", background: "linear-gradient(180deg, var(--bg3), var(--bg2))", padding: "26px 30px 22px", marginBottom: 16 }}>
        <div style={{ position: "absolute", insetInlineStart: 0, top: 0, bottom: 0, width: 2, background: "linear-gradient(180deg, " + health + ", transparent)" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, ...EYEBROW, color: health }}>
              <span className="hr-live-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
              {rigs.length === 0 ? t("noWorkers") : t("hashing")}
            </div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 7 }}>
              {secondsAgo !== null && (t("updated") + " " + secondsAgo + "s " + t("ago"))}
              {rigs.length > 0 && (" · " + rigs.length + " " + t("sidebarWorkers").toLowerCase())}
            </div>
          </div>

          <div style={{ display: "flex", gap: 2, background: "var(--bg-card)", padding: 3, borderRadius: 8 }}>
            {["1h", "1d", "7d"].map(p => (
              <button key={p} className="hr-range num" onClick={() => setPeriod(p)} aria-pressed={period === p} style={{
                ...NUM, fontSize: 11, fontWeight: 500, padding: "5px 12px", border: 0, borderRadius: 6, cursor: "pointer",
                background: period === p ? "rgba(247,147,26,0.14)" : "transparent",
                color: period === p ? "var(--accent)" : "var(--text2)",
              }}>{p}</button>
            ))}
          </div>
        </div>

        <div className="hr-telebody" style={{ display: "flex", alignItems: "flex-end", gap: 34 }}>
          <div style={{ flex: "0 0 auto" }}>
            <div className="display display-hero" style={{ color: "var(--text-bright)" }}>
              {fmt(hr.hs_10m)}
              <span className="display-unit" style={{ fontSize: 21 }}>{unit(hr.hs_10m)}</span>
            </div>
            {/* The highest-leverage microcopy on the page: every pool surveyed
                gets asked "why is this lower than my miner?" and none answer
                it in the UI. */}
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>{t("tenMinAverage")}</div>

            {acceptPct !== null && (
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 12 }}>
                <div style={{ width: 78, height: 3, borderRadius: 2, background: "var(--bg-card)", overflow: "hidden" }}>
                  <div style={{ width: acceptPct + "%", height: "100%", background: "var(--green)", borderRadius: 2 }} />
                </div>
                <span className="num" style={{ ...NUM, fontSize: 12, color: "var(--green)", fontWeight: 600 }}>{acceptPct.toFixed(1)}%</span>
                <span style={{ fontSize: 11, color: "var(--text3)" }}>{t("accepted")}</span>
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 240, height: 118 }}>
            {chart.length === 0 ? (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)", fontSize: 12.5 }}>
                {t("noHashrateData")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={118}>
                <ComposedChart data={chart} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#f7931a" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#f7931a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <YAxis yAxisId="hs" hide domain={[0, "auto"]} />
                  <YAxis yAxisId="st" hide orientation="right" domain={[0, "auto"]} />
                  <Tooltip content={<ChartTip />} cursor={{ stroke: "var(--border2)", strokeWidth: 1 }} />
                  <Area yAxisId="hs" type="monotone" dataKey="hs" stroke="#f7931a" strokeWidth={1.75} fill="url(#hrGrad)" dot={false} activeDot={{ r: 3, fill: "#f7931a" }} />
                  {/* A dip WITH a stale spike is a network fault; a dip without
                      one is a dead rig. One glance, two diagnoses. */}
                  {showStale && (
                    <Line yAxisId="st" type="monotone" dataKey="stalePct" stroke="var(--red)" strokeWidth={1} strokeDasharray="3 2" dot={false} opacity={0.65} />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="hr-foot" style={{ display: "flex", marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 14, alignItems: "flex-start" }}>
          <Metric label={"1h " + t("average")}  value={fmtFull(hr.hs_1h)} />
          <Metric label={"24h " + t("average")} value={fmtFull(hr.hs_1d)} />
          <Metric label={t("sharesAccepted")} value={acceptedN.toLocaleString("en-US")} />
          <Metric label={t("stale")} value={staleN.toLocaleString("en-US")} color="var(--text2)" last={!perThDay} />
          {perThDay && (
            <Metric label={t("perThDay")} value={perThDay.unit + " " + perThDay.text} color="var(--text-bright)" last />
          )}
        </div>

        <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          <PriceRail data={priceData} stale={priceStale} denom={denom} setDenom={setDenom} localCurrency={localCurrency} />
        </div>
      </section>

      <div className="hr-split" style={{ display: "grid", gridTemplateColumns: "1fr 1.45fr", gap: 16, marginBottom: 16 }}>

        {/* ── Fleet: exceptions first, inventory second ───────── */}
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r3)", background: "var(--bg2)", padding: "20px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600 }}>{t("workerStatus")}</h2>
            <span style={EYEBROW}>{t("live")}</span>
          </div>

          {rigs.length === 0 ? (
            <div style={{ padding: "18px 0 6px", color: "var(--text2)", fontSize: 13, lineHeight: 1.6 }}>
              {t("noWorkers")}{" "}
              <Link className="hr-link" to="/dashboard/connect" style={{ color: "var(--accent)", fontWeight: 500 }}>{t("connectFirst")}</Link>
            </div>
          ) : (
            <>
              {/* A sentence, not a fraction — the user should never do arithmetic. */}
              <div className="headline" style={{ color: attention.length ? (offlineRigs.length ? "var(--red)" : "var(--amber)") : "var(--green)" }}>
                {attention.length === 0
                  ? t("allRigsHealthy").replace("{n}", rigs.length)
                  : t("attentionCount").replace("{n}", attention.length)}
              </div>
              <div className="num" style={{ ...NUM, fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
                <span style={{ color: "var(--green)" }}>{onlineCount}</span> / {rigs.length}
              </div>

              {/* The attention list — only what's wrong, capped at three. */}
              {attention.length > 0 && (
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                  {attention.slice(0, 3).map(r => (
                    <div key={r.worker_name} className={`attn ${r.offline ? "attn-bad" : "attn-warn"}`}>
                      <span className="num nowrap" style={{ fontWeight: 600, color: "var(--text)" }}>{r.worker_name}</span>
                      <span style={{ color: r.offline ? "var(--red)" : "var(--amber)" }}>
                        {r.offline ? t("offline") : t("degraded")}
                      </span>
                      {r.degraded && r.h1h > 0 && (
                        <span className="num" style={{ ...NUM, color: "var(--text3)", marginInlineStart: "auto" }}>
                          {Math.round((r.h10 / r.h1h) * 100)}%
                        </span>
                      )}
                    </div>
                  ))}
                  {attention.length > 3 && (
                    <Link className="hr-link" to="/dashboard/workers" style={{ fontSize: 11.5, color: "var(--accent)", textDecoration: "none" }}>
                      + {attention.length - 3} {t("viewAll").toLowerCase()}
                    </Link>
                  )}
                </div>
              )}

              {/* The skyline: colour = state, height = this rig against its own
                  1h average. A half-height amber block is findable without
                  colour vision and without counting. */}
              <div className="rigs" style={{ marginTop: 18 }}>
                {sortedRigs.map(r => (
                  <button
                    key={r.worker_name}
                    className="rig hr-rig"
                    onClick={() => setFocusWorker(focusWorker === r.worker_name ? null : r.worker_name)}
                    aria-label={r.worker_name + " — " + t(r.state)}
                    title={r.worker_name + " — " + t(r.state) + (r.h1h > 0 ? " · " + Math.round((r.h10 / r.h1h) * 100) + "%" : "")}
                    style={{
                      outline: focusWorker === r.worker_name ? "2px solid var(--accent)" : "none",
                      outlineOffset: 1,
                    }}
                  >
                    <span style={{
                      height: Math.max(5, Math.round(r.ratio * 34)),
                      background: r.offline ? "var(--red)" : r.degraded ? "var(--amber)" : "var(--green)",
                    }} />
                  </button>
                ))}
              </div>

              <div style={{ fontSize: 10.5, color: "var(--text3)", marginTop: 10, lineHeight: 1.5 }}>
                {t("degradedHint")}
              </div>
            </>
          )}
        </div>

        {/* ── Earnings ─────────────────────────────────────────── */}
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r3)", background: "var(--bg2)", padding: "20px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600 }}>{t("balance")}</h2>
            <Link className="hr-link" to="/dashboard/earnings" style={{ fontSize: 12, color: "var(--accent)", fontWeight: 500 }}>{t("requestPayout")}</Link>
          </div>

          {/* Money is --text-bright, not --accent. Orange means hashrate and
              only hashrate; when it also means money, links and active tabs it
              has no meaning left. */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <span className="display display-md" style={{ color: "var(--text-bright)" }}>
              {bal.text}<span className="display-unit" style={{ fontSize: 16 }}>{bal.unit}</span>
            </span>
          </div>

          <div style={{ marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 14, display: "flex" }}>
            <Metric label={t("last24h")}     value={money(earn.earn24h).unit + " " + money(earn.earn24h).text}   color="var(--green)" />
            <Metric label={t("totalEarned")} value={money(earn.earnTotal).unit + " " + money(earn.earnTotal).text} last />
          </div>

          <div style={{ fontSize: 10.5, color: "var(--text3)", marginTop: 14, lineHeight: 1.5 }}>
            {t("poolFeeNote")}
          </div>
        </div>
      </div>

      {/* ── Worker table, worst-first ──────────────────────────── */}
      {rigs.length > 0 && (
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r3)", background: "var(--bg2)", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 22px", borderBottom: "1px solid var(--border)", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ fontSize: 13, fontWeight: 600 }}>
              {t("sidebarWorkers")}
              {focusWorker && (
                <button onClick={() => setFocusWorker(null)} className="hr-link" style={{
                  marginInlineStart: 10, fontSize: 11, fontWeight: 500, color: "var(--accent)",
                  background: "transparent", border: 0, cursor: "pointer",
                }}>{focusWorker} ✕</button>
              )}
            </h2>
            <Link className="hr-link" to="/dashboard/workers" style={{ fontSize: 12, color: "var(--accent)", fontWeight: 500 }}>{t("viewAll")}</Link>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {[t("sidebarWorkers"), t("status"), t("hashrate10m"), "1h " + t("average"), t("accepted"), t("stale")].map((h, i) => (
                    <th key={i} style={{ ...EYEBROW, textAlign: "start", padding: "9px 22px", background: "var(--bg-card)" }}
                        className={i >= 3 ? "hr-hide-sm" : undefined}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRigs.slice(0, 8).map(r => {
                  const a = parseInt(r.accepted || 0), s = parseInt(r.stale || 0);
                  const pct = (a + s) > 0 ? ((a / (a + s)) * 100).toFixed(1) : null;
                  const col = r.offline ? "var(--red)" : r.degraded ? "var(--amber)" : "var(--green)";
                  return (
                    <tr key={r.worker_name} className="hr-row" style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={{ padding: "13px 22px" }}>
                        <Link className="hr-link num" to={"/dashboard/workers/" + r.worker_name} style={{ ...NUM, fontSize: 13, fontWeight: 500, color: "var(--text)", textDecoration: "none" }}>{r.worker_name}</Link>
                      </td>
                      <td style={{ padding: "13px 22px" }}>
                        {/* Colour plus a word — never state by colour alone. */}
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 500, color: col }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />
                          {r.offline ? t("offline") : r.degraded ? t("degraded") : t("online")}
                        </span>
                      </td>
                      <td className="num" style={{ ...NUM, padding: "13px 22px", fontSize: 13 }}>{fmtFull(r.hs_10m)}</td>
                      <td className="num hr-hide-sm" style={{ ...NUM, padding: "13px 22px", fontSize: 13, color: "var(--text2)" }}>{fmtFull(r.hs_1h)}</td>
                      <td className="num hr-hide-sm" style={{ ...NUM, padding: "13px 22px", fontSize: 13, color: pct !== null ? "var(--green)" : "var(--text3)" }}>{pct !== null ? pct + "%" : "—"}</td>
                      <td className="num hr-hide-sm" style={{ ...NUM, padding: "13px 22px", fontSize: 13, color: "var(--text3)" }}>{s.toLocaleString("en-US")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
