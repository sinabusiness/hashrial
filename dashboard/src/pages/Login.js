import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email:"", password:"" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const { token } = await api.login(form.email, form.password);
      localStorage.setItem("hashrial_token", token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:48, height:48, borderRadius:12, background:"var(--accent)", display:"inline-flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:22, color:"#000", marginBottom:10 }}>H</div>
          <div style={{ fontSize:22, fontWeight:700 }}>Hashrial</div>
          <div style={{ fontSize:12, color:"var(--text2)", marginTop:3 }}>Bitcoin Mining Pool</div>
        </div>
        <div style={{ background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:"var(--r2)", padding:"28px 32px" }}>
          <h1 style={{ fontSize:17, fontWeight:600, marginBottom:22 }}>Sign in to your account</h1>
          {error && (
            <div style={{ background:"rgba(232,64,64,0.1)", border:"1px solid rgba(232,64,64,0.3)", borderRadius:"var(--r)", padding:"10px 14px", marginBottom:16, color:"var(--red)", fontSize:13 }}>
              {error}
            </div>
          )}
          <form onSubmit={submit}>
            {[
              { key:"email",    label:"Email",    type:"email",    placeholder:"you@example.com" },
              { key:"password", label:"Password", type:"password", placeholder:"Your password" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom:16 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:600, color:"var(--text2)", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:5 }}>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} value={form[f.key]} required
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width:"100%", padding:"10px 13px", borderRadius:"var(--r)", border:"1px solid var(--border2)", background:"var(--bg3)", color:"var(--text)", fontSize:13, outline:"none", transition:"border-color .15s" }}
                  onFocus={e => e.target.style.borderColor="var(--accent)"}
                  onBlur={e  => e.target.style.borderColor="var(--border2)"}
                />
              </div>
            ))}
            <button type="submit" disabled={loading} style={{ width:"100%", padding:11, borderRadius:"var(--r)", border:"none", background:"var(--accent)", color:"#000", fontWeight:700, fontSize:14, cursor:loading?"not-allowed":"pointer", opacity:loading?0.7:1, marginTop:4 }}>
              {loading ? "Signing in…" : "Sign in →"}
            </button>
          </form>
          <div style={{ textAlign:"center", marginTop:18, fontSize:12.5, color:"var(--text2)" }}>
            Don't have an account? <Link to="/register" style={{ color:"var(--accent)", fontWeight:500 }}>Create one →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
