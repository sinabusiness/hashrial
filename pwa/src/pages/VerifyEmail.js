import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useLang } from "../i18n";

/* Email-verification result card. Same scaffold as Login — centred brand mark
   over one .panel — so the two pages read as one product.

   This page is almost entirely status, so it leans on the design system's
   feedback primitives instead of its own literals: .empty for the pending
   state (the pattern Workers/Notifications already use for "nothing to show
   yet"), .alert-ok / .alert-bad for the two outcomes. That removes the
   hardcoded surface/border/radius trio and the raw var(--green) / var(--red)
   text colours, which were painting status onto a heading rather than into a
   status surface.

   Everything positional is a logical property and all glyphs are aria-hidden,
   so the state is announced from the text (role=status / role=alert) rather
   than from a decorative tick. */

export default function VerifyEmail() {
  const { t } = useLang();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState("verifying"); // verifying | success | failed
  const isLoggedIn = !!localStorage.getItem("hashrial_token");

  useEffect(() => {
    if (!token) { setStatus("failed"); return; }
    api.verifyEmail(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("failed"));
  }, [token]);

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

        <div className="panel">
          {status === "verifying" && (
            <div className="empty" role="status">
              <div aria-hidden="true" style={{ fontSize:26, marginBottom:8 }}>⏳</div>
              {t("verifyTitle")}
            </div>
          )}

          {status === "success" && (
            <div className="panel-pad" style={{ textAlign:"center" }}>
              <div aria-hidden="true" style={{ fontSize:26, marginBottom:10 }}>✓</div>
              <h1 className="page-title" style={{ marginBottom:14 }}>{t("verifySuccess")}</h1>
              <div className="alert alert-ok" role="status">{t("verifySuccessSub")}</div>
              <Link className="btn btn-primary" to={isLoggedIn ? "/dashboard" : "/login"}
                style={{ display:"block", textAlign:"center" }}>
                {isLoggedIn ? t("verifyGoToDashboard") : t("verifyGoToLogin")}
              </Link>
            </div>
          )}

          {status === "failed" && (
            <div className="panel-pad" style={{ textAlign:"center" }}>
              <div aria-hidden="true" style={{ fontSize:26, marginBottom:10 }}>✗</div>
              <div className="alert alert-bad" role="alert">{t("verifyFailed")}</div>
              <Link className="btn-link" to="/login">{t("verifyGoToLogin")}</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
