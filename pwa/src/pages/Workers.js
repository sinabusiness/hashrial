import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useLang } from "../i18n";

/* Worker list. Styling comes from the design system in index.css — see the
   HASHRIAL DESIGN SYSTEM block. Status colour comes from the --*-weak tokens
   rather than hardcoded rgba(), which failed contrast in the light theme. */

function fmt(val) {
  const n = parseFloat(val || 0);
  if (n === 0) return "—";
  if (n >= 1e6) return `${(n/1e6).toFixed(2)} EH/s`;
  if (n >= 1e3) return `${(n/1e3).toFixed(2)} PH/s`;
  if (n >= 1)   return `${n.toFixed(2)} TH/s`;
  return `${(n*1000).toFixed(2)} GH/s`;
}

export default function Workers() {
  const [workers, setWorkers] = useState([]);
  const [filter, setFilter]   = useState("all");
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const { t } = useLang();

  const load = useCallback(() => {
    return api.workers()
      .then(ws => { setWorkers(Array.isArray(ws) ? ws : []); setLastRefresh(new Date()); })
      .catch(e => { console.error(e); setWorkers([]); });
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, [load]);

  const filtered = filter === "all" ? workers : workers.filter(w => w.status === filter);
  const online   = workers.filter(w => w.status === "online").length;
  const offline  = workers.length - online;

  const COLS = ["colWorker","colStatus","col10m","col1h","col24h","colAccepted","colStale","colLastSeen"];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">{t("workersTitle")}</h1>
          <div className="page-sub">{t("workersSub")}</div>
        </div>
        {lastRefresh && (
          <div className="meta">
            {t("updated")} <span className="num">{lastRefresh.toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      {/* Counts double as the filter — the count IS the control, so there is no
          separate row of buttons competing with it for attention. */}
      <div className="seg" style={{ marginBottom: 16 }}>
        {[
          { key: "all",     label: t("total"),   count: workers.length, color: "var(--text)" },
          { key: "online",  label: t("online"),  count: online,         color: "var(--green)" },
          { key: "offline", label: t("offline"), count: offline,        color: offline > 0 ? "var(--red)" : "var(--text3)" },
        ].map(s => (
          <button
            key={s.key}
            className="seg-item"
            aria-pressed={filter === s.key}
            onClick={() => setFilter(s.key)}
            style={{ display: "inline-flex", alignItems: "baseline", gap: 6, padding: "7px 14px" }}
          >
            <span className="num" style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.count}</span>
            <span style={{ fontSize: 11.5 }}>{s.label}</span>
          </button>
        ))}
      </div>

      <div className="panel">
        {loading ? (
          <div className="empty">{t("loadingWorkers")}</div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            {filter === "all" ? (
              <>
                <div style={{ fontSize: 28, marginBottom: 8 }}>⛏</div>
                <div>
                  {t("noWorkers")}{" "}
                  <Link className="hr-link" to="/dashboard/connect" style={{ color: "var(--accent)", fontWeight: 500 }}>
                    {t("connectFirst")}
                  </Link>
                </div>
              </>
            ) : t("noWorkers")}
          </div>
        ) : (
          <div className="tbl-scroll">
            <table className="tbl">
              <thead>
                <tr>{COLS.map(c => <th key={c}>{t(c)}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map(w => {
                  const up = w.status === "online";
                  const stale = parseInt(w.stale || 0);
                  return (
                    <tr key={w.worker_name}>
                      <td>
                        <Link
                          className="hr-link num"
                          to={`/dashboard/workers/${encodeURIComponent(w.worker_name)}`}
                          style={{ color: "var(--text)", fontWeight: 500, textDecoration: "none" }}
                        >
                          {w.worker_name}
                        </Link>
                      </td>
                      <td>
                        <span className={`pill ${up ? "pill-ok" : "pill-bad"}`}>{t(w.status)}</span>
                      </td>
                      <td className="num">{fmt(w.hs_10m)}</td>
                      <td className="num" style={{ color: "var(--text2)" }}>{fmt(w.hs_1h)}</td>
                      <td className="num" style={{ color: "var(--text2)" }}>{fmt(w.hs_1d)}</td>
                      <td className="num" style={{ color: "var(--green)" }}>
                        {parseInt(w.accepted || 0).toLocaleString("en-US")}
                      </td>
                      <td className="num" style={{ color: stale > 0 ? "var(--amber)" : "var(--text3)" }}>
                        {stale.toLocaleString("en-US")}
                      </td>
                      <td className="num" style={{ color: "var(--text2)" }}>
                        {w.last_seen ? new Date(w.last_seen).toLocaleTimeString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
