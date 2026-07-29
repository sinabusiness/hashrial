import React, { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { useLang } from "../i18n";

/* Notification feed. Styling comes from the design system in index.css — see
   the HASHRIAL DESIGN SYSTEM block.

   The per-type fills were hardcoded rgba() literals (red/green/amber at 0.1
   alpha) which failed contrast in the light theme; they now come from the
   --*-weak surface tokens paired with the matching strong token for the glyph.
   Those three colours describe worker state, which is the one job they have.

   Unread is marked with an accent dot rather than a coloured row wash: orange
   is brand/hashrate, and green/amber/red must stay reserved for rig state, so
   neither can be spent on read-state decoration. */

/* Glyphs rather than emoji so the token colour actually drives them — emoji
   ignore `color` and can't respond to the theme. */
const TYPES = {
  worker_offline: { glyph: "●", fill: "var(--red-weak)",   color: "var(--red)",   label: "notifWorkerOffline" },
  worker_online:  { glyph: "●", fill: "var(--green-weak)", color: "var(--green)", label: "notifWorkerOnline"  },
  hashrate_drop:  { glyph: "▾", fill: "var(--amber-weak)", color: "var(--amber)", label: "notifHashrateDrop"  },
};
const TYPE_FALLBACK = { glyph: "·", fill: "var(--bg-card)", color: "var(--text3)", label: null };

export default function Notifications() {
  const { t } = useLang();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() =>
    api.notifications().then(n => setNotifs(n || [])).catch(console.error), []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load]);

  function markRead() {
    api.markRead().then(load).catch(console.error);
  }

  const unread = notifs.filter(n => !n.read).length;

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t("notifTitle")}</h1>
          <div className="page-sub">{t("notifSub")}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span className="meta"><span className="num">{unread}</span> {t("unread")}</span>
          {unread > 0 && (
            <button className="btn btn-ghost" onClick={markRead}>{t("markAllRead")}</button>
          )}
        </div>
      </div>

      <div className="panel">
        {loading ? (
          <div className="empty">{t("loading")}</div>
        ) : notifs.length === 0 ? (
          <div className="empty">
            <div style={{ fontSize: 26, marginBottom: 8 }} aria-hidden="true">🔔</div>
            {t("noNotifs")}
          </div>
        ) : notifs.map((n, i) => {
          const cfg = TYPES[n.type] || TYPE_FALLBACK;
          return (
            <div key={n.id} style={{
              display: "flex", gap: 14, alignItems: "flex-start",
              padding: "14px 22px",
              borderTop: i === 0 ? "none" : "1px solid var(--border)",
              background: n.read ? "transparent" : "var(--bg-card)",
            }}>
              {/* role=img + label so the state is announced, not carried by
                  colour and a glyph alone. */}
              <div
                role="img"
                aria-label={cfg.label ? t(cfg.label) : undefined}
                title={cfg.label ? t(cfg.label) : undefined}
                style={{
                  width: 32, height: 32, borderRadius: 9, flex: "0 0 auto",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: cfg.fill, color: cfg.color, fontSize: 13,
                }}
              >
                {cfg.glyph}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, lineHeight: 1.55, color: n.read ? "var(--text2)" : "var(--text)" }}>
                  {n.message}
                </div>
                <div className="meta" style={{ marginTop: 4 }}>
                  <span className="num">{new Date(n.created_at).toLocaleString()}</span>
                </div>
              </div>

              {!n.read && (
                <span
                  role="img"
                  aria-label={t("unread")}
                  title={t("unread")}
                  style={{
                    width: 6, height: 6, borderRadius: "50%", flex: "0 0 auto",
                    background: "var(--accent)", marginBlockStart: 13,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
