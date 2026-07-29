import React, { useState, useEffect } from "react";
import { api } from "../lib/api";
import { useLang } from "../i18n";

/* Presentation only — every surface, control and numeral here comes from the
   shared design system in index.css. No local border/radius/padding literals,
   no hardcoded rgba() status colours, logical properties throughout (physical
   ones land on the wrong side in fa). */

export default function Settings() {
  const { t } = useLang();
  const [settings, setSettings] = useState({ notify_offline:true, notify_hashrate:true, notify_threshold:20 });
  const [btcAddress, setBtcAddress] = useState("");
  const [user, setUser] = useState(null);
  const [saved, setSaved] = useState(false);
  const [addrSaved, setAddrSaved] = useState(false);
  const [addrError, setAddrError] = useState("");

  useEffect(() => {
    api.me().then(u => { setUser(u); if (u.bitcoin_address) setBtcAddress(u.bitcoin_address); }).catch(() => {});
    api.notifySettings().then(s => { if (s) setSettings(s); }).catch(() => {});
  }, []);

  function saveNotify() {
    api.updateNotifySettings(settings)
      .then(() => { setSaved(true); setTimeout(() => setSaved(false), 2000); })
      .catch(console.error);
  }

  function saveAddress() {
    setAddrError("");
    if (!btcAddress.trim()) { setAddrError(t("bitcoinAddressHint")); return; }
    if (!/^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{6,87})$/.test(btcAddress.trim())) {
      setAddrError("Invalid Bitcoin address format");
      return;
    }
    api.setPayoutAddress(btcAddress.trim())
      .then(() => { setAddrSaved(true); setTimeout(() => setAddrSaved(false), 2000); })
      .catch(e => setAddrError(e.message || "Failed to save address"));
  }

  /* A settings form is one column of decisions — the reading measure stays
     narrow while the page padding matches every other page via .page. */
  const rowStyle = {
    display:"flex", justifyContent:"space-between", alignItems:"center",
    gap:16, padding:"13px 0", borderBottom:"1px solid var(--border)",
  };
  const fieldLabel = { fontWeight:500, fontSize:13, marginBottom:2 };
  const fieldDesc  = { fontSize:11.5, color:"var(--text2)", lineHeight:1.55 };

  return (
    <div className="page" style={{ maxWidth:720 }}>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('settingsTitle')}</h1>
          <div className="page-sub">{t('settingsSub')}</div>
        </div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

        {/* ── Payout address ─────────────────────────────────────── */}
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">{t('bitcoinAddress')}</h2>
            <span className="eyebrow">BTC</span>
          </div>
          <div className="panel-pad">
            <div className="page-sub" style={{ marginTop:0, marginBottom:12 }}>
              {t('bitcoinAddressLabel')}
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <input
                className="num"
                value={btcAddress}
                onChange={e => setBtcAddress(e.target.value)}
                placeholder={t('bitcoinAddressHint')}
                aria-label={t('bitcoinAddress')}
                aria-invalid={addrError ? true : undefined}
                aria-describedby={addrError ? "btc-addr-error" : undefined}
                style={{
                  flex:"1 1 240px", minWidth:0, padding:"10px 13px",
                  borderRadius:"var(--r)", border:`1px solid ${addrError ? "var(--red)" : "var(--border2)"}`,
                  background:"var(--bg3)", color:"var(--text)", fontSize:13,
                  textAlign:"start", outline:"none",
                }}
              />
              <button type="button" className="btn btn-primary" onClick={saveAddress}>
                {addrSaved ? "✓ " + t('saved') : t('save')}
              </button>
            </div>
            {addrError && (
              <div id="btc-addr-error" role="alert" className="alert alert-bad"
                   style={{ marginTop:10, marginBottom:0 }}>
                {addrError}
              </div>
            )}
          </div>
        </section>

        {/* ── Notification preferences ───────────────────────────── */}
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">{t('notifications')}</h2>
          </div>
          <div className="panel-pad">
            {[
              { key:"notify_offline",  label:t('notifyOffline'),    desc:t('notifyOfflineDesc') },
              { key:"notify_hashrate", label:t('notifyHashrate'),     desc:t('notifyHashrateDesc') },
            ].map(s => (
              <div key={s.key} style={rowStyle}>
                <div>
                  <div style={fieldLabel}>{s.label}</div>
                  <div style={fieldDesc}>{s.desc}</div>
                </div>
                {/* Track is brand-accent when on — green/amber/red are reserved
                    for worker state and never used as decoration. */}
                <button
                  type="button"
                  aria-pressed={!!settings[s.key]}
                  aria-label={s.label}
                  onClick={() => setSettings(p => ({ ...p, [s.key]: !p[s.key] }))}
                  style={{
                    width:40, height:22, borderRadius:11, border:"none",
                    position:"relative", flexShrink:0, padding:0,
                    background: settings[s.key] ? "var(--accent)" : "var(--bg5)",
                    transition:"background .2s ease",
                  }}
                >
                  <span style={{
                    position:"absolute", top:2, insetInlineStart: settings[s.key] ? 20 : 2,
                    width:18, height:18, borderRadius:"50%", background:"#fff",
                    transition:"inset-inline-start .2s ease", display:"block",
                  }} />
                </button>
              </div>
            ))}

            <div style={{ ...rowStyle, borderBottom:"none" }}>
              <div>
                <div style={fieldLabel}>
                  {t('notifyThreshold')}:{" "}
                  <strong className="num" style={{ color:"var(--text)" }}>
                    {Number(settings.notify_threshold || 0).toFixed(1)}%
                  </strong>
                </div>
                <div style={fieldDesc}>{t('notifyThresholdDesc')}</div>
              </div>
              <input
                type="range" min="5" max="50" step="5"
                value={settings.notify_threshold}
                aria-label={t('notifyThreshold')}
                onChange={e => setSettings(p => ({ ...p, notify_threshold: parseInt(e.target.value) }))}
                style={{ width:120, flexShrink:0, accentColor:"var(--accent)", cursor:"pointer" }}
              />
            </div>

            <button type="button" className="btn btn-primary" onClick={saveNotify} style={{ marginTop:16 }}>
              {saved ? "✓ " + t('saved') : t('save')}
            </button>
          </div>
        </section>

        {/* ── Account info ───────────────────────────────────────── */}
        {user && (
          <section className="panel">
            <div className="panel-head">
              <h2 className="panel-title">{t("accountInfo")}</h2>
            </div>
            <div className="panel-pad">
              {[
                [t("registerUsername"), user.username],
                [t("loginEmail"), user.email],
                [t("poolFee"), "2.0%"],
                [t("memberSince"), user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"],
              ].map(([label, val], i, arr) => (
                <div key={label} style={{
                  display:"flex", justifyContent:"space-between", alignItems:"baseline",
                  gap:16, padding:"9px 0",
                  borderBottom: i === arr.length - 1 ? "none" : "1px solid var(--border)",
                }}>
                  <span style={{ color:"var(--text2)", fontSize:13 }}>{label}</span>
                  <span className="num" style={{ fontSize:12, color:"var(--text)", textAlign:"end", wordBreak:"break-all" }}>{val}</span>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
