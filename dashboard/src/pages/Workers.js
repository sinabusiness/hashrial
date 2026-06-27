import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useLang } from "../i18n";

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

  const pill = (status) => (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:4, borderRadius:20, padding:"2px 9px",
      fontSize:10.5, fontWeight:600,
      background: status==="online" ? "rgba(46,168,76,0.1)" : "rgba(232,64,64,0.1)",
      color: status==="online" ? "var(--green)" : "var(--red)",
      border: `1px solid ${status==="online" ? "rgba(46,168,76,0.2)" : "rgba(232,64,64,0.2)"}`,
    }}>
      <span style={{ width:5, height:5, borderRadius:"50%", background:"currentColor", display:"inline-block" }} />
      {t(status)}
    </span>
  );

  return (
    <div style={{ padding:"24px 28px", maxWidth:1400 }}>
      <div style={{ marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>{t("workersTitle")}</h1>
          <div style={{ color:"var(--text2)", fontSize:13 }}>{t("workersSub")}</div>
        </div>
        {lastRefresh && <div style={{ fontSize:11, color:"var(--text3)" }}>Updated {lastRefresh.toLocaleTimeString()}</div>}
      </div>

      <div style={{ display:"flex", gap:12, marginBottom:18 }}>
        {[
          { label:t("total"),   count:workers.length, color:"var(--text)" },
          { label:t("online"),  count:online,          color:"var(--green)" },
          { label:t("offline"), count:offline,          color:"var(--red)" },
        ].map(s => (
          <div key={s.label} style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:"var(--r2)", padding:"12px 18px", display:"flex", gap:10, alignItems:"center" }}>
            <span style={{ fontSize:22, fontWeight:700, color:s.color, fontFamily:"var(--mono)" }}>{s.count}</span>
            <span style={{ fontSize:12, color:"var(--text2)" }}>{s.label}</span>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:6, marginBottom:14 }}>
        {["all","online","offline"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding:"5px 14px", borderRadius:6, fontSize:12.5, fontWeight:500, cursor:"pointer",
            border:"1px solid var(--border2)", textTransform:"capitalize",
            background: filter===f ? "var(--accent)" : "var(--bg2)",
            color: filter===f ? "#000" : "var(--text2)",
          }}>{t(f)}</button>
        ))}
      </div>

      <div style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:"var(--r2)", overflow:"hidden" }}>
        {loading ? (
          <div style={{ padding:40, textAlign:"center", color:"var(--text2)" }}>{t("loadingWorkers")}</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:40, textAlign:"center", color:"var(--text2)" }}>
            {filter === "all"
              ? <><div style={{ fontSize:28, marginBottom:8 }}>⛏</div><div>{t("noWorkers")} <Link to="/dashboard/connect">{t("connectFirst")}</Link></div></>
              : t("noWorkers")}
          </div>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ borderBottom:"1px solid var(--border)", background:"var(--bg3)" }}>
                {[
                  { key:"Worker",    label:t("colWorker") },
                  { key:"Status",    label:t("colStatus") },
                  { key:"10m",       label:t("col10m") },
                  { key:"1h",        label:t("col1h") },
                  { key:"24h",       label:t("col24h") },
                  { key:"Accepted",  label:t("colAccepted") },
                  { key:"Stale",     label:t("colStale") },
                  { key:"Last Seen", label:t("colLastSeen") },
                ].map(h => (
                  <th key={h.key} style={{ textAlign:"left", padding:"9px 14px", fontSize:10, color:"var(--text2)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.4px" }}>{h.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(w => (
                <tr key={w.worker_name} style={{ borderBottom:"1px solid rgba(255,255,255,0.03)" }}
                  onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.02)"}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                  <td style={{ padding:"10px 14px" }}>
                    <Link to={`/dashboard/workers/${encodeURIComponent(w.worker_name)}`} style={{ color:"var(--text)", fontFamily:"var(--mono)", fontSize:12, fontWeight:500 }}>{w.worker_name}</Link>
                  </td>
                  <td style={{ padding:"10px 14px" }}>{pill(w.status)}</td>
                  <td style={{ padding:"10px 14px", fontFamily:"var(--mono)", fontSize:12, color:"var(--text2)" }}>{fmt(w.hs_10m)}</td>
                  <td style={{ padding:"10px 14px", fontFamily:"var(--mono)", fontSize:12, color:"var(--text2)" }}>{fmt(w.hs_1h)}</td>
                  <td style={{ padding:"10px 14px", fontFamily:"var(--mono)", fontSize:12, color:"var(--text2)" }}>{fmt(w.hs_1d)}</td>
                  <td style={{ padding:"10px 14px", fontFamily:"var(--mono)", fontSize:12, color:"var(--green)" }}>{parseInt(w.accepted||0).toLocaleString()}</td>
                  <td style={{ padding:"10px 14px", fontFamily:"var(--mono)", fontSize:12, color:parseInt(w.stale||0)>0?"var(--yellow)":"var(--text3)" }}>{parseInt(w.stale||0).toLocaleString()}</td>
                  <td style={{ padding:"10px 14px", fontSize:11.5, color:"var(--text2)" }}>
                    {w.last_seen ? new Date(w.last_seen).toLocaleTimeString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
