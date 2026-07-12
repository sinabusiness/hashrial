import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useLang } from "../i18n";

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
          <div style={{ width:48, height:48, borderRadius:12, background:"var(--accent)", display:"inline-flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:22, color:"#000", marginBottom:10 }}>H</div>
          <div style={{ fontSize:22, fontWeight:700 }}>Hashrial</div>
          <div style={{ fontSize:12, color:"var(--text2)", marginTop:3 }}>Bitcoin Mining Pool</div>
        </div>
        <div style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:"var(--r2)", padding:"28px 32px" }}>
          <h1 style={{ fontSize:17, fontWeight:600, marginBottom:6 }}>{t("forgotTitle")}</h1>

          {sent ? (
            <>
              <div style={{ background:"rgba(46,168,76,0.1)", border:"1px solid rgba(46,168,76,0.3)", borderRadius:"var(--r)", padding:"14px 16px", marginTop:16, marginBottom:16, color:"var(--green)", fontSize:13, lineHeight:1.6 }}>
                {t("forgotSent")}
              </div>
              <div style={{ textAlign:"center" }}>
                <Link to="/login" style={{ color:"var(--accent)", fontWeight:500, fontSize:13 }}>{t("forgotBackToLogin")} →</Link>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize:12, color:"var(--text2)", marginBottom:22, lineHeight:1.6 }}>
                {t("forgotSub")}
              </div>
              {error && <div style={{ background:"rgba(232,64,64,0.1)", border:"1px solid rgba(232,64,64,0.3)", borderRadius:"var(--r)", padding:"10px 14px", marginBottom:16, color:"var(--red)", fontSize:13 }}>{error}</div>}
              <form onSubmit={submit}>
                <div style={{ marginBottom:16 }}>
                  <label style={{ display:"block", fontSize:11, fontWeight:600, color:"var(--text2)", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:5 }}>{t("forgotEmail")}</label>
                  <input type="email" placeholder="you@example.com" value={email} required
                    onChange={e => setEmail(e.target.value)}
                    style={{ width:"100%", padding:"10px 13px", borderRadius:"var(--r)", border:"1px solid var(--border2)", background:"var(--bg3)", color:"var(--text)", fontSize:13, outline:"none", transition:"border-color .15s" }}
                    onFocus={e => e.target.style.borderColor="var(--accent)"}
                    onBlur={e  => e.target.style.borderColor="var(--border2)"}
                  />
                </div>
                <button type="submit" disabled={loading} style={{ width:"100%", padding:11, borderRadius:"var(--r)", border:"none", background:"var(--accent)", color:"#000", fontWeight:700, fontSize:14, cursor:loading?"not-allowed":"pointer", opacity:loading?0.7:1 }}>
                  {loading ? t("forgotSending") : t("forgotBtn")}
                </button>
              </form>
              <div style={{ textAlign:"center", marginTop:18, fontSize:12.5, color:"var(--text2)" }}>
                <Link to="/login" style={{ color:"var(--accent)", fontWeight:500 }}>{t("forgotBackToLogin")} →</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
