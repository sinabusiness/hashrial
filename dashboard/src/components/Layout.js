import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export default function Layout() {
  const navigate = useNavigate();
  const [user, setUser]           = useState(null);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    api.me().then(setUser).catch(() => {});
    const loadNotifs = () =>
      api.notifications()
        .then(ns => setNotifCount((ns||[]).filter(n=>!n.read).length))
        .catch(() => {});
    loadNotifs();
    const t = setInterval(loadNotifs, 60000);
    return () => clearInterval(t);
  }, []);

  function logout() {
    localStorage.removeItem("hashrial_token");
    navigate("/login");
  }

  const navItems = [
    { to:"/",              label:"Dashboard",     icon:"⬡", end:true },
    { to:"/workers",       label:"Workers",       icon:"⚙" },
    { to:"/earnings",      label:"Earnings",      icon:"₿" },
    { to:"/connect",       label:"Connect Miners",icon:"⛓" },
    { to:"/notifications", label:"Notifications", icon:"🔔", badge: notifCount },
    { to:"/settings",      label:"Settings",      icon:"◎" },
  ];

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden" }}>
      {/* Sidebar */}
      <aside style={{ width:220, flexShrink:0, background:"var(--bg2)", borderRight:"1px solid var(--border)", display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"18px 16px 14px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:"var(--accent)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:16, color:"#000", flexShrink:0 }}>H</div>
          <div>
            <div style={{ fontWeight:700, fontSize:15, letterSpacing:"-0.3px" }}>Hashrial</div>
            <div style={{ fontSize:10, color:"var(--text2)" }}>Mining Pool</div>
          </div>
        </div>

        <nav style={{ flex:1, padding:"10px 8px", display:"flex", flexDirection:"column", gap:1, overflowY:"auto" }}>
          {navItems.map(({ to, label, icon, end, badge }) => (
            <NavLink key={to} to={to} end={end} style={({ isActive }) => ({
              display:"flex", alignItems:"center", gap:9, padding:"9px 10px",
              borderRadius:"var(--r)", textDecoration:"none", fontSize:13, fontWeight:500,
              color: isActive ? "var(--accent)" : "var(--text2)",
              background: isActive ? "rgba(247,147,26,0.1)" : "transparent",
              transition:"all .15s",
            })}>
              <span style={{ fontSize:15, width:20, textAlign:"center", flexShrink:0 }}>{icon}</span>
              <span style={{ flex:1 }}>{label}</span>
              {badge > 0 && (
                <span style={{ background:"var(--accent)", color:"#000", borderRadius:10, padding:"1px 7px", fontSize:10, fontWeight:700 }}>
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {user && (
          <div style={{ padding:"10px 8px 12px", borderTop:"1px solid var(--border)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:9, padding:"7px 10px", borderRadius:"var(--r)" }}>
              <div style={{ width:27, height:27, borderRadius:"50%", background:"rgba(247,147,26,0.15)", border:"1px solid rgba(247,147,26,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"var(--accent)", flexShrink:0 }}>
                {user.username?.[0]?.toUpperCase()}
              </div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:12.5, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.username}</div>
                <button onClick={logout} style={{ background:"none", border:"none", color:"var(--text3)", fontSize:10.5, padding:0, cursor:"pointer", fontFamily:"inherit" }}>Sign out</button>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
        <header style={{ height:50, background:"var(--bg2)", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 20px", flexShrink:0 }}>
          <div style={{ fontSize:13, color:"var(--text2)" }}>
            {user && <span>Welcome back, <strong style={{ color:"var(--text)" }}>{user.username}</strong></span>}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:11, color:"var(--text2)", display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:"var(--green)", display:"inline-block", animation:"pulse 2s infinite" }} />
              Live
            </span>
            <div style={{ background:"rgba(247,147,26,0.1)", border:"1px solid rgba(247,147,26,0.2)", borderRadius:20, padding:"3px 11px", fontSize:11.5, color:"var(--accent)", fontWeight:600 }}>
              {user?.username}
            </div>
          </div>
        </header>

        <main style={{ flex:1, overflow:"auto", background:"var(--bg)" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
