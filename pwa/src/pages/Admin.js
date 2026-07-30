import React, { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { useLang } from "../i18n";
import blogData from "../blog-data.json";

/* Admin. Every endpoint behind this re-checks ADMIN_USER_IDS server-side —
   hiding the nav item is a convenience, never the control. A non-admin who
   navigates here directly gets 403s from the API and an empty page.

   Articles live as markdown in the repo, not in a database, so this lists them
   and shows what is still draft. Publishing is a file edit plus a deploy by
   design: git history is the audit trail for what was published and when, and
   an article that can be published from a web form is an article that can be
   published without anyone reading the fact-check list. */

const DRAFTS = (blogData && blogData.drafts) || [];
const PUBLISHED = (blogData && blogData.posts) || [];

function fmtBTC(v) { return parseFloat(v || 0).toFixed(8); }

function Stat({ label, value, sub, color }) {
  return (
    <div className="panel panel-pad">
      <div className="eyebrow" style={{ marginBottom: 8 }}>{label}</div>
      <div className="display display-md" style={{ color: color || "var(--text-bright)" }}>{value}</div>
      {sub && <div className="meta" style={{ marginTop: 8 }}>{sub}</div>}
    </div>
  );
}

export default function Admin() {
  const { t } = useLang();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [busy, setBusy]       = useState(null);

  const load = useCallback(() => api.adminOverview()
    .then(d => { setData(d); setError(null); })
    .catch(e => setError(e.message)), []);

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);

  async function setPayoutStatus(id, status) {
    // A payout moving to completed is real money leaving. Confirm explicitly
    // rather than letting a mis-click settle something.
    if (!window.confirm(`${t("adminConfirmStatus")} → ${status}?`)) return;
    setBusy(id);
    try {
      const txid = status === "completed" ? (window.prompt(t("adminTxidPrompt")) || "") : "";
      await api.adminSetPayoutStatus(id, status, txid);
      await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(null); }
  }

  if (loading) return <div className="page"><div className="empty">{t("loading2")}</div></div>;

  if (error) {
    return (
      <div className="page" style={{ maxWidth: 700 }}>
        <div className="alert alert-bad" role="alert">{error}</div>
        <div className="meta">{t("adminForbiddenHint")}</div>
      </div>
    );
  }

  const u = data?.users || {}, w = data?.workers || {}, p = data?.payouts || {}, r = data?.referrals || {};

  return (
    <div className="page" style={{ maxWidth: 1240 }}>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t("adminTitle")}</h1>
          <div className="page-sub">{t("adminSub")}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, marginBottom: 18 }}>
        <Stat label={t("adminUsers")} value={u.total ?? 0}
              sub={`${u.verified ?? 0} ${t("adminVerified")} · ${u.referred ?? 0} ${t("adminReferred")}`} />
        <Stat label={t("adminWorkers")} value={w.online ?? 0}
              sub={`${t("adminOf")} ${w.total ?? 0}`}
              color={(w.online ?? 0) > 0 ? "var(--green)" : "var(--text-bright)"} />
        <Stat label={t("adminPayoutsPending")} value={p.pending ?? 0}
              sub={`${fmtBTC(p.pendingBtc)} BTC`}
              color={(p.pending ?? 0) > 0 ? "var(--amber)" : "var(--text-bright)"} />
        <Stat label={t("adminReferralPaid")} value={fmtBTC(r.totalPaidBtc)}
              sub={`${r.credits ?? 0} ${t("adminCredits")}`} />
      </div>

      {/* Payouts first — it is the only thing here that needs acting on. */}
      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-head"><div className="panel-title">{t("adminPayouts")}</div></div>
        {!data?.recentPayouts?.length ? (
          <div className="empty">{t("adminNoPayouts")}</div>
        ) : (
          <div className="tbl-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("referralUser")}</th><th>{t("amount")}</th><th>{t("address")}</th>
                  <th>{t("status")}</th><th>{t("date")}</th><th></th>
                </tr>
              </thead>
              <tbody>
                {data.recentPayouts.map(x => (
                  <tr key={x.id}>
                    <td className="num" style={{ fontWeight: 500 }}>{x.username}</td>
                    <td className="num" style={{ color: "var(--text-bright)", fontWeight: 600 }}>{fmtBTC(x.amount)}</td>
                    <td className="num" style={{ color: "var(--text2)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>{x.address}</td>
                    <td>
                      <span className={`pill ${x.status === "completed" ? "pill-ok" : x.status === "failed" ? "pill-bad" : "pill-warn"}`}>
                        {t(x.status)}
                      </span>
                    </td>
                    <td className="num" style={{ color: "var(--text2)" }}>
                      {x.requestedAt ? new Date(x.requestedAt).toLocaleDateString() : "—"}
                    </td>
                    <td>
                      {x.status !== "completed" && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button className="btn-link" disabled={busy === x.id}
                                  onClick={() => setPayoutStatus(x.id, "completed")}>{t("adminMarkPaid")}</button>
                          <button className="btn-link" style={{ color: "var(--red)" }} disabled={busy === x.id}
                                  onClick={() => setPayoutStatus(x.id, "failed")}>{t("adminMarkFailed")}</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Articles — read-only on purpose, see the note at the top of this file. */}
      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <div className="panel-title">{t("adminArticles")}</div>
          <span className="meta">
            <span className="num">{PUBLISHED.length}</span> {t("adminPublished")} ·{" "}
            <span className="num">{DRAFTS.length}</span> {t("adminDrafts")}
          </span>
        </div>
        {!DRAFTS.length && !PUBLISHED.length ? (
          <div className="empty">{t("blogEmpty")}</div>
        ) : (
          <div className="tbl-scroll">
            <table className="tbl">
              <thead>
                <tr><th>{t("adminArticle")}</th><th>{t("language")}</th><th>{t("adminWords")}</th><th>{t("status")}</th></tr>
              </thead>
              <tbody>
                {[...PUBLISHED.map(a => ({ ...a, status: "published", words: null })), ...DRAFTS].map((a, i) => (
                  <tr key={i}>
                    <td dir={a.lang === "fa" ? "rtl" : "ltr"} style={{ maxWidth: 420 }}>{a.title}</td>
                    <td className="num" style={{ textTransform: "uppercase", color: "var(--text2)" }}>{a.lang}</td>
                    <td className="num" style={{ color: "var(--text2)" }}>{a.words ?? "—"}</td>
                    <td>
                      <span className={`pill ${a.status === "published" ? "pill-ok" : "pill-idle"}`}>{a.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="panel-pad meta" style={{ borderTop: "1px solid var(--border)" }}>
          {t("adminArticlesNote")}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><div className="panel-title">{t("adminRecentUsers")}</div></div>
        <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("referralUser")}</th><th>{t("registerEmail")}</th><th>{t("balance")}</th>
                <th>{t("adminReferredBy")}</th><th>{t("status")}</th><th>{t("referralJoined")}</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentUsers || []).map(x => (
                <tr key={x.id}>
                  <td className="num" style={{ fontWeight: 500 }}>{x.username}</td>
                  <td className="num" style={{ color: "var(--text2)" }}>{x.email}</td>
                  <td className="num" style={{ color: "var(--text-bright)" }}>{fmtBTC(x.balance)}</td>
                  <td className="num" style={{ color: "var(--text2)" }}>{x.referredBy || "—"}</td>
                  <td>
                    <span className={`pill ${x.verified ? "pill-ok" : "pill-idle"}`}>
                      {x.verified ? t("referralActive") : t("referralPendingVerify")}
                    </span>
                  </td>
                  <td className="num" style={{ color: "var(--text2)" }}>
                    {x.createdAt ? new Date(x.createdAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
