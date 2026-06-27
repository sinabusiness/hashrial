import React, { useState, useEffect } from "react";
import { api } from "../lib/api";
import { useLang } from "../i18n";

function CopyBox({ label, value }) {
  const [copied, setCopied] = useState(false);
  function copy() { navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:10.5, color:"var(--text2)", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:5, fontWeight:600 }}>{label}</div>
      <div style={{ display:"flex", gap:7 }}>
        <div style={{ flex:1, background:"var(--bg3)", border:"1px solid var(--border)", borderRadius:"var(--r)", padding:"9px 13px", fontFamily:"var(--mono)", fontSize:12, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{value}</div>
        <button onClick={copy} style={{ padding:"9px 14px", borderRadius:"var(--r)", border:"1px solid var(--border2)", background: copied?"rgba(46,168,76,0.1)":"var(--bg4)", color: copied?"var(--green)":"var(--text2)", fontSize:11, cursor:"pointer", flexShrink:0, transition:"all .15s" }}>
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
  if (!info) return <div style={{ padding:40, textAlign:"center", color:"var(--text2)" }}>{t("loading")}</div>;

  // info.username is "mainSub.username.WORKER_NAME" — replace last segment with typed worker name
  const parts = info.username?.split(".") || [];
  const baseParts = parts.slice(0, -1);
  const username = `${baseParts.join(".")}.${workerName || "WORKER_NAME"}`;

  return (
    <div style={{ padding:"24px 28px", maxWidth:780 }}>
      <h1 style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>{t("connectTitle")}</h1>
      <div style={{ color:"var(--text2)", fontSize:13, marginBottom:22 }}>{t("connectIntro")}</div>

      <div style={{ background:"rgba(247,147,26,0.06)", border:"1px solid rgba(247,147,26,0.18)", borderRadius:"var(--r2)", padding:"13px 16px", marginBottom:20, fontSize:13, color:"var(--text2)", lineHeight:1.7 }}>
        {t("poolFee")}
      </div>

      {info.poolName && (
        <div style={{ background:"rgba(76,175,80,0.06)", border:"1px solid rgba(76,175,80,0.18)", borderRadius:"var(--r2)", padding:"13px 16px", marginBottom:20, fontSize:13, color:"var(--green, #4caf50)", lineHeight:1.7 }}>
          <strong>{info.poolName}</strong> — Your mining sub-account: <code style={{ fontFamily:"var(--mono)", fontSize:12 }}>{info.antpoolSubAccount}</code>
        </div>
      )}

      <div style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:"var(--r2)", padding:"20px 22px", marginBottom:16 }}>
        <h2 style={{ fontSize:14, fontWeight:600, marginBottom:14 }}>Step 1 — {t("workerLabel")}</h2>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <input value={workerName} onChange={e => setWorkerName(e.target.value.replace(/[^a-zA-Z0-9_-]/g,""))}
            placeholder={t("workerExample")}
            style={{ padding:"9px 13px", borderRadius:"var(--r)", border:"1px solid var(--border2)", background:"var(--bg3)", color:"var(--text)", fontSize:13, fontFamily:"var(--mono)", width:200, outline:"none" }}
            onFocus={e=>e.target.style.borderColor="var(--accent)"} onBlur={e=>e.target.style.borderColor="var(--border2)"}
          />
          <span style={{ fontSize:12, color:"var(--text2)" }}>Letters, numbers, underscore, dash</span>
        </div>
      </div>

      <div style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:"var(--r2)", padding:"20px 22px", marginBottom:16 }}>
        <h2 style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Step 2 — Pool settings</h2>
        <CopyBox label={t("stratumHost")} value={info.stratum} />
        <CopyBox label={t("workerLabel")} value={username} />
        <CopyBox label="Password" value="x" />
        <div style={{ fontSize:11.5, color:"var(--text2)", marginTop:6, lineHeight:1.7 }}>{info.note}</div>
      </div>

      <div style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:"var(--r2)", padding:"20px 22px" }}>
        <h2 style={{ fontSize:14, fontWeight:600, marginBottom:14 }}>Step 3 — Configure your miner</h2>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {[
            { name:"Antminer (Bitmain)", path:"Miner → Configuration → Pool Configuration" },
            { name:"WhatsMiner (MicroBT)", path:"Miner Management → Pool Settings" },
            { name:"Avalon (Canaan)", path:"Network → Pool Configuration → Pool 1" },
            { name:"CGMiner / BFGMiner", path:"--url <stratum> --user <user> --pass x" },
          ].map(m => (
            <div key={m.name} style={{ background:"var(--bg3)", border:"1px solid var(--border)", borderRadius:"var(--r)", padding:"11px 13px" }}>
              <div style={{ fontWeight:600, fontSize:12.5, marginBottom:3 }}>{m.name}</div>
              <div style={{ fontSize:11.5, color:"var(--text2)" }}>{m.path}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
