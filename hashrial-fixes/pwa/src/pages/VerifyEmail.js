import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useLang } from "../i18n";

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
          <div style={{ width:48, height:48, borderRadius:12, background:"var(--accent)", display:"inline-flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:22, color:"#000", marginBottom:10 }}>H</div>
          <div style={{ fontSize:22, fontWeight:700 }}>Hashrial</div>
        </div>
        <div style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:"var(--r2)", padding:"28px 32px", textAlign:"center" }}>
          {status === "verifying" && (
            <>
              <div style={{ fontSize:28, marginBottom:14 }}>⏳</div>
              <div style={{ fontSize:14, color:"var(--text2)" }}>{t("verifyTitle")}</div>
            </>
          )}
          {status === "success" && (
            <>
              <div style={{ fontSize:28, marginBottom:14 }}>✓</div>
              <h1 style={{ fontSize:17, fontWeight:600, marginBottom:6, color:"var(--green)" }}>{t("verifySuccess")}</h1>
              <div style={{ fontSize:13, color:"var(--text2)", marginBottom:20 }}>{t("verifySuccessSub")}</div>
              <Link to={isLoggedIn ? "/dashboard" : "/login"} style={{
                display:"inline-block", padding:"11px 24px", borderRadius:"var(--r)",
                background:"var(--accent)", color:"#000", fontWeight:700, fontSize:14, textDecoration:"none",
              }}>
                {isLoggedIn ? t("verifyGoToDashboard") : t("verifyGoToLogin")}
              </Link>
            </>
          )}
          {status === "failed" && (
            <>
              <div style={{ fontSize:28, marginBottom:14 }}>✗</div>
              <div style={{ fontSize:13, color:"var(--red)", marginBottom:20 }}>{t("verifyFailed")}</div>
              <Link to="/login" style={{ color:"var(--accent)", fontWeight:500, fontSize:13 }}>{t("verifyGoToLogin")}</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
