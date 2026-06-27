import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useLang } from "../i18n";

export default function Layout() {
  const navigate = useNavigate();
  const { t, lang, setLang, langs } = useLang();
  const [user, setUser]           = useState(null);
  const [notifCount, setNotifCount] = useState(0);
  const [btcPrice, setBtcPrice]   = useState(null);
  const [theme, setTheme]         = useState(() => localStorage.getItem("hashrial_theme") || "dark");
  const [showLang, setShowLang]   = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "");
    localStorage.setItem("hashrial_theme", theme);
  }, [theme]);

  useEffect(() => {
    api.me().then(setUser).catch(() => {
      localStorage.removeItem("hashrial_token");
      navigate("/login");
    });
    const loadNotifs = () =>
      api.notifications()
        .then(ns => setNotifCount((ns||[]).filter(n=>!n.read).length))
        .catch(() => {});
    loadNotifs();
    const t2 = setInterval(loadNotifs, 60000);
    return () => clearInterval(t2);
  }, [navigate]);

  useEffect(() => {
    const load = () => api.btcPrice().then(d => setBtcPrice(d)).catch(() => {});
    load();
    const t2 = setInterval(load, 30000);
    return () => clearInterval(t2);
  }, []);

  function logout() {
    localStorage.removeItem("hashrial_token");
    navigate("/login");
  }

  function toggleTheme() {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  }

  const navItems = [
    { to:"/dashboard",          key:"sidebarDashboard",     icon:"⬡", end:true },
    { to:"/dashboard/workers",  key:"sidebarWorkers",       icon:"⚙" },
    { to:"/dashboard/earnings", key:"sidebarEarnings",      icon:"₿" },
    { to:"/dashboard/connect",  key:"sidebarConnect", icon:"⛓" },
    { to:"/dashboard/notifications", key:"sidebarNotifications", icon:"🔔", badge: notifCount },
    { to:"/dashboard/settings", key:"sidebarSettings",      icon:"◎" },
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
          {navItems.map(({ to, key, icon, end, badge }) => (
            <NavLink key={to} to={to} end={end} style={({ isActive }) => ({
              display:"flex", alignItems:"center", gap:9, padding:"9px 10px",
              borderRadius:"var(--r)", textDecoration:"none", fontSize:13, fontWeight:500,
              color: isActive ? "var(--accent)" : "var(--text2)",
              background: isActive ? "rgba(247,147,26,0.1)" : "transparent",
              transition:"all .15s",
            })}>
              <span style={{ fontSize:15, width:20, textAlign:"center", flexShrink:0 }}>{icon}</span>
              <span style={{ flex:1 }}>{t(key)}</span>
              {badge != null && badge > 0 && (
                <span style={{ background:"var(--accent)", color:"#000", borderRadius:10, padding:"1px 7px", fontSize:10, fontWeight:700 }}>
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {user && (
          <div style={{ padding:"8px 8px 12px", borderTop:"1px solid var(--border)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:9, padding:"7px 10px", borderRadius:"var(--r)" }}>
              <div style={{ width:27, height:27, borderRadius:"50%", background:"rgba(247,147,26,0.15)", border:"1px solid rgba(247,147,26,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"var(--accent)", flexShrink:0 }}>
                {user.username?.[0]?.toUpperCase()}
              </div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:12.5, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.username}</div>
                <button onClick={logout} style={{ background:"none", border:"none", color:"var(--text3)", fontSize:10.5, padding:0, cursor:"pointer", fontFamily:"inherit" }}>{t("signOut")}</button>
              </div>
            </div>
            <button onClick={toggleTheme} style={{
              display:"flex", alignItems:"center", gap:7, width:"100%", marginTop:4,
              padding:"6px 10px", borderRadius:"var(--r)", border:"1px solid var(--border2)",
              background:"var(--bg3)", color:"var(--text2)", cursor:"pointer",
              fontSize:11.5, fontFamily:"inherit", fontWeight:500,
            }}>
              {theme === "dark" ? "☀️ " + t("lightMode") : "🌙 " + t("darkMode")}
            </button>
            <div style={{ position:"relative", marginTop:4 }}>
              <button onClick={() => setShowLang(p => !p)} style={{
                display:"flex", alignItems:"center", gap:7, width:"100%",
                padding:"6px 10px", borderRadius:"var(--r)", border:"1px solid var(--border2)",
                background:"var(--bg3)", color:"var(--text2)", cursor:"pointer",
                fontSize:11.5, fontFamily:"inherit", fontWeight:500,
              }}>
                {langs.find(l => l.code === lang)?.flag || "🌐"} {t("language")}
              </button>
              {showLang && (
                <div style={{
                  position:"absolute", bottom:"100%", left:0, right:0, marginBottom:4,
                  background:"var(--bg3)", border:"1px solid var(--border2)", borderRadius:"var(--r)",
                  overflow:"hidden", zIndex:100,
                }}>
                  {langs.map(l => (
                    <button key={l.code} onClick={() => { setLang(l.code); setShowLang(false); }} style={{
                      display:"flex", alignItems:"center", gap:7, width:"100%",
                      padding:"6px 10px", border:"none", background: lang === l.code ? "rgba(247,147,26,0.1)" : "transparent",
                      color:"var(--text)", cursor:"pointer", fontSize:12, fontFamily:"inherit", textAlign:"start",
                    }}>
                      <span>{l.flag}</span> {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Main */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
        <header style={{ height:50, background:"var(--bg2)", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 20px", flexShrink:0 }}>
          <div style={{ fontSize:13, color:"var(--text2)" }}>
            {user && <span>{t("headerWelcome")}, <strong style={{ color:"var(--text)" }}>{user.username}</strong></span>}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {btcPrice?.price && (
              <span style={{ fontSize:11.5, color:"var(--accent)", fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
                BTC ${btcPrice.price.toLocaleString()}
                <span style={{ color: (btcPrice.change || 0) >= 0 ? "var(--green)" : "var(--red)", fontSize:10.5 }}>
                  {(btcPrice.change || 0) >= 0 ? "▲" : "▼"} {Math.abs(btcPrice.change || 0).toFixed(2)}%
                </span>
              </span>
            )}
            <span style={{ fontSize:11, color:"var(--text2)", display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:"var(--green)", display:"inline-block", animation:"pulse 2s infinite" }} />
              {t("headerLive")}
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
