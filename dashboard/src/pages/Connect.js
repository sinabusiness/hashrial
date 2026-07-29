import React, { useState, useEffect } from "react";
import { api } from "../lib/api";
import { useLang } from "../i18n";

/* Stratum connection instructions. Styling comes from the design system in
   index.css — see the HASHRIAL DESIGN SYSTEM block.

   Everything a miner has to type into its config panel (host, worker, password,
   sub-account) is a technical identifier, so it renders .num: mono, tabular and
   bidi-isolated. Without the isolation a stratum URL inside Persian copy gets
   reordered by the bidi algorithm and is no longer correct when copied.

   No status colour on this page — nothing here is a worker state. The accent
   tint and the hardcoded rgba(76,175,80,…) panel that used to open the page are
   gone; the fee note is a neutral alert and the pool identity is a plain panel. */

function CopyBox({ label, value }) {
  const [copied, setCopied] = useState(false);
  function copy() { navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", gap: 8 }}>
        <div className="num" style={{
          flex: 1, minWidth: 0, background: "var(--bg3)", border: "1px solid var(--border)",
          borderRadius: "var(--r)", padding: "9px 13px", fontSize: 12.5, color: "var(--text)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{value}</div>
        {/* Confirmation borrows the .alert-ok pairing (strong token for text,
            weak for fill) so it holds contrast in the light theme too. */}
        <button
          className="btn btn-ghost"
          onClick={copy}
          aria-live="polite"
          style={{
            flex: "0 0 auto", padding: "8px 14px", fontSize: 12,
            ...(copied ? { color: "var(--green)", background: "var(--green-weak)", borderColor: "var(--green-weak)" } : null),
          }}
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export default function Connect() {
  const { t } = useLang();
  const [info, setInfo] = useState(null);
  const [workerName, setWorkerName] = useState("rig01");

  useEffect(() => { api.connectInfo().then(setInfo).catch(console.error); }, []);
  if (!info) return <div className="page"><div className="empty">{t("loading")}</div></div>;

  // info.username is "mainSub.username.WORKER_NAME" — replace last segment with typed worker name
  const parts = info.username?.split(".") || [];
  const baseParts = parts.slice(0, -1);
  const username = `${baseParts.join(".")}.${workerName || "WORKER_NAME"}`;

  const MINERS = [
    { name: "Antminer (Bitmain)",   path: "Miner → Configuration → Pool Configuration" },
    { name: "WhatsMiner (MicroBT)", path: "Miner Management → Pool Settings" },
    { name: "Avalon (Canaan)",      path: "Network → Pool Configuration → Pool 1" },
    { name: "CGMiner / BFGMiner",   path: "--url <stratum> --user <user> --pass x", mono: true },
  ];

  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t("connectTitle")}</h1>
          <div className="page-sub">{t("connectIntro")}</div>
        </div>
      </div>

      <div className="alert" style={{ color: "var(--text2)" }}>{t("poolFee")}</div>

      {info.poolName && (
        <div className="panel panel-pad" style={{ marginBottom: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>{info.poolName}</div>
          <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>
            Your mining sub-account:{" "}
            <span className="num" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>
              {info.antpoolSubAccount}
            </span>
          </div>
        </div>
      )}

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-head">
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>Step 1</div>
            <div className="panel-title">{t("workerLabel")}</div>
          </div>
        </div>
        <div className="panel-pad">
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <input
              className="num"
              value={workerName}
              onChange={e => setWorkerName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
              placeholder={t("workerExample")}
              aria-label={t("workerLabel")}
              style={{
                width: 200, padding: "9px 13px", borderRadius: "var(--r)",
                border: "1px solid var(--border2)", background: "var(--bg3)",
                color: "var(--text)", fontSize: 13,
              }}
            />
            <span className="meta">Letters, numbers, underscore, dash</span>
          </div>
        </div>
      </div>

      {/* The focal point: the three values that go into the miner. */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-head">
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>Step 2</div>
            <div className="panel-title">Pool settings</div>
          </div>
        </div>
        <div className="panel-pad">
          <CopyBox label={t("stratumHost")} value={info.stratum} />
          <CopyBox label={t("workerLabel")} value={username} />
          <CopyBox label={t("loginPassword")} value="x" />
          <div className="meta" style={{ marginTop: 8 }}>{info.note}</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>Step 3</div>
            <div className="panel-title">Configure your miner</div>
          </div>
        </div>
        <div className="panel-pad">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
            {MINERS.map(m => (
              <div key={m.name} style={{
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: "var(--r)", padding: "12px 14px",
              }}>
                <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 4 }}>{m.name}</div>
                <div className={m.mono ? "meta num" : "meta"}>{m.path}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
