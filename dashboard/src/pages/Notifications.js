import React, { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";

export default function Notifications() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() =>
    api.notifications().then(n => setNotifs(n || [])).catch(console.error), []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  function markRead() {
    api.markRead().then(load).catch(console.error);
  }

  const unread = notifs.filter(n => !n.read).length;

  const iconMap = {
    worker_offline: { icon:"🔴", cls:"rgba(232,64,64,0.1)"     },
    worker_online:  { icon:"🟢", cls:"rgba(46,168,76,0.1)"     },
    hashrate_drop:  { icon:"⚠️", cls:"rgba(212,160,23,0.1)"   },
  };

  return (
    <div style={{ padding:"24px 28px", maxWidth:760 }}>
      <div style={{ marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>Notifications</h1>
          <div style={{ color:"var(--text2)", fontSize:13 }}>{unread} unread</div>
        </div>
        {unread > 0 && (
          <button onClick={markRead} style={{ padding:"7px 16px", borderRadius:6, border:"1px solid var(--border2)", background:"var(--bg2)", color:"var(--text2)", fontSize:12.5, cursor:"pointer" }}>
            Mark all read
          </button>
        )}
      </div>

      <div style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:"var(--r2)", overflow:"hidden" }}>
        {loading ? (
          <div style={{ padding:40, textAlign:"center", color:"var(--text2)" }}>Loading…</div>
        ) : notifs.length === 0 ? (
          <div style={{ padding:40, textAlign:"center", color:"var(--text2)" }}>
            <div style={{ fontSize:28, marginBottom:8 }}>🔔</div>
            No notifications yet.
          </div>
        ) : notifs.map(n => {
          const { icon, cls } = iconMap[n.type] || { icon:"ℹ️", cls:"rgba(74,158,255,0.1)" };
          return (
            <div key={n.id} style={{
              padding:"13px 18px", borderBottom:"1px solid var(--border)",
              display:"flex", gap:12, alignItems:"flex-start",
              background: n.read ? "transparent" : "rgba(247,147,26,0.04)",
            }}>
              <div style={{ width:34, height:34, borderRadius:8, background:cls, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>{icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, marginBottom:3, color: n.read ? "var(--text2)" : "var(--text)" }}>{n.message}</div>
                <div style={{ fontSize:11, color:"var(--text3)", display:"flex", gap:8, alignItems:"center" }}>
                  {new Date(n.created_at).toLocaleString()}
                  {!n.read && <span style={{ fontSize:10, color:"var(--accent)", background:"rgba(247,147,26,0.1)", borderRadius:4, padding:"1px 6px", fontWeight:600 }}>new</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
