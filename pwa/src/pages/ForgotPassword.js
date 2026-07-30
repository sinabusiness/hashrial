import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useLang } from "../i18n";

/* Password-reset request card. Same scaffold as Login — brand mark, one
   .panel, one form — with all styling coming from the design system in
   index.css instead of inline literals, so the surface/radius/status colours
   can no longer drift away from the rest of the app.

   The two status blocks used hardcoded rgba(46,168,76,…) / rgba(232,64,64,…)
   fills; they are now .alert-ok / .alert-bad, which pick up the themed weak
   tokens in both light and dark. The email field carries dir="ltr" for the
   same reason Login's does: an address inside a Persian sentence otherwise
   gets its parts reordered by the bidi algorithm. */

export default function ForgotPassword() {
  const { t } = useLang();
  const [email, setEmail]     = useState("");
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // NOTE: always show the same "sent" state regardless of whether the
      // email exists, to avoid leaking which addresses are registered.
      await api.forgotPassword(email);
    } catch (err) {
      // Same reasoning — don't surface a different error for "not found"
      // vs "sent". Only network/server failures show an actual error.
    } finally {
      setSent(true);
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <Link to="/" className="hr-brand" title={t("backToHome")}>
            <div aria-hidden="true" style={{ width:48, height:48, borderRadius:"var(--r2)", background:"var(--accent)", display:"inline-flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:22, color:"#000", marginBottom:10 }}>H</div>
            <div style={{ fontSize:22, fontWeight:700 }}>Hashrial</div>
          </Link>
          <div className="meta" style={{ marginTop:3 }}>Bitcoin Mining Pool</div>
        </div>

        <div className="panel panel-pad">
          <h1 className="page-title">{t("forgotTitle")}</h1>

          {sent ? (
            <>
              <div className="alert alert-ok" role="status" style={{ marginTop:16 }}>
                {t("forgotSent")}
              </div>
              <div style={{ textAlign:"center" }}>
                <Link className="btn-link" to="/login">{t("forgotBackToLogin")}</Link>
              </div>
            </>
          ) : (
            <>
              <div className="page-sub" style={{ marginBottom:20 }}>{t("forgotSub")}</div>

              {error && <div className="alert alert-bad" role="alert">{error}</div>}

              <form onSubmit={submit}>
                <div style={{ marginBottom:18 }}>
                  <label className="eyebrow" htmlFor="forgot-email" style={{ display:"block", marginBottom:6 }}>{t("forgotEmail")}</label>
                  <input id="forgot-email" type="email" placeholder="you@example.com" value={email} required
                    dir="ltr"
                    onChange={e => setEmail(e.target.value)}
                    style={{ width:"100%", padding:"10px 13px", borderRadius:"var(--r)", border:"1px solid var(--border2)", background:"var(--bg3)", color:"var(--text)", fontSize:13, textAlign:"start" }}
                  />
                </div>

                <button className="btn btn-primary" type="submit" disabled={loading} style={{ width:"100%" }}>
                  {loading ? t("forgotSending") : t("forgotBtn")}
                </button>
              </form>

              <div className="page-sub" style={{ textAlign:"center", marginTop:18 }}>
                <Link className="btn-link" to="/login">{t("forgotBackToLogin")}</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
