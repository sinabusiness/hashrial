import React from "react";
import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#080b10",
      color: "#e6edf3",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter',sans-serif",
      padding: 40,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 16,
        background: "linear-gradient(135deg,#f7931a,#e8830d)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 800, fontSize: 30, color: "#000", marginBottom: 24,
      }}>H</div>
      <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 12 }}>Hashrial</h1>
      <p style={{ color: "#8b949e", marginBottom: 32 }}>Bitcoin Mining Pool</p>
      <div style={{ display: "flex", gap: 12 }}>
        <Link to="/login" style={{
          padding: "12px 28px", background: "#f7931a", color: "#000",
          borderRadius: 10, fontWeight: 600, textDecoration: "none",
        }}>Sign In</Link>
        <Link to="/register" style={{
          padding: "12px 28px", border: "1px solid rgba(255,255,255,0.1)",
          color: "#e6edf3", borderRadius: 10, fontWeight: 600, textDecoration: "none",
        }}>Register</Link>
      </div>
    </div>
  );
}
