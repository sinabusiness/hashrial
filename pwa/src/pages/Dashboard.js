import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { AreaChart, Area, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../lib/api";
import { useLang } from "../i18n";

/* ─────────────────────────────────────────────────────────────
   Design direction: telemetry, not analytics.

   A miner's real question is "is my hardware earning right now, and
   is anything broken?" — so hashrate gets treated as a vital sign with
   its own panel rather than as one of six identical stat cards. Every
   figure uses tabular-nums so digits don't jitter on the 60s refresh,
   and the panel's left edge reports fleet health as a colour.
   ───────────────────────────────────────────────────────────── */

function fmt(val) {
  const n = parseFloat(val || 0);
  if (n === 0) return "0";
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
function fmtBTC(val)  { return parseFloat(val || 0).toFixed(8); }

const NUM = { fontFamily: "var(--mono)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" };
const EYEBROW = { fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text3)" };

function Metric({ label, value, color, last }) {
  return (
    <div style={{
      paddingRight: last ? 0 : 30, marginRight: last ? 0 : 30,
      borderRight: last ? "none" : "1px solid var(--border)",
    }}>
      <div style={{ ...EYEBROW, marginBottom: 5 }}>{label}</div>
      <div style={{ ...NUM, fontSize: 16, fontWeight: 600, color: color || "var(--text)" }}>{value}</div>
    </div>
  );
}

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 8, padding: "9px 13px" }}>
      <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 3 }}>{label}</div>
      <div style={{ ...NUM, fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>{fmtFull(payload[0]?.value)}</div>
    </div>
  );
};

export default function Dashboard() {
  const { t } = useLang();
  const [overview, setOverview] = useState(null);
  const [chart, setChart]       = useState([]);
  const [workers, setWorkers]   = useState([]);
  const [btcPrice, setBtcPrice] = useState(null);
  const [period, setPeriod]     = useState("1h");
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const loadOverview = useCallback(() => {
    return Promise.all([api.overview(), api.workers()])
      .then(([ov, ws]) => { setOverview(ov); setWorkers(ws); setError(null); setUpdatedAt(Date.now()); })
      .catch(e => setError(e.message));
  }, []);

  const loadChart = useCallback((p) => {
    return api.hashrate(p)
      .then(rows => setChart(rows.map(r => ({
        time: new Date(r.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        hs: parseFloat(r.hs_10m || r.hs_1h || 0),
      }))))
      .catch(() => {});
  }, []);

  const loadBtcPrice = useCallback(() => api.btcPrice().then(setBtcPrice).catch(() => {}), []);

  // Range changes must not re-enter the loading state — that blanks the whole
  // panel. Only the chart depends on `period`, so it owns that dependency.
  useEffect(() => {
    setLoading(true);
    Promise.all([loadOverview(), loadBtcPrice()]).finally(() => setLoading(false));
    const t1 = setInterval(loadOverview, 60000);
    const t3 = setInterval(loadBtcPrice, 30000);
    return () => { clearInterval(t1); clearInterval(t3); };
  }, [loadOverview, loadBtcPrice]);

  useEffect(() => {
    loadChart(period);
    const t2 = setInterval(() => loadChart(period), 60000);
    return () => clearInterval(t2);
  }, [loadChart, period]);

  const earn    = overview?.earnings || {};
  const hr      = overview?.hashrate  || {};
  const online  = workers.filter(w => w.status === "online").length;
  const offline = workers.filter(w => w.status !== "online").length;
  const allHealthy = workers.length > 0 && offline === 0;

  const acceptedN = parseInt(hr.accepted || 0);
  const staleN    = parseInt(hr.stale || 0);
  const acceptPct = (acceptedN + staleN) > 0 ? (acceptedN / (acceptedN + staleN)) * 100 : null;

  const usd = (btc) => btcPrice?.price
    ? "≈ $" + (parseFloat(btc || 0) * btcPrice.price).toLocaleString("en-US", { maximumFractionDigits: 2 })
    : "";

  const health = workers.length === 0 ? "var(--text3)" : allHealthy ? "var(--green)" : "var(--red)";
  const secondsAgo = updatedAt ? Math.max(0, Math.round((Date.now() - updatedAt) / 1000)) : null;

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--text2)" }}>{t("loading2")}</div>;

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
        .hr-range:focus-visible, .hr-link:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
        .hr-row:hover { background: rgba(255,255,255,0.018); }
        @media (max-width: 900px) {
          .hr-split { grid-template-columns: 1fr !important; }
          .hr-telebody { flex-direction: column !important; align-items: stretch !important; gap: 20px !important; }
          .hr-readout-v { font-size: 46px !important; }
          .hr-foot { flex-wrap: wrap; gap: 16px 0; }
        }
      `}</style>

      {error && (
        <div style={{ color: "var(--red)", fontSize: 12.5, background: "rgba(248,81,73,0.08)", border: "1px solid rgba(248,81,73,0.2)", padding: "10px 14px", borderRadius: "var(--r)", marginBottom: 16 }}>
          {error}
        </div>
      )}

      <section style={{ position: "relative", overflow: "hidden", border: "1px solid var(--border)", borderRadius: "var(--r3)", background: "linear-gradient(180deg, var(--bg3), var(--bg2))", padding: "26px 30px 22px", marginBottom: 16 }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: "linear-gradient(180deg, " + health + ", transparent)" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, ...EYEBROW, color: health }}>
              <span className="hr-live-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
              {workers.length === 0 ? t("noWorkers") : (t("hashing") || "Hashing")}
            </div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 7 }}>
              {secondsAgo !== null && ((t("updated") || "Updated") + " " + secondsAgo + "s " + (t("ago") || "ago"))}
              {workers.length > 0 && (" · " + workers.length + " " + t("sidebarWorkers").toLowerCase())}
              {btcPrice?.price && (
                <> · BTC <span style={NUM}>${btcPrice.price.toLocaleString()}</span>{" "}
                  <span style={{ color: (btcPrice.change || 0) >= 0 ? "var(--green)" : "var(--red)" }}>
                    {(btcPrice.change || 0) >= 0 ? "▲" : "▼"} {Math.abs(btcPrice.change || 0).toFixed(2)}%
                  </span>
                </>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.04)", padding: 3, borderRadius: 8 }}>
            {["1h", "1d", "7d"].map(p => (
              <button key={p} className="hr-range" onClick={() => { setPeriod(p); loadChart(p); }} style={{
                ...NUM, fontSize: 11, fontWeight: 500, padding: "5px 12px", border: 0, borderRadius: 6, cursor: "pointer",
                background: period === p ? "rgba(247,147,26,0.14)" : "transparent",
                color: period === p ? "var(--accent)" : "var(--text2)",
              }}>{p}</button>
            ))}
          </div>
        </div>

        <div className="hr-telebody" style={{ display: "flex", alignItems: "flex-end", gap: 34 }}>
          <div style={{ flex: "0 0 auto" }}>
            <div className="hr-readout-v" style={{ ...NUM, fontSize: 66, fontWeight: 700, lineHeight: 0.92 }}>
              {fmt(hr.hs_10m)}
              <span style={{ fontSize: 26, fontWeight: 500, color: "var(--text2)", marginLeft: 8 }}>{unit(hr.hs_10m)}</span>
            </div>
            {acceptPct !== null && (
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 12 }}>
                <div style={{ width: 78, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <div style={{ width: acceptPct + "%", height: "100%", background: "var(--green)", borderRadius: 2 }} />
                </div>
                <span style={{ ...NUM, fontSize: 12, color: "var(--green)", fontWeight: 600 }}>{acceptPct.toFixed(1)}%</span>
                <span style={{ fontSize: 11, color: "var(--text3)" }}>{t("accepted") || "accepted"}</span>
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0, height: 92 }}>
            {chart.length === 0 ? (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)", fontSize: 12.5 }}>
                {t("noHashrateData")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={92}>
                <AreaChart data={chart} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#f7931a" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#f7931a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip content={<ChartTip />} cursor={{ stroke: "var(--border2)", strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="hs" stroke="#f7931a" strokeWidth={1.75} fill="url(#hrGrad)" dot={false} activeDot={{ r: 3, fill: "#f7931a" }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="hr-foot" style={{ display: "flex", marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          <Metric label={"1h " + (t("average") || "average")}  value={fmtFull(hr.hs_1h)} />
          <Metric label={"24h " + (t("average") || "average")} value={fmtFull(hr.hs_1d)} />
          <Metric label={t("sharesAccepted") || "Shares accepted"} value={acceptedN.toLocaleString()} />
          <Metric label={t("stale") || "Stale"} value={staleN.toLocaleString()} color="var(--text2)" last />
        </div>
      </section>

      <div className="hr-split" style={{ display: "grid", gridTemplateColumns: "1fr 1.45fr", gap: 16, marginBottom: 16 }}>
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r3)", background: "var(--bg2)", padding: "20px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600 }}>{t("workerStatus") || t("sidebarWorkers")}</h2>
            <span style={EYEBROW}>{t("live") || "Live"}</span>
          </div>

          {workers.length === 0 ? (
            <div style={{ padding: "18px 0 6px", color: "var(--text2)", fontSize: 13, lineHeight: 1.6 }}>
              {t("noWorkers")}{" "}
              <Link className="hr-link" to="/dashboard/connect" style={{ color: "var(--accent)", fontWeight: 500 }}>{t("connectFirst")}</Link>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ ...NUM, fontSize: 34, fontWeight: 700, color: online > 0 ? "var(--green)" : "var(--red)" }}>{online}</span>
                <span style={{ fontSize: 15, color: "var(--text2)", fontWeight: 500 }}>{t("online")} · {offline} {t("offline")}</span>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, margin: "16px 0 0" }}>
                {workers.map(w => (
                  <span key={w.worker_name} title={w.worker_name + " — " + t(w.status)} style={{
                    width: 19, height: 30, borderRadius: 4, opacity: 0.9,
                    background: w.status === "online" ? "var(--green)" : "var(--red)",
                  }} />
                ))}
              </div>

              <div style={{ marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 14, display: "flex" }}>
                <Metric label={t("faults") || "Faults"} value={offline === 0 ? (t("none") || "None") : offline + " " + t("offline")} color={offline === 0 ? "var(--green)" : "var(--red)"} />
                <Metric label={t("activeWorkers")} value={online + " / " + workers.length} last />
              </div>
            </>
          )}
        </div>

        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r3)", background: "var(--bg2)", padding: "20px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600 }}>{t("balance")}</h2>
            <Link className="hr-link" to="/dashboard/earnings" style={{ fontSize: 12, color: "var(--accent)", fontWeight: 500 }}>{t("requestPayout") || t("viewAll")}</Link>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <span style={{ ...NUM, fontSize: 30, fontWeight: 700, color: "var(--accent)" }}>
              {fmtBTC(earn.balance)}<span style={{ fontSize: 16, fontWeight: 500, marginLeft: 6 }}>BTC</span>
            </span>
            {usd(earn.balance) && <span style={{ ...NUM, fontSize: 14, color: "var(--text2)" }}>{usd(earn.balance)}</span>}
          </div>

          <div style={{ marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 14, display: "flex" }}>
            <Metric label={t("last24h")}     value={fmtBTC(earn.earn24h) + " BTC"}   color="var(--green)" />
            <Metric label={t("totalEarned")} value={fmtBTC(earn.earnTotal) + " BTC"} last />
          </div>
        </div>
      </div>

      {workers.length > 0 && (
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r3)", background: "var(--bg2)", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 22px", borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 13, fontWeight: 600 }}>{t("sidebarWorkers")}</h2>
            <Link className="hr-link" to="/dashboard/workers" style={{ fontSize: 12, color: "var(--accent)", fontWeight: 500 }}>{t("viewAll")}</Link>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {[t("sidebarWorkers"), t("status") || "Status", t("hashrate10m"), "1h " + (t("average") || "avg"), t("accepted") || "Accepted", t("stale") || "Stale"].map((h, i) => (
                    <th key={i} style={{ ...EYEBROW, textAlign: "left", padding: "9px 22px", background: "rgba(255,255,255,0.015)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workers.slice(0, 8).map(w => {
                  const a = parseInt(w.accepted || 0), s = parseInt(w.stale || 0);
                  const pct = (a + s) > 0 ? ((a / (a + s)) * 100).toFixed(1) : null;
                  const up = w.status === "online";
                  return (
                    <tr key={w.worker_name} className="hr-row" style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={{ padding: "13px 22px" }}>
                        <Link className="hr-link" to={"/dashboard/workers/" + w.worker_name} style={{ ...NUM, fontSize: 13, fontWeight: 500, color: "var(--text)", textDecoration: "none" }}>{w.worker_name}</Link>
                      </td>
                      <td style={{ padding: "13px 22px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 500, color: up ? "var(--green)" : "var(--red)" }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />
                          {t(w.status)}
                        </span>
                      </td>
                      <td style={{ ...NUM, padding: "13px 22px", fontSize: 13 }}>{fmtFull(w.hs_10m)}</td>
                      <td style={{ ...NUM, padding: "13px 22px", fontSize: 13, color: "var(--text2)" }}>{fmtFull(w.hs_1h)}</td>
                      <td style={{ ...NUM, padding: "13px 22px", fontSize: 13, color: pct ? "var(--green)" : "var(--text3)" }}>{pct ? pct + "%" : "—"}</td>
                      <td style={{ ...NUM, padding: "13px 22px", fontSize: 13, color: "var(--text3)" }}>{s.toLocaleString()}</td>
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
