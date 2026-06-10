import React, { useState, useEffect } from "react";
import { api } from "../lib/api";

export default function Settings() {
  const [settings, setSettings] = useState({ notify_offline:true, notify_hashrate:true, notify_threshold:20 });
  const [btcAddress, setBtcAddress] = useState("");
  const [user, setUser] = useState(null);
  const [saved, setSaved] = useState(false);
  const [addrSaved, setAddrSaved] = useState(false);
  const [addrError, setAddrError] = useState("");

  useEffect(() => {
    api.me().then(u => { setUser(u); if (u.bitcoin_address) setBtcAddress(u.bitcoin_address); });
    api.notifySettings().then(s => { if (s) setSettings(s); });
  }, []);

  function saveNotify() {
    api.updateNotifySettings(settings)
      .then(() => { setSaved(true); setTimeout(() => setSaved(false), 2000); })
      .catch(console.error);
  }

  function saveAddress() {
    setAddrError("");
    api.setPayoutAddress(btcAddress)
      .then(() => { setAddrSaved(true); setTimeout(() => setAddrSaved(false), 2000); })
      .catch(e => setAddrError(e.message));
  }

  const card = { background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:"var(--r2)", padding:"22px 24px", marginBottom:16 };
  const row  = { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 0", borderBottom:"1px solid var(--border)" };

  return (
    <div style={{ padding:"24px 28px", maxWidth:640 }}>
      <h1 style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>Settings</h1>
      <div style={{ color:"var(--text2)", fontSize:13, marginBottom:22 }}>Account preferences and payout configuration</div>

      {/* Payout address */}
      <div style={card}>
        <h2 style={{ fontSize:15, fontWeight:600, marginBottom:16 }}>Payout Address</h2>
        <div style={{ fontSize:13, color:"var(--text2)", marginBottom:12, lineHeight:1.6 }}>
          Your Bitcoin address for payouts. Minimum payout: 0.001 BTC.
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <input
            value={btcAddress}
            onChange={e => setBtcAddress(e.target.value)}
            placeholder="bc1q… or 1… or 3…"
            style={{ flex:1, padding:"10px 13px", borderRadius:"var(--r)", border:`1px solid ${addrError?"var(--red)":"var(--border2)"}`, background:"var(--bg3)", color:"var(--text)", fontSize:13, fontFamily:"var(--mono)", outline:"none" }}
          />
          <button onClick={saveAddress} style={{
            padding:"10px 18px", borderRadius:"var(--r)", border:"none", cursor:"pointer",
            background: addrSaved ? "var(--green)" : "var(--accent)", color:"#000", fontWeight:600, fontSize:13,
          }}>
            {addrSaved ? "✓ Saved" : "Save"}
          </button>
        </div>
        {addrError && <div style={{ color:"var(--red)", fontSize:12, marginTop:6 }}>{addrError}</div>}
      </div>

      {/* Notification prefs */}
      <div style={card}>
        <h2 style={{ fontSize:15, fontWeight:600, marginBottom:16 }}>Notifications</h2>
        {[
          { key:"notify_offline",  label:"Worker offline alerts",    desc:"Alert when any worker goes offline or comes back online" },
          { key:"notify_hashrate", label:"Hashrate drop alerts",     desc:"Alert when hashrate drops beyond the threshold below" },
        ].map(s => (
          <div key={s.key} style={{ ...row, gap:16 }}>
            <div>
              <div style={{ fontWeight:500, fontSize:13, marginBottom:2 }}>{s.label}</div>
              <div style={{ fontSize:11.5, color:"var(--text2)" }}>{s.desc}</div>
            </div>
            <button onClick={() => setSettings(p => ({ ...p, [s.key]: !p[s.key] }))} style={{
              width:40, height:22, borderRadius:11, border:"none", cursor:"pointer", position:"relative", flexShrink:0,
              background: settings[s.key] ? "var(--accent)" : "var(--bg5)", transition:"background 0.2s",
            }}>
              <span style={{ position:"absolute", top:2, left:settings[s.key]?20:2, width:18, height:18, borderRadius:"50%", background:"#fff", transition:"left 0.2s", display:"block" }} />
            </button>
          </div>
        ))}
        <div style={{ ...row, borderBottom:"none", gap:16 }}>
          <div>
            <div style={{ fontWeight:500, fontSize:13, marginBottom:2 }}>Drop threshold: <strong style={{ color:"var(--accent)" }}>{settings.notify_threshold}%</strong></div>
            <div style={{ fontSize:11.5, color:"var(--text2)" }}>Trigger alert when hashrate drops by this percentage</div>
          </div>
          <input type="range" min="5" max="50" step="5" value={settings.notify_threshold}
            onChange={e => setSettings(p => ({ ...p, notify_threshold: parseInt(e.target.value) }))}
            style={{ width:120, cursor:"pointer" }} />
        </div>
        <button onClick={saveNotify} style={{
          marginTop:14, padding:"10px 22px", borderRadius:"var(--r)", border:"none", cursor:"pointer",
          background: saved ? "var(--green)" : "var(--accent)", color:"#000", fontWeight:600, fontSize:13,
        }}>{saved ? "✓ Saved" : "Save Settings"}</button>
      </div>

      {/* Account info */}
      {user && (
        <div style={card}>
          <h2 style={{ fontSize:15, fontWeight:600, marginBottom:14 }}>Account</h2>
          {[
            ["Username", user.username],
            ["Email", user.email],
            ["Pool Fee", "2%"],
            ["Member Since", user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"],
          ].map(([label, val]) => (
            <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
              <span style={{ color:"var(--text2)", fontSize:13 }}>{label}</span>
              <span style={{ fontFamily:"var(--mono)", fontSize:12 }}>{val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
