import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../lib/api";

const T = {
  en: {
    title: "Next-Gen Bitcoin Mining Pool",
    subtitle: "High-performance stratum proxy with a transparent 2% fee model. 98% of your hashrate goes directly to your own Antpool sub-account.",
    startMining: "Start Mining Now",
    memberArea: "Member Area",
    dashboard: "Go to Dashboard",
    liveStats: "Live Pool Statistics",
    activeMiners: "Active Workers",
    poolHashrate: "Pool Hashrate",
    btcPrice: "Bitcoin Price",
    feeText: "Transparent 2% Fee",
    configurator: "Interactive Stratum Configurator",
    configDesc: "Enter your Hashrial username below to generate your personalized ASIC configuration commands.",
    usernameLabel: "Your Username",
    stratumUrl: "Stratum URL",
    stratumUser: "Worker Username",
    stratumPass: "Password",
    copy: "Copy",
    copied: "Copied!",
    guideTitle: "Hardware Setup Guides",
    whyUs: "Why Mine With Hashrial?",
    feature1Title: "Antpool Direct Integration",
    feature1Desc: "98% of your hashrate is routed directly to your personal Antpool sub-account. Fully transparent.",
    feature2Title: "Share-Routing Fee",
    feature2Desc: "Every 50th share is routed to the infrastructure fee account. Standard model, no hidden cuts.",
    feature3Title: "Multilingual Panel",
    feature3Desc: "Our dashboard supports English, Persian, Chinese, Russian, Spanish, and 5 more languages.",
    testimonials: "Trusted by 2,000+ Miners",
    faq: "Frequently Asked Questions",
    footerText: "© 2026 Hashrial. Fully decentralized, high-performance stratum mining proxy.",
  },
  fa: {
    title: "نسل جدید استخر ماینینگ بیت‌کوین",
    subtitle: "پراکسی استراتوم با کارایی بالا و مدل کارمزد ۲٪ شفاف. ۹۸٪ از هش‌ریت شما مستقیماً به حساب کاربری شخصی شما در آنت‌پول واریز می‌شود.",
    startMining: "شروع ماینینگ",
    memberArea: "ورود کاربران",
    dashboard: "داشبورد من",
    liveStats: "آمار زنده استخر",
    activeMiners: "کارگران فعال",
    poolHashrate: "هش‌ریت استخر",
    btcPrice: "قیمت بیت‌کوین",
    feeText: "کارمزد شفاف ۲٪",
    configurator: "پیکربندی استراتوم تعاملی",
    configDesc: "نام کاربری خود را وارد کنید تا دستورات پیکربندی ASIC شخصی‌سازی شده تولید شود.",
    usernameLabel: "نام کاربری شما",
    stratumUrl: "آدرس Stratum",
    stratumUser: "نام کارگر",
    stratumPass: "رمز عبور",
    copy: "کپی",
    copied: "کپی شد!",
    guideTitle: "راهنمای راه‌اندازی سخت‌افزار",
    whyUs: "چرا Hashrial؟",
    feature1Title: "ادغام مستقیم با آنت‌پول",
    feature1Desc: "۹۸٪ از هش‌ریت شما مستقیماً به حساب شخصی شما در آنت‌پول منتقل می‌شود.",
    feature2Title: "هزینه مسیریابی سهام",
    feature2Desc: "هر پنجاهمین سهم برای حساب کارمزد زیرساخت هدایت می‌شود.",
    feature3Title: "پانل چندزبانه",
    feature3Desc: "داشبورد ما از انگلیسی، فارسی، چینی، روسی، اسپانیایی و ۵ زبان دیگر پشتیبانی می‌کند.",
    testimonials: "مورد اعتماد ۲۰۰۰+ ماینر",
    faq: "سوالات متداول",
    footerText: "© ۱۴۰۵ Hashrial. پراکسی ماینینگ استراتوم کاملاً غیرمتمرکز و با کارایی بالا.",
  },
};

const testimonialData = [
  { text: "Switched from Antpool directly. Hashrial's transparency is unmatched. 2% fee is fair.", author: "miner_alex", rating: 5 },
  { text: "Simple setup, excellent uptime. Mining continuously for 3 months with zero issues.", author: "bitcoin_enthusiast", rating: 5 },
  { text: "API is solid and well-documented. Built my own monitoring dashboard on top.", author: "dev_team_42", rating: 5 },
];

const faqData = [
  { q: "How much is the pool fee?", a: "2% per share routed. Every 50th share goes to infrastructure. The remaining 98% of your hashrate is routed directly to your personal Antpool sub-account." },
  { q: "Do I need to create an Antpool account?", a: "No. Hashrial automatically routes your hashrate to your personal Antpool sub-account. You just need a Hashrial account." },
  { q: "What's the minimum payout?", a: "0.001 BTC. Payouts are processed weekly to your Bitcoin address." },
  { q: "Can I use multiple workers?", a: "Yes. Set worker names in your ASIC configuration (e.g., rig01, rig02, rig03)." },
  { q: "Is there any hidden fees?", a: "No. Everything is transparent. You only pay the 2% pool fee. No hidden cuts, no admin fees." },
  { q: "What happens if the pool goes down?", a: "Your miners automatically fail over to Antpool if Hashrial disconnects. Your earnings are safe." },
];

function StatCard({ label, value, sub, icon }) {
  return (
    <div style={{
      background: "var(--bg2)",
      border: "1px solid var(--border)",
      borderRadius: "var(--r2)",
      padding: "16px 18px",
      flex: "1 1 160px",
      minWidth: "140px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <span style={{ fontSize: "10px", color: "var(--text2)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
        {icon && <span style={{ fontSize: "14px", opacity: 0.5 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--accent)", letterSpacing: "-0.3px", marginBottom: 2, fontFamily: "var(--mono)" }}>{value}</div>
      {sub && <div style={{ fontSize: "10px", color: "var(--text2)" }}>{sub}</div>}
    </div>
  );
}

function TestimonialCard({ text, author, rating }) {
  return (
    <div style={{
      border: "1px solid var(--border)",
      borderRadius: "var(--r2)",
      padding: "18px",
      background: "var(--bg2)",
      minHeight: "140px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    }}>
      <div style={{ marginBottom: 12 }}>
        {Array(rating).fill(0).map((_, i) => <span key={i} style={{ color: "var(--accent)", marginRight: 2 }}>★</span>)}
      </div>
      <div style={{ fontSize: "12px", color: "var(--text)", marginBottom: 12, fontStyle: "italic", lineHeight: 1.5 }}>"{text}"</div>
      <div style={{ fontSize: "11px", color: "var(--accent)", fontWeight: 600 }}>— {author}</div>
    </div>
  );
}

function FAQItem({ q, a, isOpen, onClick }) {
  return (
    <div style={{
      border: "1px solid var(--border)",
      borderRadius: "var(--r2)",
      marginBottom: 8,
      overflow: "hidden",
    }}>
      <button onClick={onClick} style={{
        width: "100%",
        padding: "14px 16px",
        background: isOpen ? "rgba(247,147,26,0.08)" : "var(--bg2)",
        border: "none",
        textAlign: "left",
        cursor: "pointer",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "13px",
        fontWeight: 600,
        color: "var(--text)",
        transition: "all 0.2s",
      }}>
        <span>{q}</span>
        <span style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", color: "var(--accent)" }}>▼</span>
      </button>
      {isOpen && (
        <div style={{ padding: "12px 16px", background: "rgba(247,147,26,0.04)", borderTop: "1px solid var(--border)", fontSize: "12px", color: "var(--text2)", lineHeight: 1.6 }}>
          {a}
        </div>
      )}
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "en");
  const isRtl = lang === "fa";
  const t = T[lang];

  const [copied, setCopied] = useState(null);
  const [username, setUsername] = useState("");
  const [poolStats, setPoolStats] = useState(null);
  const [btcPrice, setBtcPrice] = useState(null);
  const [error, setError] = useState(null);
  const [openFaq, setOpenFaq] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

  useEffect(() => {
    const loadStats = () => {
      Promise.all([
        api.poolStats().then(s => { setPoolStats(s); setError(null); }).catch(e => { setError("Failed to load pool stats"); }),
        api.btcPrice().then(p => setBtcPrice(p)).catch(() => {}),
      ]);
    };
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      color: "var(--text)",
      fontFamily: isRtl ? "var(--font-fa)" : "var(--font)",
      direction: isRtl ? "rtl" : "ltr",
      overflowX: "hidden",
    }}>
      {/* Header */}
      <header style={{
        height: isMobile ? 56 : 64,
        background: "rgba(13,17,23,0.75)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: isMobile ? "0 12px" : "0 24px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: isMobile ? 32 : 36,
            height: isMobile ? 32 : 36,
            borderRadius: 8,
            background: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: isMobile ? 16 : 20,
            color: "#000"
          }}>H</div>
          {!isMobile && <span style={{ fontSize: 16, fontWeight: 700 }}>Hashrial</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select value={lang} onChange={(e) => setLang(e.target.value)} style={{
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: "var(--bg2)",
            color: "var(--text)",
            fontSize: 12,
            cursor: "pointer",
          }}>
            <option value="en">English</option>
            <option value="fa">فارسی</option>
          </select>
          <Link to="/login" style={{ fontSize: 12, padding: "6px 12px", color: "var(--text2)" }}>Login</Link>
          <Link to="/register" style={{
            fontSize: 12,
            padding: "6px 14px",
            background: "var(--accent)",
            color: "#000",
            borderRadius: 6,
            fontWeight: 600,
          }}>Sign Up</Link>
        </div>
      </header>

      <main style={{ padding: isMobile ? "20px 12px" : "40px 28px", maxWidth: 1280, margin: "0 auto" }}>
        {/* Hero */}
        <section style={{ marginBottom: isMobile ? 40 : 60, textAlign: "center" }}>
          <h1 style={{ fontSize: isMobile ? 24 : 42, fontWeight: 700, marginBottom: 12, letterSpacing: "-1px" }}>{t.title}</h1>
          <p style={{ fontSize: isMobile ? 13 : 16, color: "var(--text2)", maxWidth: 600, margin: "0 auto 20px", lineHeight: 1.6 }}>{t.subtitle}</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => navigate("/register")} style={{
              padding: "10px 24px",
              background: "var(--accent)",
              color: "#000",
              border: "none",
              borderRadius: "var(--r2)",
              fontSize: isMobile ? 12 : 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }} onMouseEnter={(e) => e.target.style.opacity = "0.85"} onMouseLeave={(e) => e.target.style.opacity = "1"}>
              {t.startMining} →
            </button>
            <button onClick={() => {
              const token = localStorage.getItem("hashrial_token");
              if (token) navigate("/dashboard");
              else navigate("/login");
            }} style={{
              padding: "10px 24px",
              background: "transparent",
              color: "var(--accent)",
              border: "1px solid var(--accent)",
              borderRadius: "var(--r2)",
              fontSize: isMobile ? 12 : 14,
              fontWeight: 600,
              cursor: "pointer",
            }}>
              {t.memberArea} →
            </button>
          </div>
        </section>

        {/* Live Stats */}
        {!error && poolStats && btcPrice && (
          <section style={{ marginBottom: isMobile ? 40 : 60, display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
            <StatCard label={t.activeMiners} value={`${poolStats.activeWorkers || 0}`} icon="⚙" />
            <StatCard label={t.liveStats} value={btcPrice?.price ? `$${btcPrice.price.toLocaleString()}` : "—"} sub={btcPrice?.change ? `${btcPrice.change >= 0 ? "▲" : "▼"} ${Math.abs(btcPrice.change).toFixed(1)}%` : ""} icon="₿" />
          </section>
        )}

        {error && <div style={{ color: "var(--red)", fontSize: 12, padding: "10px 12px", background: "rgba(232,64,64,0.1)", borderRadius: 6, marginBottom: 30, textAlign: "center" }}>⚠ {error}</div>}

        {/* Features */}
        <section style={{ marginBottom: isMobile ? 40 : 60 }}>
          <h2 style={{ fontSize: isMobile ? 18 : 24, fontWeight: 700, marginBottom: 20, textAlign: "center" }}>{t.whyUs}</h2>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 16 }}>
            {[
              { title: t.feature1Title, desc: t.feature1Desc, icon: "⛓" },
              { title: t.feature2Title, desc: t.feature2Desc, icon: "💰" },
              { title: t.feature3Title, desc: t.feature3Desc, icon: "🌐" },
            ].map((f, i) => (
              <div key={i} style={{ border: "1px solid var(--border)", borderRadius: "var(--r2)", padding: isMobile ? 14 : 18, background: "var(--bg2)" }}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>{f.icon}</div>
                <h3 style={{ fontSize: isMobile ? 13 : 15, fontWeight: 600, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section style={{ marginBottom: isMobile ? 40 : 60 }}>
          <h2 style={{ fontSize: isMobile ? 18 : 24, fontWeight: 700, marginBottom: 20, textAlign: "center" }}>{t.testimonials}</h2>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 16 }}>
            {testimonialData.map((t, i) => <TestimonialCard key={i} {...t} />)}
          </div>
        </section>

        {/* FAQ */}
        <section style={{ marginBottom: isMobile ? 40 : 60, maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ fontSize: isMobile ? 18 : 24, fontWeight: 700, marginBottom: 20, textAlign: "center" }}>{t.faq}</h2>
          {faqData.map((item, i) => (
            <FAQItem key={i} q={item.q} a={item.a} isOpen={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? -1 : i)} />
          ))}
        </section>

        {/* Configurator */}
        <section style={{ marginBottom: isMobile ? 40 : 60 }}>
          <h2 style={{ fontSize: isMobile ? 18 : 24, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>{t.configurator}</h2>
          <p style={{ fontSize: 12, color: "var(--text2)", textAlign: "center", marginBottom: 20 }}>{t.configDesc}</p>
          <div style={{ maxWidth: 500, margin: "0 auto" }}>
            <input
              type="text"
              placeholder={t.usernameLabel}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "var(--r)",
                border: "1px solid var(--border)",
                background: "var(--bg2)",
                color: "var(--text)",
                fontSize: 13,
                marginBottom: 12,
              }}
            />
            {username && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: t.stratumUrl, value: "stratum+tcp://hashrial.com:3333" },
                  { label: t.stratumUser, value: `${username}.worker1` },
                  { label: t.stratumPass, value: "x" },
                ].map((item, i) => (
                  <div key={i} style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 10, color: "var(--text2)", marginBottom: 2 }}>{item.label}</div>
                      <div style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--accent)" }}>{item.value}</div>
                    </div>
                    <button onClick={() => handleCopy(item.value, i)} style={{
                      padding: "4px 10px",
                      background: copied === i ? "var(--green)" : "var(--accent)",
                      color: copied === i ? "var(--bg)" : "#000",
                      border: "none",
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}>
                      {copied === i ? t.copied : t.copy}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: isMobile ? "20px 12px" : "30px 28px", fontSize: 12, color: "var(--text2)", textAlign: "center" }}>
        {t.footerText}
      </footer>
    </div>
  );
}
