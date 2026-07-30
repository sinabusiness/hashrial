import React, { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { useLang } from "../i18n";

/* Referral programme.

   A referrer receives half of the 2% fee taken from people they bring in — 1%
   of those users' gross. The referred user still pays 2% and still keeps 98%,
   so this splits revenue Hashrial already collects rather than charging anyone
   more. The page says that plainly: a referral programme people suspect of
   costing their friends money does not get shared.

   Rewards are summed from immutable ledger rows, so every figure here can be
   traced back to the individual credits behind it. */

function fmtBTC(v) { return parseFloat(v || 0).toFixed(8); }

export default function Referral() {
  const { t } = useLang();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [copied, setCopied]   = useState(false);

  const load = useCallback(() => api.referralStats()
    .then(d => { setData(d); setError(null); })
    .catch(e => setError(e.message)), []);

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  const link = data?.code ? `${window.location.origin}/register?ref=${data.code}` : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // Clipboard API needs a secure context and permission; a selectable
      // input is the fallback rather than a silent no-op.
      const el = document.getElementById("ref-link");
      if (el) { el.select(); document.execCommand("copy"); setCopied(true); }
    }
  }

  if (loading) return <div className="page"><div className="empty">{t("loading2")}</div></div>;

  return (
    <div className="page" style={{ maxWidth: 1100 }}>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t("referralTitle")}</h1>
          <div className="page-sub">{t("referralSub")}</div>
        </div>
      </div>

      {error && <div className="alert alert-bad" role="alert">{error}</div>}

      {/* The link is the product. It gets the hero. */}
      <div className="panel panel-pad" style={{ marginBottom: 16 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>{t("referralYourLink")}</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            id="ref-link"
            className="num"
            readOnly
            value={link}
            dir="ltr"
            onFocus={(e) => e.target.select()}
            aria-label={t("referralYourLink")}
            style={{
              flex: "1 1 320px", minWidth: 0, fontSize: 13, padding: "10px 12px",
              background: "var(--bg3)", color: "var(--text)",
              border: "1px solid var(--border)", borderRadius: "var(--r)",
            }}
          />
          <button className="btn btn-primary" onClick={copy} style={{ whiteSpace: "nowrap" }}>
            {copied ? t("referralCopied") : t("referralCopy")}
          </button>
        </div>
        <div className="meta" style={{ marginTop: 10 }}>
          {t("referralCodeIs")} <span className="num" style={{ color: "var(--text2)", fontWeight: 600 }}>{data?.code || "—"}</span>
        </div>
      </div>

      <div className="hr-split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="panel panel-pad">
          <div className="eyebrow" style={{ marginBottom: 8 }}>{t("referralEarned")}</div>
          {/* Money is --text-bright; accent means hashrate and nothing else. */}
          <div className="display display-md" style={{ color: "var(--text-bright)" }}>
            {fmtBTC(data?.totalReward)}
            <span className="display-unit" style={{ fontSize: 15 }}>BTC</span>
          </div>
          <div className="metric-row" style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            <div className="metric">
              <div className="metric-label">{t("referralLast30")}</div>
              <div className="metric-value">{fmtBTC(data?.last30Reward)}</div>
            </div>
            <div className="metric metric-last">
              <div className="metric-label">{t("referralRate")}</div>
              <div className="metric-value" style={{ color: "var(--green)" }}>1%</div>
            </div>
          </div>
        </div>

        <div className="panel panel-pad">
          <div className="eyebrow" style={{ marginBottom: 8 }}>{t("referralPeople")}</div>
          <div className="display display-md" style={{ color: "var(--text-bright)" }}>
            {data?.activeCount ?? 0}
            <span className="display-unit" style={{ fontSize: 15 }}>/ {data?.referredCount ?? 0}</span>
          </div>
          {/* An account that has not verified its email cannot mine, so counting
              it as a converted referral would overstate the number. */}
          <div className="meta" style={{ marginTop: 12, lineHeight: 1.6 }}>{t("referralActiveNote")}</div>
        </div>
      </div>

      <div className="panel panel-pad" style={{ marginBottom: 16 }}>
        <div className="panel-title" style={{ marginBottom: 10 }}>{t("referralHowTitle")}</div>
        <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.75 }}>{t("referralHowBody")}</div>
      </div>

      <div className="panel">
        <div className="panel-head"><div className="panel-title">{t("referralYourPeople")}</div></div>
        {!data?.referred?.length ? (
          <div className="empty">{t("referralNobodyYet")}</div>
        ) : (
          <div className="tbl-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("referralUser")}</th>
                  <th>{t("referralJoined")}</th>
                  <th>{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {data.referred.map((r, i) => (
                  <tr key={i}>
                    <td className="num" style={{ fontWeight: 500 }}>{r.username}</td>
                    <td className="num" style={{ color: "var(--text2)" }}>
                      {r.joinedAt ? new Date(r.joinedAt).toLocaleDateString() : "—"}
                    </td>
                    <td>
                      <span className={`pill ${r.verified ? "pill-ok" : "pill-idle"}`}>
                        {r.verified ? t("referralActive") : t("referralPendingVerify")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
