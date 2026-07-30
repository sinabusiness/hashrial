import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useLang } from "../i18n";

/* Registration card + the post-submit "check your email" step. Both states now
   share Login.js's scaffold exactly: centred .hr-brand mark, one .panel
   .panel-pad card, .page-title / .page-sub for the heading pair, .btn
   .btn-primary full-width for the single action.

   The literals that used to live here are gone: borderRadius:12 on the logo is
   var(--r2), the card's own background/border/radius/padding is .panel
   .panel-pad, and the hand-rolled rgba(232,64,64,…) error box — a red that
   matched no token in either theme — is .alert .alert-bad.

   RTL: the address the user just typed and the cooldown counter are .num, so
   the bidi algorithm cannot reorder their parts inside a Persian sentence, and
   the inputs carry dir="ltr" for the same reason. */

export default function Register() {
  const { t } = useLang();
  const navigate = useNavigate();
  // Referral attribution rides on the signup call. An unknown or
  // self-referential code is ignored server-side, never blocking signup.
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref") || "";
  const [form, setForm] = useState({ username:"", email:"", password:"" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  // The backend reports whether a sender is even configured. Without this the
  // page said "check your email" regardless — which is what happened when no
  // email could physically be sent, leaving people waiting for nothing.
  const [emailSent, setEmailSent] = useState(true);
  const [resendState, setResendState] = useState("idle"); // idle | sending | sent | error
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) {
      // Returning to "idle" is what makes the cooldown mean anything. The
      // success alert used to replace the button permanently, so once the 60s
      // elapsed the user still could not resend — even though the backend
      // allows 3/hour — and the timer kept counting down behind an alert
      // nobody could act on.
      if (resendState === "sent") setResendState("idle");
      return;
    }
    const id = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown, resendState]);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (form.password.length < 10) { setError(t("registerPasswordError")); return; }
    setLoading(true);
    try {
      const res = await api.register(form.username, form.email, form.password, refCode);
      localStorage.setItem("hashrial_token", res.token);
      setEmailSent(res.emailSent !== false);
      // Show a check-your-email step rather than redirecting silently —
      // a verification email is actually sent now, so the user should know
      // to expect it instead of finding it in spam days later.
      setRegistered(true);
    } catch (err) {
      setError(err.message || t("registerFailed"));
    } finally { setLoading(false); }
  }

  async function resend() {
    if (cooldown > 0 || resendState === "sending") return;
    setResendState("sending");
    try {
      await api.resendVerification(form.email);
      setResendState("sent");
      // The endpoint allows 3/hour; this keeps the button from inviting
      // people to burn that allowance in a few seconds.
      setCooldown(60);
    } catch {
      setResendState("error");
    }
  }

  if (registered) {
    const resendDisabled = cooldown > 0 || resendState === "sending";
    return (
      <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
        <div style={{ width:"100%", maxWidth:400 }}>
          {/* Brand mark, state 1 of 2 — the only route back to the marketing
              site from this screen. It wraps the logo and the wordmark. */}
          <div style={{ textAlign:"center", marginBottom:32 }}>
            <Link to="/" className="hr-brand" title={t("backToHome")}>
              <div aria-hidden="true" style={{ width:48, height:48, borderRadius:"var(--r2)", background:"var(--accent)", display:"inline-flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:22, color:"#000", marginBottom:10 }}>H</div>
              <div style={{ fontSize:22, fontWeight:700 }}>Hashrial</div>
            </Link>
            <div className="meta" style={{ marginTop:3 }}>Bitcoin Mining Pool</div>
          </div>

          <div className="panel panel-pad" style={{ textAlign:"center" }}>
            <div aria-hidden="true" style={{ fontSize:28, marginBottom:12 }}>{emailSent ? "✉" : "⚠"}</div>
            <h1 className="page-title">
              {emailSent ? t("registerCheckEmailTitle") : t("registerEmailUnavailableTitle")}
            </h1>
            <div className="page-sub" style={{ marginBottom:emailSent ? 10 : 20 }}>
              {emailSent ? t("registerCheckEmailSub") : t("registerEmailUnavailableSub")}
            </div>

            {emailSent && (
              <>
                {/* .num already carries direction:ltr + unicode-bidi:isolate, so
                    the address keeps its shape inside a Persian sentence.
                    --text-bright is reserved for money, so this stays --text. */}
                <div className="num" style={{ fontSize:13, fontWeight:600, color:"var(--text)", marginBottom:12 }}>
                  {form.email}
                </div>
                <div className="meta" style={{ marginBottom:16 }}>
                  {t("registerCheckSpam")}
                </div>

                <div style={{ marginBottom:18 }}>
                  {resendState === "sent" ? (
                    <div className="alert alert-ok" role="status" style={{ marginBottom:0 }}>{t("registerResendSent")}</div>
                  ) : (
                    <button
                      type="button"
                      className="btn-link"
                      onClick={resend}
                      disabled={resendDisabled}
                      style={{ color: resendDisabled ? "var(--text3)" : undefined, cursor: resendDisabled ? "default" : "pointer" }}
                    >
                      {resendState === "sending"
                        ? t("registerResending")
                        : cooldown > 0
                          ? <>{t("registerResendWait")} (<span className="num">{cooldown}s</span>)</>
                          : t("registerResendLink")}
                    </button>
                  )}
                  {resendState === "error" && (
                    <div className="alert alert-bad" role="alert" style={{ marginTop:10, marginBottom:0 }}>{t("registerResendFailed")}</div>
                  )}
                </div>
              </>
            )}

            <button className="btn btn-primary" type="button" onClick={() => navigate("/dashboard/connect")} style={{ width:"100%" }}>
              {t("registerContinueToDashboard")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ width:"100%", maxWidth:400 }}>
        {/* Brand mark, state 2 of 2 — same link, same wrapping. */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <Link to="/" className="hr-brand" title={t("backToHome")}>
            <div aria-hidden="true" style={{ width:48, height:48, borderRadius:"var(--r2)", background:"var(--accent)", display:"inline-flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:22, color:"#000", marginBottom:10 }}>H</div>
            <div style={{ fontSize:22, fontWeight:700 }}>Hashrial</div>
          </Link>
          <div className="meta" style={{ marginTop:3 }}>Bitcoin Mining Pool</div>
        </div>

        <div className="panel panel-pad">
          <h1 className="page-title">{t("registerTitle")}</h1>
          <div className="page-sub" style={{ marginBottom:20 }}>{t("registerSub")}</div>

          {error && <div className="alert alert-bad" role="alert">{error}</div>}

          <form onSubmit={submit}>
            {[
              { key:"username", label: t("registerUsername"), type:"text",     placeholder:"e.g. ali_miner",     hint: t("registerUsernameHint") },
              { key:"email",    label: t("registerEmail"),    type:"email",    placeholder:"you@example.com" },
              { key:"password", label: t("registerPassword"), type:"password", placeholder: t("registerPasswordHint"), minLength:10 },
            ].map(f => (
              <div key={f.key} style={{ marginBottom:16 }}>
                <label className="eyebrow" htmlFor={`register-${f.key}`} style={{ display:"block", marginBottom:6 }}>{f.label}</label>
                <input id={`register-${f.key}`} type={f.type} placeholder={f.placeholder} value={form[f.key]} minLength={f.minLength} required
                  dir="ltr"
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width:"100%", padding:"10px 13px", borderRadius:"var(--r)", border:"1px solid var(--border2)", background:"var(--bg3)", color:"var(--text)", fontSize:13, textAlign:"start" }}
                />
                {f.hint && <div className="meta" style={{ marginTop:4 }}>{f.hint}</div>}
              </div>
            ))}

            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width:"100%", marginTop:2 }}>
              {loading ? t("creatingAccount") : t("registerBtn")}
            </button>
          </form>

          <div className="page-sub" style={{ textAlign:"center", marginTop:18 }}>
            {t("registerHasAccount")} <Link className="btn-link" to="/login">{t("registerSignIn")}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
