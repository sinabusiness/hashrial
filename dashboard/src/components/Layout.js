import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useLang } from "../i18n";

/* ─────────────────────────────────────────────────────────────
   The app shell. It frames every page, so it is the one surface
   that must not compete with page content:

   - Orange is scarce here on purpose. Exactly one element in the
     chrome is accent-coloured at a time (the active nav item),
     because --accent means hashrate on every page inside this
     frame. The BTC spot price is money, so it is not accent.
   - Nothing in the chrome is green/amber/red. Those three mean
     worker state, and a permanently-green "Live" dot in the header
     reads as a health signal for a fleet that may be entirely
     offline.
   - Layout is logical, never physical (border-inline-end,
     inset-inline-start, text-align: start) — the sidebar is on the
     right in fa, and physical properties put its border and its
     active rail on the wrong edge.
   ───────────────────────────────────────────────────────────── */

const SHELL_CSS = `
.hs-shell   { display: flex; height: 100vh; overflow: hidden; }

/* ── Sidebar ─────────────────────────────────────────────── */
.hs-side    { width: 220px; flex: 0 0 auto; display: flex; flex-direction: column;
              background: var(--bg2); border-inline-end: 1px solid var(--border); }
.hs-brand   { display: flex; align-items: center; gap: 10px;
              padding: 18px 16px 14px; border-bottom: 1px solid var(--border); }
.hs-mark    { width: 32px; height: 32px; flex: 0 0 auto; border-radius: var(--r);
              background: var(--accent); color: #000; font-size: 16px; font-weight: 800;
              display: flex; align-items: center; justify-content: center; }
.hs-wordmark{ font-size: 15px; font-weight: 700; letter-spacing: -0.01em; color: var(--text); }

.hs-nav     { flex: 1; overflow-y: auto; padding: 10px 8px;
              display: flex; flex-direction: column; gap: 1px; }
.hs-navlink { position: relative; display: flex; align-items: center; gap: 9px;
              padding: 9px 10px; border-radius: var(--r); text-decoration: none;
              font-size: 13px; font-weight: 500; color: var(--text2);
              transition: background .15s ease, color .15s ease; }
.hs-navlink:hover { background: var(--bg-card); color: var(--text); }
/* Active state = neutral surface plus a single accent rail, rather than an
   orange wash. Keeps the chrome quiet and keeps orange meaningful. */
.hs-navlink[aria-current="page"] { background: var(--bg-card); color: var(--accent); }
.hs-navlink[aria-current="page"]::before {
              content: ""; position: absolute; inset-inline-start: 0;
              top: 7px; bottom: 7px; width: 2px; border-radius: 2px;
              background: var(--accent); }
.hs-navicon { width: 20px; flex: 0 0 auto; font-size: 15px; text-align: center; }
.hs-navlabel{ flex: 1; min-width: 0; }
.hs-badge   { flex: 0 0 auto; background: var(--accent); color: #000;
              border-radius: 10px; padding: 1px 7px; font-size: 10px; font-weight: 700; }

.hs-foot    { padding: 8px 8px 12px; border-top: 1px solid var(--border); }
.hs-user    { display: flex; align-items: center; gap: 9px; padding: 7px 10px; }
.hs-avatar  { width: 27px; height: 27px; flex: 0 0 auto; border-radius: 50%;
              background: var(--bg-card); border: 1px solid var(--border);
              color: var(--text2); font-size: 11px; font-weight: 700;
              display: flex; align-items: center; justify-content: center; }
.hs-username{ font-size: 12.5px; font-weight: 600; color: var(--text);
              overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.btn.hs-sidebtn { display: flex; align-items: center; gap: 7px; width: 100%;
              margin-top: 4px; padding: 7px 10px; font-size: 11.5px;
              font-weight: 500; text-align: start; }
.hs-menu    { position: absolute; bottom: 100%; margin-bottom: 4px; z-index: 100;
              inset-inline-start: 0; inset-inline-end: 0;
              background: var(--bg3); border: 1px solid var(--border2);
              border-radius: var(--r); overflow: hidden; }
.hs-menuitem{ display: flex; align-items: center; gap: 7px; width: 100%;
              padding: 7px 10px; border: 0; background: transparent;
              color: var(--text); font-family: inherit; font-size: 12px;
              text-align: start; cursor: pointer; }
.hs-menuitem:hover { background: var(--bg-card); }
.hs-menuitem[aria-pressed="true"] { background: var(--bg-card); color: var(--accent); }

/* ── Main column ─────────────────────────────────────────── */
.hs-body    { flex: 1; min-width: 0; display: flex; flex-direction: column; overflow: hidden; }
/* Gutter matches .page so header content sits on the same axis as page content. */
.hs-header  { flex: 0 0 auto; height: 50px; padding: 0 30px; gap: 14px;
              display: flex; align-items: center; justify-content: space-between;
              background: var(--bg2); border-bottom: 1px solid var(--border); }
.hs-greet   { min-width: 0; font-size: 13px; color: var(--text2);
              overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hs-headend { flex: 0 0 auto; display: flex; align-items: center; gap: 12px; }
.hs-live::before { animation: pulse 2s infinite; }
.hs-main    { flex: 1; overflow: auto; background: var(--bg); }

@media (prefers-reduced-motion: reduce) {
  .hs-navlink { transition: none; }
  .hs-live::before { animation: none; }
}

/* The sidebar narrows but stays labelled — an icon-only rail is guesswork, and
   the labels are the only place the six languages differ. Type never drops
   below 12.5px. Gutters follow .page's own 900px step. */
@media (max-width: 900px) {
  .hs-side   { width: 190px; }
  .hs-brand  { padding: 15px 12px 12px; }
  .hs-nav    { padding: 8px 6px; }
  .hs-header { padding: 0 16px; }
}
@media (max-width: 620px) {
  .hs-side    { width: 172px; }
  .hs-navlink { font-size: 12.5px; padding: 8px 9px; gap: 7px; }
  .hs-hide-sm { display: none; }
}
`;

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

  const priceUp = (btcPrice?.change || 0) >= 0;
  const activeLang = langs.find(l => l.code === lang);

  return (
    <div className="hs-shell">
      <style>{SHELL_CSS}</style>

      {/* Sidebar */}
      <aside className="hs-side">
        <div className="hs-brand">
          <div className="hs-mark" aria-hidden="true">H</div>
          <div>
            <div className="hs-wordmark">Hashrial</div>
            <div className="eyebrow">Mining Pool</div>
          </div>
        </div>

        <nav className="hs-nav">
          {navItems.map(({ to, key, icon, end, badge }) => (
            <NavLink key={to} to={to} end={end} className="hs-navlink">
              <span className="hs-navicon" aria-hidden="true">{icon}</span>
              <span className="hs-navlabel">{t(key)}</span>
              {badge != null && badge > 0 && (
                <span className="hs-badge num">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {user && (
          <div className="hs-foot">
            <div className="hs-user">
              <div className="hs-avatar" aria-hidden="true">
                {user.username?.[0]?.toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="hs-username">{user.username}</div>
                {/* Quiet on purpose: signing out is an exit, not a call to
                    action, so it does not take the accent .btn-link colour. */}
                <button onClick={logout} className="btn-link" style={{ fontSize: 11, color: "var(--text3)" }}>
                  {t("signOut")}
                </button>
              </div>
            </div>

            <button
              onClick={toggleTheme}
              className="btn btn-ghost hs-sidebtn"
              aria-pressed={theme === "light"}
            >
              <span aria-hidden="true">{theme === "dark" ? "☀️" : "🌙"}</span>
              <span>{theme === "dark" ? t("lightMode") : t("darkMode")}</span>
            </button>

            <div style={{ position: "relative", marginTop: 4 }}>
              <button
                onClick={() => setShowLang(p => !p)}
                className="btn btn-ghost hs-sidebtn"
                aria-haspopup="true"
                aria-expanded={showLang}
              >
                <span aria-hidden="true">{activeLang?.flag || "🌐"}</span>
                <span>{t("language")}</span>
              </button>
              {showLang && (
                <div className="hs-menu" aria-label={t("language")}>
                  {langs.map(l => (
                    <button
                      key={l.code}
                      onClick={() => { setLang(l.code); setShowLang(false); }}
                      className="hs-menuitem"
                      aria-pressed={lang === l.code}
                      lang={l.code}
                    >
                      <span aria-hidden="true">{l.flag}</span> {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="hs-body">
        <header className="hs-header">
          <div className="hs-greet">
            {user && <span>{t("headerWelcome")}, <strong style={{ color: "var(--text)" }}>{user.username}</strong></span>}
          </div>
          <div className="hs-headend">
            {btcPrice?.price && (
              <span className="hs-hide-sm" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="eyebrow">BTC</span>
                {/* Spot price is money, so it is not accent — orange inside this
                    frame means hashrate. */}
                <span className="num" style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text)" }}>
                  ${btcPrice.price.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </span>
                {/* Direction is carried by the glyph, not by colour: green and
                    red are reserved for worker state. */}
                <span className="num" style={{ fontSize: 10.5, color: "var(--text3)" }}>
                  {priceUp ? "▲" : "▼"} {Math.abs(btcPrice.change || 0).toFixed(1)}%
                </span>
              </span>
            )}
            <span className="pill pill-idle hs-live">{t("headerLive")}</span>
          </div>
        </header>

        <main className="hs-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
