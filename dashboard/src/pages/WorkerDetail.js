import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from "recharts";
import { api } from "../lib/api";
import { useLang } from "../i18n";

function fmt(val) {
  const n = parseFloat(val || 0);
  if (n === 0) return "—";
  if (n >= 1e3) return `${(n/1e3).toFixed(2)} PH/s`;
  if (n >= 1)   return `${n.toFixed(2)} TH/s`;
  return `${(n*1000).toFixed(2)} GH/s`;
}

const CT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"var(--bg3)", border:"1px solid var(--border2)", borderRadius:8, padding:"10px 14px" }}>
      <div style={{ fontSize:11, color:"var(--text2)", marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:13, color:"#f7931a", fontWeight:600 }}>{fmt(payload[0]?.value)}</div>
    </div>
  );
};

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

  if (loading) return <div style={{ padding:40, textAlign:"center", color:"var(--text2)" }}>{t("loading")}</div>;
  if (!data?.worker) return (
    <div style={{ padding:40 }}>
      <Link to="/dashboard/workers" style={{ color:"var(--accent)", fontSize:13 }}>{t("backToWorkers")}</Link>
      <div style={{ marginTop:16, color:"var(--text2)" }}>{t("workerNotFound")}</div>
    </div>
  );

  const { worker, snapshots } = data;
  const latest = snapshots?.length > 0 ? snapshots[snapshots.length - 1] : {};
  const chartData = snapshots.map(s => ({
    time: new Date(s.ts).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }),
    hs:       parseFloat(s.hs_10m || s.hs_1h || 0),
    accepted: parseInt(s.accepted || 0),
    stale:    parseInt(s.stale || 0),
  }));

  return (
    <div style={{ padding:"24px 28px", maxWidth:1100 }}>
      <Link to="/dashboard/workers" style={{ color:"var(--text2)", fontSize:13, display:"inline-flex", alignItems:"center", gap:4, marginBottom:16 }}>{t("backToWorkers")}</Link>

      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:6 }}>
        <h1 style={{ fontSize:22, fontWeight:700, fontFamily:"var(--mono)" }}>{name}</h1>
        <span style={{
          display:"inline-flex", alignItems:"center", gap:4, borderRadius:20, padding:"3px 12px",
          fontSize:12, fontWeight:600,
          background: worker.status==="online" ? "rgba(46,168,76,0.1)" : "rgba(232,64,64,0.1)",
          color: worker.status==="online" ? "var(--green)" : "var(--red)",
          border: `1px solid ${worker.status==="online" ? "rgba(46,168,76,0.2)" : "rgba(232,64,64,0.2)"}`,
        }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:"currentColor" }} />
          {worker.status}
        </span>
      </div>
      <div style={{ color:"var(--text2)", fontSize:12.5, marginBottom:22 }}>
        First seen: {worker.first_seen ? new Date(worker.first_seen).toLocaleDateString() : "—"} ·
        {t("colLastSeen")}: {worker.last_seen  ? new Date(worker.last_seen).toLocaleString()       : "—"}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, marginBottom:20 }}>
        {[
          { label:"10m Hashrate", value:fmt(latest.hs_10m), color:"var(--accent)" },
          { label:"1h Hashrate",  value:fmt(latest.hs_1h) },
          { label:"24h Hashrate", value:fmt(latest.hs_1d) },
          { label:t("accepted"),     value:parseInt(latest.accepted||0).toLocaleString(), color:"var(--green)" },
          { label:t("stale"),        value:parseInt(latest.stale||0).toLocaleString(),    color:parseInt(latest.stale||0)>0?"var(--yellow)":"var(--text2)" },
        ].map(s => (
          <div key={s.label} style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:"var(--r2)", padding:"14px 16px" }}>
            <div style={{ fontSize:10, color:"var(--text2)", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:18, fontWeight:700, color:s.color||"var(--text)", fontFamily:"var(--mono)" }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:"var(--r2)", padding:"18px 22px", marginBottom:16 }}>
        <h2 style={{ fontSize:14, fontWeight:600, marginBottom:14 }}>{t("hashrateChart")}</h2>
        {chartData.length === 0
          ? <div style={{ height:180, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text2)", fontSize:13 }}>{t("noDataWorker")}</div>
          : <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top:4, right:4, left:-10, bottom:0 }}>
                <defs>
                  <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f7931a" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#f7931a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="time" tick={{ fill:"var(--text3)", fontSize:10 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={v=>fmt(v)} tick={{ fill:"var(--text3)", fontSize:10 }} tickLine={false} axisLine={false} width={72} />
                <Tooltip content={<CT />} />
                <Area type="monotone" dataKey="hs" stroke="#f7931a" strokeWidth={2} fill="url(#wg)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
        }
      </div>

      {chartData.length > 0 && (
        <div style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:"var(--r2)", padding:"18px 22px" }}>
          <h2 style={{ fontSize:14, fontWeight:600, marginBottom:14 }}>{t("shares")} (24h)</h2>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={chartData} margin={{ top:4, right:4, left:-10, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="time" tick={{ fill:"var(--text3)", fontSize:10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill:"var(--text3)", fontSize:10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background:"var(--bg3)", border:"1px solid var(--border2)", borderRadius:8, fontSize:12 }} />
              <Bar dataKey="accepted" fill="#2ea84c" radius={[2,2,0,0]} name={t("accepted")} />
              <Bar dataKey="stale"    fill="#d4a017" radius={[2,2,0,0]} name={t("stale")} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
