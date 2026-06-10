import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { api } from "../lib/api";

function StatCard({ label, value, sub, accent, icon }) {
  return (
    <div style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:"var(--r2)", padding:"18px 20px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
        <span style={{ fontSize:10, color:"var(--text2)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.6px" }}>{label}</span>
        {icon && <span style={{ fontSize:16, opacity:0.5 }}>{icon}</span>}
      </div>
      <div style={{ fontSize:22, fontWeight:700, color:accent||"var(--text)", letterSpacing:"-0.4px", marginBottom:3, fontFamily:"var(--mono)" }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:"var(--text2)" }}>{sub}</div>}
    </div>
  );
}

function fmt(val) {
  const n = parseFloat(val || 0);
  if (n === 0) return "0 TH/s";
  if (n >= 1e6) return `${(n/1e6).toFixed(2)} EH/s`;
  if (n >= 1e3) return `${(n/1e3).toFixed(2)} PH/s`;
  if (n >= 1)   return `${n.toFixed(2)} TH/s`;
  return `${(n*1000).toFixed(2)} GH/s`;
}

function fmtBTC(val) { return `${parseFloat(val||0).toFixed(8)} BTC`; }

const CT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"var(--bg3)", border:"1px solid var(--border2)", borderRadius:8, padding:"10px 14px" }}>
      <div style={{ fontSize:11, color:"var(--text2)", marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:13, color:"var(--accent)", fontWeight:600 }}>{fmt(payload[0]?.value)}</div>
    </div>
  );
};

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [chart, setChart]       = useState([]);
  const [workers, setWorkers]   = useState([]);
  const [btcPrice, setBtcPrice] = useState(null);
  const [period, setPeriod]     = useState("1h");
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const loadOverview = useCallback(() => {
    return Promise.all([api.overview(), api.workers()])
      .then(([ov, ws]) => { setOverview(ov); setWorkers(ws); setError(null); })
      .catch(e => setError(e.message));
  }, []);

  const loadChart = useCallback((p) => {
    return api.hashrate(p)
      .then(rows => setChart(rows.map(r => ({
        time: new Date(r.ts).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }),
        hs: parseFloat(r.hs_10m || r.hs_1h || 0),
      }))))
      .catch(() => {});
  }, []);

  // UI-04 FIX: BTC price from backend proxy (not direct to CoinGecko)
  const loadBtcPrice = useCallback(() => {
    return api.btcPrice()
      .then(d => setBtcPrice(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadOverview(), loadChart(period), loadBtcPrice()])
      .finally(() => setLoading(false));

    // Auto-refresh
    const t1 = setInterval(loadOverview,  60000);
    const t2 = setInterval(() => loadChart(period), 60000);
    const t3 = setInterval(loadBtcPrice, 30000);
    return () => { clearInterval(t1); clearInterval(t2); clearInterval(t3); };
  }, [loadOverview, loadChart, loadBtcPrice, period]);

  const earn    = overview?.earnings || {};
  const hr      = overview?.hashrate  || {};
  const online  = workers.filter(w => w.status === "online").length;
  const offline = workers.filter(w => w.status !== "online").length;

  const usd = (btc) => btcPrice?.price
    ? ` ≈ $${(parseFloat(btc||0) * btcPrice.price).toLocaleString("en-US", { maximumFractionDigits:2 })} USD`
    : "";

  if (loading) return <div style={{ padding:40, textAlign:"center", color:"var(--text2)" }}>Loading dashboard…</div>;

  return (
    <div style={{ padding:"24px 28px", maxWidth:1400 }}>
      <div style={{ marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>Dashboard</h1>
          <div style={{ color:"var(--text2)", fontSize:13 }}>
            Live pool stats · refreshes every 60s
            {btcPrice && <span style={{ marginLeft:12, color:"var(--accent)" }}>
              BTC ${btcPrice.price?.toLocaleString()} <span style={{ color: btcPrice.change >= 0 ? "var(--green)" : "var(--red)" }}>
                {btcPrice.change >= 0 ? "▲" : "▼"} {Math.abs(btcPrice.change).toFixed(2)}%
              </span>
            </span>}
          </div>
        </div>
        {error && <div style={{ color:"var(--red)", fontSize:12, background:"rgba(232,64,64,0.1)", padding:"6px 12px", borderRadius:6 }}>⚠ {error}</div>}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:14, marginBottom:22 }}>
        <StatCard label="Hashrate (10m)" value={fmt(hr.hs_10m)} sub={`1h avg: ${fmt(hr.hs_1h)}`} accent="var(--accent)" icon="⚡" />
        <StatCard label="Active Workers" value={online} sub={`${offline} offline`} accent={online>0?"var(--green)":"var(--red)"} icon="⚙" />
        <StatCard label="Balance" value={fmtBTC(earn.balance)} sub={usd(earn.balance)||"Available"} accent="var(--yellow)" icon="₿" />
        <StatCard label="Last 24h" value={fmtBTC(earn.earn24h)} sub={usd(earn.earn24h)||"Earnings"} icon="📈" />
        <StatCard label="Total Earned" value={fmtBTC(earn.earnTotal)} sub={`Paid: ${fmtBTC(earn.paidOut)}`} icon="💰" />
        <StatCard label="Acceptance" value={hr.accepted ? `${((hr.accepted/(hr.accepted+parseInt(hr.stale||0)))*100).toFixed(1)}%` : "—"} sub="Share rate" accent="var(--green)" icon="✓" />
      </div>

      <div style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:"var(--r2)", padding:"18px 22px", marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <h2 style={{ fontSize:14, fontWeight:600 }}>Hashrate History</h2>
          <div style={{ display:"flex", gap:6 }}>
            {["1h","1d","7d"].map(p => (
              <button key={p} onClick={() => { setPeriod(p); loadChart(p); }} style={{
                padding:"4px 12px", borderRadius:6, fontSize:12, fontWeight:500,
                border:"1px solid var(--border2)",
                background: period===p ? "var(--accent)" : "var(--bg4)",
                color: period===p ? "#000" : "var(--text2)", cursor:"pointer",
              }}>{p}</button>
            ))}
          </div>
        </div>
        {chart.length === 0
          ? <div style={{ height:200, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text2)", fontSize:13 }}>No hashrate data yet. Connect your miners to start.</div>
          : <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chart} margin={{ top:4, right:4, left:-10, bottom:0 }}>
                <defs>
                  <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f7931a" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#f7931a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="time" tick={{ fill:"var(--text3)", fontSize:10 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={v=>fmt(v)} tick={{ fill:"var(--text3)", fontSize:10 }} tickLine={false} axisLine={false} width={72} />
                <Tooltip content={<CT />} />
                <Area type="monotone" dataKey="hs" stroke="#f7931a" strokeWidth={2} fill="url(#hg)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
        }
      </div>

      <div style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:"var(--r2)" }}>
        <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h2 style={{ fontSize:14, fontWeight:600 }}>Workers</h2>
          <Link to="/workers" style={{ fontSize:12, color:"var(--accent)" }}>View all →</Link>
        </div>
        {workers.length === 0
          ? <div style={{ padding:"32px", textAlign:"center", color:"var(--text2)" }}>
              <div style={{ fontSize:28, marginBottom:8 }}>⛏</div>
              No workers yet. <Link to="/connect">Connect your first miner →</Link>
            </div>
          : <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ borderBottom:"1px solid var(--border)" }}>
                    {["Worker","Status","10m","1h","Accepted","Stale"].map(h => (
                      <th key={h} style={{ textAlign:"left", padding:"8px 14px", fontSize:10, color:"var(--text2)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {workers.slice(0,8).map(w => (
                    <tr key={w.worker_name} style={{ borderBottom:"1px solid rgba(255,255,255,0.03)" }}>
                      <td style={{ padding:"10px 14px" }}>
                        <Link to={`/workers/${w.worker_name}`} style={{ color:"var(--text)", fontFamily:"var(--mono)", fontSize:12 }}>{w.worker_name}</Link>
                      </td>
                      <td style={{ padding:"10px 14px" }}>
                        <span style={{
                          display:"inline-flex", alignItems:"center", gap:4, borderRadius:20, padding:"2px 9px",
                          fontSize:10.5, fontWeight:600,
                          background: w.status==="online" ? "rgba(46,168,76,0.1)" : "rgba(232,64,64,0.1)",
                          color: w.status==="online" ? "var(--green)" : "var(--red)",
                          border: `1px solid ${w.status==="online" ? "rgba(46,168,76,0.2)" : "rgba(232,64,64,0.2)"}`,
                        }}>
                          <span style={{ width:5, height:5, borderRadius:"50%", background:"currentColor", display:"inline-block" }} />
                          {w.status}
                        </span>
                      </td>
                      <td style={{ padding:"10px 14px", fontFamily:"var(--mono)", fontSize:12, color:"var(--text2)" }}>{fmt(w.hs_10m)}</td>
                      <td style={{ padding:"10px 14px", fontFamily:"var(--mono)", fontSize:12, color:"var(--text2)" }}>{fmt(w.hs_1h)}</td>
                      <td style={{ padding:"10px 14px", fontFamily:"var(--mono)", fontSize:12, color:"var(--green)" }}>{parseInt(w.accepted||0).toLocaleString()}</td>
                      <td style={{ padding:"10px 14px", fontFamily:"var(--mono)", fontSize:12, color:"var(--text3)" }}>{parseInt(w.stale||0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>
    </div>
  );
}
