import React, { useState, useEffect } from "react";
import { api } from "../lib/api";
import { useLang } from "../i18n";

/* Earnings + payouts. Styling from the design system in index.css.

   Money renders in --text-bright, not --accent. Orange means hashrate and only
   hashrate; when it also meant money, links and active tabs it meant nothing.
   Status colours here describe payout STATE, which is the one other job those
   tokens have. */

function fmtBTC(val) { return parseFloat(val || 0).toFixed(8); }

export default function Earnings() {
  const { t } = useLang();
  const [earnings, setEarnings] = useState({ rows:[], total:0 });
  const [overview, setOverview] = useState(null);
  const [payouts, setPayouts]   = useState([]);
  const [btcPrice, setBtcPrice] = useState(null);
  const [page, setPage]         = useState(1);
  const [requesting, setRequesting] = useState(false);
  const [payoutMsg, setPayoutMsg]   = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.earnings(page), api.overview(), api.payoutHistory(), api.btcPrice()])
      .then(([e, ov, py, btc]) => {
        setEarnings(e);
        setOverview(ov);
        setPayouts(py || []);
        setBtcPrice(btc);
      }).catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  const earn = overview?.earnings || {};
  const usd  = (btc) => btcPrice?.price
    ? `≈ $${(parseFloat(btc||0)*btcPrice.price).toLocaleString("en-US",{maximumFractionDigits:2})}`
    : "";

  function requestPayout() {
    const bal = parseFloat(earn.balance || 0);
    if (!window.confirm(`${t("requestPayout")}: ${fmtBTC(bal)} BTC?`)) return;
    setRequesting(true);
    setPayoutMsg(null);
    api.requestPayout()
      .then(r => setPayoutMsg({ ok:true, msg:`${fmtBTC(r.amount)} BTC → ${r.address}` }))
      .catch(e => setPayoutMsg({ ok:false, msg: e.message }))
      .finally(() => setRequesting(false));
  }

  const payoutPill = (status) =>
    status === "completed" ? "pill-ok" : status === "failed" ? "pill-bad" : "pill-warn";

  return (
    <div className="page" style={{ maxWidth: 1100 }}>
      <div className="page-head">
        <h1 className="page-title">{t("earningsTitle")}</h1>
      </div>

      {/* Balance is the one figure that matters here, so it gets the hero and
          the rest become supporting metrics rather than four equal cards. */}
      <div className="panel panel-pad" style={{ marginBottom: 16 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>{t("balance2")}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <span className="num" style={{ fontSize: 34, fontWeight: 700, color: "var(--text-bright)", lineHeight: 1 }}>
            {fmtBTC(earn.balance)}
            <span style={{ fontSize: 16, fontWeight: 500, color: "var(--text2)", marginInlineStart: 7 }}>BTC</span>
          </span>
          {usd(earn.balance) && <span className="num" style={{ fontSize: 14, color: "var(--text2)" }}>{usd(earn.balance)}</span>}
        </div>

        <div className="metric-row" style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
          <div className="metric">
            <div className="metric-label">{t("earn24h")}</div>
            <div className="metric-value" style={{ color: "var(--green)" }}>{fmtBTC(earn.earn24h)}</div>
          </div>
          <div className="metric">
            <div className="metric-label">{t("earnTotal")}</div>
            <div className="metric-value">{fmtBTC(earn.earnTotal)}</div>
          </div>
          <div className="metric metric-last">
            <div className="metric-label">{t("paidOut")}</div>
            <div className="metric-value" style={{ color: "var(--text2)" }}>{fmtBTC(earn.paidOut)}</div>
          </div>
        </div>

        <div className="meta" style={{ marginTop: 14 }}>{t("poolFeeNote")}</div>
      </div>

      {/* Payout request */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-head"><div className="panel-title">{t("requestPayout")}</div></div>
        <div className="panel-pad">
          <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 12, lineHeight: 1.6 }}>
            {t("payoutMinNote")}
          </div>
          {payoutMsg && (
            <div className={`alert ${payoutMsg.ok ? "alert-ok" : "alert-bad"}`}>
              <span className={payoutMsg.ok ? "num" : undefined}>{payoutMsg.msg}</span>
            </div>
          )}
          <button className="btn btn-primary" onClick={requestPayout} disabled={requesting}>
            {requesting ? t("submitting") + "…" : t("requestPayout")}
          </button>
        </div>
      </div>

      {/* Payout history */}
      {payouts.length > 0 && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-head"><div className="panel-title">{t("payoutHistory")}</div></div>
          <div className="tbl-scroll">
            <table className="tbl">
              <thead>
                <tr>{["date","amount","address","status","txid"].map(k => <th key={k}>{t(k)}</th>)}</tr>
              </thead>
              <tbody>
                {payouts.map(p => (
                  <tr key={p.id}>
                    <td className="num" style={{ color: "var(--text2)" }}>{new Date(p.requested_at).toLocaleDateString()}</td>
                    <td className="num" style={{ color: "var(--text-bright)", fontWeight: 600 }}>{fmtBTC(p.amount_btc)}</td>
                    <td className="num" style={{ color: "var(--text2)", maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis" }}>{p.address}</td>
                    <td><span className={`pill ${payoutPill(p.status)}`}>{t(p.status)}</span></td>
                    <td className="num" style={{ color: "var(--text3)" }}>{p.txid ? `${p.txid.slice(0,12)}…` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Earnings history */}
      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">{t("earningsHistory")}</div>
          <span className="meta"><span className="num">{earnings.total || 0}</span> {t("records")}</span>
        </div>
        {loading ? (
          <div className="empty">{t("loading2")}</div>
        ) : earnings.rows.length === 0 ? (
          <div className="empty">{t("noEarnings")}</div>
        ) : (
          <>
            <div className="tbl-scroll">
              <table className="tbl">
                <thead>
                  <tr>{["date","balance2","earn24h","earnTotal","paidOut"].map(k => <th key={k}>{t(k)}</th>)}</tr>
                </thead>
                <tbody>
                  {earnings.rows.map((r,i) => (
                    <tr key={i}>
                      <td className="num" style={{ color: "var(--text2)" }}>{r.settle_date || new Date(r.ts).toLocaleDateString()}</td>
                      <td className="num" style={{ color: "var(--text-bright)" }}>{fmtBTC(r.balance)}</td>
                      <td className="num" style={{ color: "var(--green)" }}>{fmtBTC(r.earn_24h)}</td>
                      <td className="num">{fmtBTC(r.earn_total)}</td>
                      <td className="num" style={{ color: "var(--text2)" }}>{fmtBTC(r.paid_out)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "12px 22px", display: "flex", gap: 8, justifyContent: "flex-end",
                          alignItems: "center", borderTop: "1px solid var(--border)" }}>
              {page > 1 && <button className="btn btn-ghost" style={{ padding: "5px 12px", fontSize: 12 }} onClick={() => setPage(p=>p-1)}>{t("prev")}</button>}
              <span className="meta">{t("page")} <span className="num">{page}</span></span>
              {earnings.total > page * 20 && <button className="btn btn-ghost" style={{ padding: "5px 12px", fontSize: 12 }} onClick={() => setPage(p=>p+1)}>{t("next")}</button>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
