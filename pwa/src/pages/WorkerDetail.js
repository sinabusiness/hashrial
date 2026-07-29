import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from "recharts";
import { api } from "../lib/api";
import { useLang } from "../i18n";

/* Single-worker telemetry. Styling comes from the design system in index.css —
   see the HASHRIAL DESIGN SYSTEM block.

   Three things this page used to get wrong:

   1. It hardcoded rgba(46,168,76,0.1) / rgba(232,64,64,0.1) for the status
      chip and #2ea84c / #d4a017 for the share bars. Those are the old dark
      palette and fail contrast in the light theme — the tokens don't.

   2. The 10m hashrate was one of five identical cards. It is the vital sign,
      so it gets the hero and the rest become supporting metrics.

   3. Both charts are wrapped in dir="ltr". The layout mirrors in Persian, the
      timeline must not: time reads left-to-right in every locale. */

function scale(val) {
  const n = parseFloat(val || 0);
  if (n >= 1e6) return { v: n / 1e6, u: "EH/s" };
  if (n >= 1e3) return { v: n / 1e3, u: "PH/s" };
  if (n >= 1)   return { v: n,       u: "TH/s" };
  return { v: n * 1000, u: "GH/s" };
}

/* Always 2 decimals — a fixed decimal count is what stops the number changing
   width on the 60s refresh. */
function fmt(val) {
  const n = parseFloat(val || 0);
  if (n === 0) return "—";
  const { v, u } = scale(n);
  return `${v.toFixed(2)} ${u}`;
}

const CT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 8, padding: "9px 13px" }}>
      <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 3 }}>{label}</div>
      <div className="num" style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>{fmt(payload[0]?.value)}</div>
    </div>
  );
};

const AXIS_TICK = { fill: "var(--text3)", fontSize: 10, fontFamily: "var(--mono)" };

export default function WorkerDetail() {
  const { t } = useLang();
  const { name } = useParams();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    return api.workerDetail(name).then(setData).catch(console.error);
  }, [name]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) return (
    <div className="page" style={{ maxWidth: 1100 }}>
      <div className="empty">{t("loading")}</div>
    </div>
  );

  if (!data?.worker) return (
    <div className="page" style={{ maxWidth: 1100 }}>
      <Link className="hr-link" to="/dashboard/workers"
            style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5,
                     color: "var(--text2)", textDecoration: "none", marginBottom: 16 }}>
        {t("backToWorkers")}
      </Link>
      <div className="panel">
        <div className="empty">{t("workerNotFound")}</div>
      </div>
    </div>
  );

  const { worker, snapshots } = data;
  const latest = snapshots?.length > 0 ? snapshots[snapshots.length - 1] : {};
  const chartData = snapshots.map(s => ({
    time: new Date(s.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    hs:       parseFloat(s.hs_10m || s.hs_1h || 0),
    accepted: parseInt(s.accepted || 0),
    stale:    parseInt(s.stale || 0),
  }));

  const up      = worker.status === "online";
  const health  = up ? "var(--green)" : "var(--red)";
  const hero    = scale(latest.hs_10m);
  const staleN  = parseInt(latest.stale || 0);

  return (
    <div className="page" style={{ maxWidth: 1100 }}>
      <Link className="hr-link" to="/dashboard/workers"
            style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5,
                     color: "var(--text2)", textDecoration: "none", marginBottom: 14 }}>
        {t("backToWorkers")}
      </Link>

      <div className="page-head">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 className="page-title num" style={{ fontSize: 20 }}>{name}</h1>
            <span className={`pill ${up ? "pill-ok" : "pill-bad"}`}>{t(worker.status)}</span>
          </div>
          <div className="page-sub">
            First seen <span className="num">{worker.first_seen ? new Date(worker.first_seen).toLocaleDateString() : "—"}</span>
            {" · "}
            {t("colLastSeen")} <span className="num">{worker.last_seen ? new Date(worker.last_seen).toLocaleString() : "—"}</span>
          </div>
        </div>
      </div>

      {/* ── Vital sign: this rig's 10m hashrate, everything else supporting ── */}
      <section className="panel-hero" style={{ padding: "22px 26px 18px", marginBottom: 16 }}>
        {/* Colour here is worker state and nothing else. */}
        <div style={{ position: "absolute", insetInlineStart: 0, top: 0, bottom: 0, width: 2,
                      background: `linear-gradient(180deg, ${health}, transparent)` }} />

        <div className="eyebrow">{t("hashrate10m")}</div>
        <div style={{ marginTop: 10 }}>
          <span className="num" style={{ fontSize: 50, fontWeight: 700, lineHeight: 0.95, color: "var(--accent)" }}>
            {hero.v.toFixed(2)}
            <span style={{ fontSize: 21, fontWeight: 500, color: "var(--text2)", marginInlineStart: 8 }}>{hero.u}</span>
          </span>
        </div>

        <div className="metric-row" style={{ marginTop: 20, paddingTop: 14,
                                             borderTop: "1px solid var(--border)", flexWrap: "wrap" }}>
          <div className="metric">
            <div className="metric-label">{"1h " + t("average")}</div>
            <div className="metric-value">{fmt(latest.hs_1h)}</div>
          </div>
          <div className="metric">
            <div className="metric-label">{"24h " + t("average")}</div>
            <div className="metric-value">{fmt(latest.hs_1d)}</div>
          </div>
          <div className="metric">
            <div className="metric-label">{t("accepted")}</div>
            <div className="metric-value" style={{ color: "var(--green)" }}>
              {parseInt(latest.accepted || 0).toLocaleString("en-US")}
            </div>
          </div>
          <div className="metric metric-last">
            <div className="metric-label">{t("stale")}</div>
            <div className="metric-value" style={{ color: staleN > 0 ? "var(--amber)" : "var(--text2)" }}>
              {staleN.toLocaleString("en-US")}
            </div>
          </div>
        </div>
      </section>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-head">
          <h2 className="panel-title">{t("hashrateChart")}</h2>
          <span className="eyebrow">{t("live")}</span>
        </div>
        {chartData.length === 0 ? (
          <div className="empty">{t("noDataWorker")}</div>
        ) : (
          /* dir="ltr": mirror the page, never the timeline. */
          <div className="panel-pad" dir="ltr">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f7931a" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f7931a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={v => fmt(v)} tick={AXIS_TICK} tickLine={false} axisLine={false} width={72} />
                <Tooltip content={<CT />} cursor={{ stroke: "var(--border2)", strokeWidth: 1 }} />
                <Area type="monotone" dataKey="hs" stroke="var(--accent)" strokeWidth={1.75} fill="url(#wg)" dot={false}
                      activeDot={{ r: 3, fill: "var(--accent)" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {chartData.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <h2 className="panel-title">{t("shares")}</h2>
            <span className="eyebrow num">24h</span>
          </div>
          <div className="panel-pad" dir="ltr">
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--bg3)", border: "1px solid var(--border2)",
                                         borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="accepted" fill="var(--green)" radius={[2, 2, 0, 0]} name={t("accepted")} />
                <Bar dataKey="stale"    fill="var(--amber)" radius={[2, 2, 0, 0]} name={t("stale")} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
