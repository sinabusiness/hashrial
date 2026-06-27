import React from "react";
import { Link } from "react-router-dom";

const card = { background:"var(--bg2)", border:"1px solid var(--border)", borderRadius:"var(--r2)", padding:"22px 24px", marginBottom:16 };
const h2 = { fontSize:16, fontWeight:600, marginBottom:10 };
const p = { fontSize:13, color:"var(--text2)", lineHeight:1.7, marginBottom:10 };

export default function Terms() {
  return (
    <div style={{ padding:"24px 28px", maxWidth:760 }}>
      <Link to="/" style={{ color:"var(--accent)", fontSize:13, display:"inline-block", marginBottom:16 }}>← Back to Home</Link>
      <h1 style={{ fontSize:22, fontWeight:700, marginBottom:20 }}>Terms of Service</h1>

      <div style={card}>
        <h2 style={h2}>1. Acceptance of Terms</h2>
        <p style={p}>By accessing or using Hashrial ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
      </div>

      <div style={card}>
        <h2 style={h2}>2. Description of Service</h2>
        <p style={p}>Hashrial is a Bitcoin mining pool proxy that forwards mining shares from your devices to Antpool. We charge a 2% pool fee on all mined shares. The Service provides a dashboard for monitoring hashrate, workers, and earnings.</p>
      </div>

      <div style={card}>
        <h2 style={h2}>3. Account Registration</h2>
        <p style={p}>You must provide accurate and complete registration information. You are responsible for maintaining the confidentiality of your account credentials. You must be at least 18 years of age to use this Service.</p>
      </div>

      <div style={card}>
        <h2 style={h2}>4. Mining and Earnings</h2>
        <p style={p}>All mining is performed through Antpool. Hashrial acts as a proxy and does not control mining difficulty, block discovery, or payout schedules. Earnings are subject to Antpool's terms and conditions. Hashrial guarantees a 2% fee on shares forwarded through our proxy.</p>
      </div>

      <div style={card}>
        <h2 style={h2}>5. Payouts</h2>
        <p style={p}>Payout requests are subject to a minimum threshold of 0.001 BTC. Payouts are processed through Antpool's payment system. Hashrial is not responsible for delays in Antpool's payout processing. You must provide a valid Bitcoin address to receive payouts.</p>
      </div>

      <div style={card}>
        <h2 style={h2}>6. Prohibited Use</h2>
        <p style={p}>You may not: (a) use the Service for any illegal purpose; (b) attempt to manipulate share submissions; (c) use multiple accounts to circumvent fees; (d) interfere with the Service infrastructure; (e) reverse engineer or attempt to extract source code.</p>
      </div>

      <div style={card}>
        <h2 style={h2}>7. Limitation of Liability</h2>
        <p style={p}>Hashrial is provided "as is" without warranties. We are not liable for: (a) mining revenue losses; (b) Antpool service disruptions; (c) network outages; (d) hardware failures; (e) data loss. Our total liability shall not exceed fees paid in the preceding 3 months.</p>
      </div>

      <div style={card}>
        <h2 style={h2}>8. Modifications</h2>
        <p style={p}>We reserve the right to modify these terms at any time. Continued use of the Service after changes constitutes acceptance. Material changes will be announced via the dashboard or email.</p>
      </div>

      <div style={card}>
        <h2 style={h2}>9. Termination</h2>
        <p style={p}>We may suspend or terminate your account at any time for violation of these terms. Upon termination, your right to use the Service ceases. Outstanding earnings will be paid out within 30 days.</p>
      </div>

      <div style={card}>
        <h2 style={h2}>10. Contact</h2>
        <p style={p}>For questions about these Terms, contact us at support@hashrial.com.</p>
      </div>

      <div style={{ fontSize:11, color:"var(--text3)", marginTop:16 }}>Last updated: June 2026</div>
    </div>
  );
}
