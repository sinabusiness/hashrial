import React from "react";
import { Link } from "react-router-dom";

const card = { background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:"var(--r2)", padding:"22px 24px", marginBottom:16 };
const h2 = { fontSize:16, fontWeight:600, marginBottom:10 };
const p = { fontSize:13, color:"var(--text2)", lineHeight:1.7, marginBottom:10 };

export default function Cookies() {
  return (
    <div style={{ padding:"24px 28px", maxWidth:760 }}>
      <Link to="/" style={{ color:"var(--accent)", fontSize:13, display:"inline-block", marginBottom:16 }}>← Back to Home</Link>
      <h1 style={{ fontSize:22, fontWeight:700, marginBottom:20 }}>Cookie Policy</h1>

      <div style={card}>
        <h2 style={h2}>What Are Cookies</h2>
        <p style={p}>Cookies are small text files stored on your device when you visit a website. They help the site remember your preferences and maintain your session.</p>
      </div>

      <div style={card}>
        <h2 style={h2}>Cookies We Use</h2>
        <p style={p}><strong>Essential Cookies:</strong> These are required for the Service to function. They include authentication tokens stored in your browser's localStorage.</p>
        <p style={p}><strong>Preference Cookies:</strong> We store your theme preference (dark/light mode) and language selection in localStorage for a better experience.</p>
        <p style={p}><strong>We do not use:</strong> Tracking cookies, advertising cookies, analytics cookies, or any third-party cookies.</p>
      </div>

      <div style={card}>
        <h2 style={h2}>Local Storage</h2>
        <p style={p}>We use browser localStorage to store: (a) authentication token (hashrial_token); (b) theme preference (hashrial_theme); (c) language preference (hashrial_lang). This data never leaves your device and is not shared with third parties.</p>
      </div>

      <div style={card}>
        <h2 style={h2}>Managing Cookies</h2>
        <p style={p}>You can clear localStorage through your browser settings. Note that clearing localStorage will log you out and reset your preferences. You can also use your browser's private/incognito mode.</p>
      </div>

      <div style={card}>
        <h2 style={h2}>Third-Party Services</h2>
        <p style={p}>Our landing page loads fonts from Google Fonts. Google may set cookies when serving these fonts. We have no control over Google's cookie practices.</p>
      </div>

      <div style={card}>
        <h2 style={h2}>Changes</h2>
        <p style={p}>We may update this Cookie Policy periodically. Changes will be reflected on this page.</p>
      </div>

      <div style={{ fontSize:11, color:"var(--text3)", marginTop:16 }}>Last updated: June 2026</div>
    </div>
  );
}
