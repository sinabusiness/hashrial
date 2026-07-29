import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useLang } from "../i18n";

/* Sign-in card. Styling comes entirely from the design system in index.css —
   the same .panel / .btn / .alert / type classes the dashboard pages use, so
   the surface, border, radius and status literals that used to be duplicated
   here are gone.

   Two RTL details: the credential fields carry dir="ltr" (an email address
   inside a Persian page otherwise has its parts reordered by the bidi
   algorithm), and every offset below is a logical property, so the forgot-
   password link sits on the trailing edge in both directions. */

export default function Login() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email:"", password:"" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const { token } = await api.login(form.email, form.password);
      localStorage.setItem("hashrial_token", token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || t("loginFailed"));
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div aria-hidden="true" style={{ width:48, height:48, borderRadius:"var(--r2)", background:"var(--accent)", display:"inline-flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:22, color:"#000", marginBottom:10 }}>H</div>
          <div style={{ fontSize:22, fontWeight:700 }}>Hashrial</div>
          <div className="meta" style={{ marginTop:3 }}>Bitcoin Mining Pool</div>
        </div>

        <div className="panel panel-pad">
          <h1 className="page-title" style={{ marginBottom:20 }}>{t("loginTitle")}</h1>

          {error && <div className="alert alert-bad" role="alert">{error}</div>}

          <form onSubmit={submit}>
            {[
              { key:"email",    label: t("loginEmail"),    type:"email",    placeholder:"you@example.com" },
              { key:"password", label: t("loginPassword"), type:"password", placeholder:"Your password" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom:16 }}>
                <label className="eyebrow" htmlFor={`login-${f.key}`} style={{ display:"block", marginBottom:6 }}>{f.label}</label>
                <input id={`login-${f.key}`} type={f.type} placeholder={f.placeholder} value={form[f.key]} required
                  dir="ltr"
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width:"100%", padding:"10px 13px", borderRadius:"var(--r)", border:"1px solid var(--border2)", background:"var(--bg3)", color:"var(--text)", fontSize:13, textAlign:"start" }}
                />
              </div>
            ))}

            <div style={{ textAlign:"end", marginTop:-6, marginBottom:18 }}>
              <Link className="btn-link" to="/forgot-password">{t("loginForgotPassword")}</Link>
            </div>

            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width:"100%" }}>
              {loading ? t("signingIn") : t("loginBtn")}
            </button>
          </form>

          <div className="page-sub" style={{ textAlign:"center", marginTop:18 }}>
            {t("loginNoAccount")} <Link className="btn-link" to="/register">{t("loginCreateOne")}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
