import React, { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useLang } from "../i18n";

/* Set-a-new-password card. Same scaffold as Login: centred brand mark, one
   .panel, one form. All surface/status literals now come from the design
   system in index.css — the hardcoded rgba(46,168,76,…) success box and
   rgba(232,64,64,…) error box are .alert-ok / .alert-bad, and borderRadius:12
   on the logo is var(--r2) so it tracks the responsive radius step.

   The inputs carry no onFocus/onBlur border swap any more: that overrode the
   design system's focus-visible outline with a colour-only cue, which is
   invisible to anyone navigating by keyboard with high-contrast settings. */

export default function ResetPassword() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError(t("resetMismatch")); return; }
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err.message || t("resetInvalidLink"));
    } finally {
      setLoading(false);
    }
  }

  /* The brand mark is the only exit back to the marketing site, so both
     branches below get it — the no-token branch previously had none. */
  const brand = (
    <div style={{ textAlign:"center", marginBottom:32 }}>
      <Link to="/" className="hr-brand" title={t("backToHome")}>
        <div aria-hidden="true" style={{ width:48, height:48, borderRadius:"var(--r2)", background:"var(--accent)", display:"inline-flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:22, color:"#000", marginBottom:10 }}>H</div>
        <div style={{ fontSize:22, fontWeight:700 }}>Hashrial</div>
      </Link>
      <div className="meta" style={{ marginTop:3 }}>Bitcoin Mining Pool</div>
    </div>
  );

  if (!token) {
    return (
      <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
        <div style={{ width:"100%", maxWidth:400 }}>
          {brand}
          <div className="panel panel-pad" style={{ textAlign:"center" }}>
            <div className="alert alert-bad" role="alert">{t("resetInvalidLink")}</div>
            <Link className="btn-link" to="/forgot-password">{t("forgotTitle")} →</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ width:"100%", maxWidth:400 }}>
        {brand}

        <div className="panel panel-pad">
          <h1 className="page-title" style={{ marginBottom: success ? 20 : 0 }}>{t("resetTitle")}</h1>

          {success ? (
            <>
              <div className="alert alert-ok" role="status">{t("resetSuccess")}</div>
              <button className="btn btn-primary" type="button" onClick={() => navigate("/login")} style={{ width:"100%" }}>
                {t("resetGoToLogin")}
              </button>
            </>
          ) : (
            <>
              <div className="page-sub" style={{ marginBottom:20 }}>{t("resetSub")}</div>

              {error && <div className="alert alert-bad" role="alert">{error}</div>}

              <form onSubmit={submit}>
                {[
                  { key:"password", label: t("resetPassword"), value: password, setter: setPassword, minLength:10 },
                  { key:"confirm",  label: t("resetConfirm"),  value: confirm,  setter: setConfirm },
                ].map(f => (
                  <div key={f.key} style={{ marginBottom:16 }}>
                    <label className="eyebrow" htmlFor={`reset-${f.key}`} style={{ display:"block", marginBottom:6 }}>{f.label}</label>
                    <input id={`reset-${f.key}`} type="password" value={f.value} minLength={f.minLength} required
                      dir="ltr"
                      onChange={e => f.setter(e.target.value)}
                      style={{ width:"100%", padding:"10px 13px", borderRadius:"var(--r)", border:"1px solid var(--border2)", background:"var(--bg3)", color:"var(--text)", fontSize:13, textAlign:"start" }}
                    />
                  </div>
                ))}

                <button className="btn btn-primary" type="submit" disabled={loading} style={{ width:"100%", marginTop:2 }}>
                  {loading ? t("resetSubmitting") : t("resetBtn")}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
