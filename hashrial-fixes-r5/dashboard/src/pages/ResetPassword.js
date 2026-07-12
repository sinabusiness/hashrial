import React, { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useLang } from "../i18n";

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

  if (!token) {
    return (
      <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
        <div style={{ width:"100%", maxWidth:400, textAlign:"center" }}>
          <div style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:"var(--r2)", padding:"28px 32px" }}>
            <div style={{ color:"var(--red)", fontSize:14, marginBottom:16 }}>{t("resetInvalidLink")}</div>
            <Link to="/forgot-password" style={{ color:"var(--accent)", fontWeight:500, fontSize:13 }}>{t("forgotTitle")} →</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:48, height:48, borderRadius:12, background:"var(--accent)", display:"inline-flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:22, color:"#000", marginBottom:10 }}>H</div>
          <div style={{ fontSize:22, fontWeight:700 }}>Hashrial</div>
        </div>
        <div style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:"var(--r2)", padding:"28px 32px" }}>
          <h1 style={{ fontSize:17, fontWeight:600, marginBottom:6 }}>{t("resetTitle")}</h1>

          {success ? (
            <>
              <div style={{ background:"rgba(46,168,76,0.1)", border:"1px solid rgba(46,168,76,0.3)", borderRadius:"var(--r)", padding:"14px 16px", marginTop:16, marginBottom:16, color:"var(--green)", fontSize:13, lineHeight:1.6 }}>
                {t("resetSuccess")}
              </div>
              <button onClick={() => navigate("/login")} style={{ width:"100%", padding:11, borderRadius:"var(--r)", border:"none", background:"var(--accent)", color:"#000", fontWeight:700, fontSize:14, cursor:"pointer" }}>
                {t("resetGoToLogin")}
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize:12, color:"var(--text2)", marginBottom:22, lineHeight:1.6 }}>
                {t("resetSub")}
              </div>
              {error && <div style={{ background:"rgba(232,64,64,0.1)", border:"1px solid rgba(232,64,64,0.3)", borderRadius:"var(--r)", padding:"10px 14px", marginBottom:16, color:"var(--red)", fontSize:13 }}>{error}</div>}
              <form onSubmit={submit}>
                {[
                  { key:"password", label: t("resetPassword"), value: password, setter: setPassword, minLength:10 },
                  { key:"confirm",  label: t("resetConfirm"),  value: confirm,  setter: setConfirm },
                ].map(f => (
                  <div key={f.key} style={{ marginBottom:16 }}>
                    <label style={{ display:"block", fontSize:11, fontWeight:600, color:"var(--text2)", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:5 }}>{f.label}</label>
                    <input type="password" value={f.value} minLength={f.minLength} required
                      onChange={e => f.setter(e.target.value)}
                      style={{ width:"100%", padding:"10px 13px", borderRadius:"var(--r)", border:"1px solid var(--border2)", background:"var(--bg3)", color:"var(--text)", fontSize:13, outline:"none" }}
                      onFocus={e => e.target.style.borderColor="var(--accent)"}
                      onBlur={e  => e.target.style.borderColor="var(--border2)"}
                    />
                  </div>
                ))}
                <button type="submit" disabled={loading} style={{ width:"100%", padding:11, borderRadius:"var(--r)", border:"none", background:"var(--accent)", color:"#000", fontWeight:700, fontSize:14, cursor:loading?"not-allowed":"pointer", opacity:loading?0.7:1 }}>
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
