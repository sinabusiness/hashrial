import React from "react";
import { Link } from "react-router-dom";

const card = { background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:"var(--r2)", padding:"22px 24px", marginBottom:16 };
const h2 = { fontSize:16, fontWeight:600, marginBottom:10 };
const p = { fontSize:13, color:"var(--text2)", lineHeight:1.7, marginBottom:10 };

export default function Privacy() {
  return (
    <div style={{ padding:"24px 28px", maxWidth:760 }}>
      <Link to="/" style={{ color:"var(--accent)", fontSize:13, display:"inline-block", marginBottom:16 }}>← Back to Home</Link>
      <h1 style={{ fontSize:22, fontWeight:700, marginBottom:20 }}>Privacy Policy</h1>

      <div style={card}>
        <h2 style={h2}>1. Information We Collect</h2>
        <p style={p}>We collect: (a) account information (username, email, password hash); (b) Bitcoin payout address; (c) mining activity data (hashrate, workers, earnings); (d) IP addresses for rate limiting and security; (e) browser metadata for service improvement.</p>
      </div>

      <div style={card}>
        <h2 style={h2}>2. How We Use Your Information</h2>
        <p style={p}>We use your information to: (a) provide the mining pool service; (b) track mining performance and earnings; (c) process payout requests; (d) send service notifications (worker offline alerts, hashrate drops); (e) prevent abuse and ensure security; (f) comply with legal obligations.</p>
      </div>

      <div style={card}>
        <h2 style={h2}>3. Data Sharing</h2>
        <p style={p}>We share data with: (a) Antpool — your mining username is forwarded to Antpool for share submission; (b) Cloudflare — for CDN and security services; (c) Supabase — for database hosting; (d) Upstash — for Redis caching. We do not sell your data to third parties.</p>
      </div>

      <div style={card}>
        <h2 style={h2}>4. Data Retention</h2>
        <p style={p}>Mining activity data is retained for 90 days. Account data is retained until you delete your account. Payout records are retained for 7 years for accounting purposes. Backups are retained for 30 days.</p>
      </div>

      <div style={card}>
        <h2 style={h2}>5. Security</h2>
        <p style={p}>We implement industry-standard security measures including: (a) bcrypt password hashing; (b) JWT authentication with 30-day expiry; (c) HTTPS encryption; (d) rate limiting; (e) CORS protection; (f) regular security audits. However, no method is 100% secure.</p>
      </div>

      <div style={card}>
        <h2 style={h2}>6. Cookies</h2>
        <p style={p}>We use essential cookies for authentication and preferences. We do not use tracking or advertising cookies. See our Cookie Policy for details.</p>
      </div>

      <div style={card}>
        <h2 style={h2}>7. Your Rights</h2>
        <p style={p}>You have the right to: (a) access your personal data; (b) correct inaccurate data; (c) delete your account and data; (d) export your data; (e) opt out of non-essential communications. Contact support@hashrial.com to exercise these rights.</p>
      </div>

      <div style={card}>
        <h2 style={h2}>8. Children's Privacy</h2>
        <p style={p}>The Service is not intended for users under 18. We do not knowingly collect data from children.</p>
      </div>

      <div style={card}>
        <h2 style={h2}>9. Changes to This Policy</h2>
        <p style={p}>We may update this policy periodically. Material changes will be announced via the dashboard or email. Continued use after changes constitutes acceptance.</p>
      </div>

      <div style={card}>
        <h2 style={h2}>10. Contact</h2>
        <p style={p}>For privacy-related inquiries, contact us at privacy@hashrial.com.</p>
      </div>

      <div style={{ fontSize:11, color:"var(--text3)", marginTop:16 }}>Last updated: June 2026</div>
    </div>
  );
}
