import React, { useState, useEffect } from "react";
import { api } from "../lib/api";

function fmtBTC(val) { return `${parseFloat(val||0).toFixed(8)} BTC`; }

export default function Earnings() {
  const [earnings, setEarnings] = useState({ rows:[], total:0 });
  const [overview, setOverview] = useState(null);
  const [payouts, setPayouts]   = useState([]);
  const [btcPrice, setBtcPrice] = useState(null);
  const [page, setPage]         = useState(1);
  const [requesting, setRequesting] = useState(false);
  const [payoutMsg, setPayoutMsg]   = useState(null);

  useEffect(() => {
    Promise.all([api.earnings(page), api.overview(), api.payoutHistory(), api.btcPrice()])
      .then(([e, ov, py, btc]) => {
        setEarnings(e);
        setOverview(ov);
        setPayouts(py || []);
        setBtcPrice(btc);
      }).catch(console.error);
  }, [page]);

  function requestPayout() {
    setRequesting(true);
    api.requestPayout()
      .then(r => setPayoutMsg({ ok:true, msg:`Payout request submitted: ${r.amount} BTC to ${r.address}` }))
      .catch(e => setPayoutMsg({ ok:false, msg: e.message }))
      .finally(() => setRequesting(false));
  }

  const earn = overview?.earnings || {};
  const usd  = (btc) => btcPrice?.price
    ? ` ≈ $${(parseFloat(btc||0)*btcPrice.price).toLocaleString("en-US",{maximumFractionDigits:2})}`
    : "";

  const card = { background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:"var(--r2)", overflow:"hidden", marginBottom:16 };
  const ch   = { padding:"14px 18px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center" };

  return (
    <div style={{ padding:"24px 28px", maxWidth:1100 }}>
      <h1 style={{ fontSize:22, fontWeight:700, marginBottom:20 }}>Earnings</h1>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:14, marginBottom:20 }}>
        {[
          { label:"Available Balance", value:fmtBTC(earn.balance), sub:usd(earn.balance), color:"var(--yellow)" },
          { label:"Last 24h",          value:fmtBTC(earn.earn24h), sub:usd(earn.earn24h), color:"var(--green)" },
          { label:"Total Earned",      value:fmtBTC(earn.earnTotal),sub:usd(earn.earnTotal),color:"var(--accent)" },
          { label:"Total Paid Out",    value:fmtBTC(earn.paidOut),  sub:"",               color:"var(--text2)" },
        ].map(c => (
          <div key={c.label} style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:"var(--r2)", padding:"16px 18px" }}>
            <div style={{ fontSize:10, color:"var(--text2)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:8 }}>{c.label}</div>
            <div style={{ fontSize:18, fontWeight:700, color:c.color, fontFamily:"var(--mono)", marginBottom:3 }}>{c.value}</div>
            {c.sub && <div style={{ fontSize:11, color:"var(--text2)" }}>{c.sub}</div>}
          </div>
        ))}
      </div>

      <div style={{ background:"rgba(247,147,26,0.06)", border:"1px solid rgba(247,147,26,0.18)", borderRadius:"var(--r2)", padding:"13px 16px", marginBottom:16, fontSize:13, color:"var(--text2)", lineHeight:1.7 }}>
        <strong style={{ color:"var(--accent)" }}>ℹ 2% Pool Fee</strong> — Hashrial charges 2% for pool infrastructure. The earnings shown are your net balance after the fee.
      </div>

      {/* Payout request */}
      <div style={{ ...card }}>
        <div style={ch}><div style={{ fontSize:14, fontWeight:600 }}>Request Payout</div></div>
        <div style={{ padding:"16px 18px" }}>
          <div style={{ fontSize:13, color:"var(--text2)", marginBottom:12 }}>
            Minimum: 0.001 BTC. Make sure you have set a payout address in Settings.
          </div>
          {payoutMsg && (
            <div style={{ marginBottom:12, padding:"10px 14px", borderRadius:"var(--r)", fontSize:13,
              background: payoutMsg.ok ? "rgba(46,168,76,0.1)" : "rgba(232,64,64,0.1)",
              color: payoutMsg.ok ? "var(--green)" : "var(--red)",
              border: `1px solid ${payoutMsg.ok ? "rgba(46,168,76,0.2)" : "rgba(232,64,64,0.2)"}`,
            }}>{payoutMsg.msg}</div>
          )}
          <button onClick={requestPayout} disabled={requesting} style={{
            padding:"10px 22px", borderRadius:"var(--r)", border:"none", cursor: requesting?"not-allowed":"pointer",
            background:"var(--accent)", color:"#000", fontWeight:600, fontSize:13, opacity: requesting?0.7:1,
          }}>{requesting ? "Submitting…" : "Request Payout"}</button>
        </div>
      </div>

      {/* Payout history */}
      {payouts.length > 0 && (
        <div style={card}>
          <div style={ch}><div style={{ fontSize:14, fontWeight:600 }}>Payout History</div></div>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr style={{ borderBottom:"1px solid var(--border)", background:"var(--bg3)" }}>
              {["Date","Amount","Address","Status","TxID"].map(h => (
                <th key={h} style={{ textAlign:"left", padding:"9px 16px", fontSize:10, color:"var(--text2)", fontWeight:600, textTransform:"uppercase" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {payouts.map(p => (
                <tr key={p.id} style={{ borderBottom:"1px solid rgba(255,255,255,0.03)" }}>
                  <td style={{ padding:"10px 16px", color:"var(--text2)", fontSize:12 }}>{new Date(p.requested_at).toLocaleDateString()}</td>
                  <td style={{ padding:"10px 16px", fontFamily:"var(--mono)", fontSize:12, color:"var(--accent)" }}>{fmtBTC(p.amount_btc)}</td>
                  <td style={{ padding:"10px 16px", fontFamily:"var(--mono)", fontSize:11, color:"var(--text2)", maxWidth:160, overflow:"hidden", textOverflow:"ellipsis" }}>{p.address}</td>
                  <td style={{ padding:"10px 16px" }}>
                    <span style={{ padding:"2px 8px", borderRadius:20, fontSize:10.5, fontWeight:600,
                      background: p.status==="paid"?"rgba(46,168,76,0.1)":p.status==="failed"?"rgba(232,64,64,0.1)":"rgba(212,160,23,0.1)",
                      color: p.status==="paid"?"var(--green)":p.status==="failed"?"var(--red)":"var(--yellow)",
                    }}>{p.status}</span>
                  </td>
                  <td style={{ padding:"10px 16px", fontFamily:"var(--mono)", fontSize:10, color:"var(--blue)" }}>{p.txid ? `${p.txid.slice(0,12)}…` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Earnings history */}
      <div style={card}>
        <div style={ch}>
          <div style={{ fontSize:14, fontWeight:600 }}>Earnings History</div>
          <span style={{ fontSize:12, color:"var(--text2)" }}>{earnings.total || 0} records</span>
        </div>
        {earnings.rows.length === 0
          ? <div style={{ padding:32, textAlign:"center", color:"var(--text2)" }}>No earnings history yet.</div>
          : <>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr style={{ borderBottom:"1px solid var(--border)", background:"var(--bg3)" }}>
                  {["Date","Balance","24h Earnings","Total Earned","Paid Out"].map(h => (
                    <th key={h} style={{ textAlign:"left", padding:"9px 16px", fontSize:10, color:"var(--text2)", fontWeight:600, textTransform:"uppercase" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {earnings.rows.map((r,i) => (
                    <tr key={i} style={{ borderBottom:"1px solid rgba(255,255,255,0.03)" }}>
                      <td style={{ padding:"10px 16px", fontSize:12, color:"var(--text2)" }}>{r.settle_date || new Date(r.ts).toLocaleDateString()}</td>
                      <td style={{ padding:"10px 16px", fontFamily:"var(--mono)", fontSize:12, color:"var(--yellow)" }}>{fmtBTC(r.balance)}</td>
                      <td style={{ padding:"10px 16px", fontFamily:"var(--mono)", fontSize:12, color:"var(--green)" }}>{fmtBTC(r.earn_24h)}</td>
                      <td style={{ padding:"10px 16px", fontFamily:"var(--mono)", fontSize:12, color:"var(--accent)" }}>{fmtBTC(r.earn_total)}</td>
                      <td style={{ padding:"10px 16px", fontFamily:"var(--mono)", fontSize:12, color:"var(--text2)" }}>{fmtBTC(r.paid_out)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding:"12px 18px", display:"flex", gap:8, justifyContent:"flex-end", borderTop:"1px solid var(--border)" }}>
                {page > 1 && <button onClick={() => setPage(p=>p-1)} style={{ padding:"5px 12px", borderRadius:6, border:"1px solid var(--border2)", background:"var(--bg4)", color:"var(--text2)", cursor:"pointer", fontSize:12 }}>← Prev</button>}
                <span style={{ padding:"5px 12px", fontSize:12, color:"var(--text2)" }}>Page {page}</span>
                {earnings.rows.length === 20 && <button onClick={() => setPage(p=>p+1)} style={{ padding:"5px 12px", borderRadius:6, border:"1px solid var(--border2)", background:"var(--bg4)", color:"var(--text2)", cursor:"pointer", fontSize:12 }}>Next →</button>}
              </div>
            </>
        }
      </div>
    </div>
  );
}
