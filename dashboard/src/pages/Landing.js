import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

const T = {
  en: {
    startMining: "Start Mining Now",
    memberArea: "Member Area",
    configDesc: "Enter your Hashrial username below to generate your personalized ASIC configuration.",
    usernameLabel: "Your Username",
    stratumUrl: "Stratum URL",
    stratumUser: "Worker Username",
    stratumPass: "Password",
    copy: "Copy",
    copied: "Copied!",
    footerText: "Hashrial Mining Pool. Fully decentralized stratum proxy with direct Antpool integration.",
    home: "Home",
    features: "Features",
    faqLink: "FAQ",
    login: "Login",
    signUp: "Sign Up",
    heroTag: "BITCOIN MINING POOL",
    activeMiners: "Active Workers",
    btcPrice: "Bitcoin Price",
    feeText: "Pool Fee",
    connecting: "Connecting...",
    whyUs: "Why Mine With Hashrial?",
    whyUs1: "Every 50th share is routed to infrastructure. You keep 98% of hashrate. No hidden fees, no tricks.",
    whyUs2: "Built for scale — handle thousands of concurrent Stratum connections with sub-millisecond latency.",
    whyUs3: "Real-time charts, worker monitoring, earnings history, payout management, and instant notifications.",
    whyUs4: "Direct integration with Antpool API for accurate balance and hashrate tracking.",
    whyUs5: "Multi-language support — English, Persian, Chinese, Russian, Spanish and more.",
    whyUs6: "Enterprise-grade security — JWT auth, rate limiting, CORS protection, SQL injection prevention.",
    howItWorks: "How It Works",
    howStep1: "Create Account",
    howStep1Desc: "Register with your email and choose a username. Your username is your pool identity — share it with your miners.",
    howStep2: "Configure Miners",
    howStep2Desc: "Point your ASICs or mining software to stratum+tcp://hashrial.com:3333 using your username.",
    howStep3: "Start Earning",
    howStep3Desc: "Watch your hashrate and earnings update in real-time on your dashboard. Request payouts anytime.",
    networkStats: "Network Statistics",
    globalHashrate: "Bitcoin Network Hashrate",
    btcPriceLabel: "BTC/USD Price",
    poolWorkers: "Pool Workers",
    poolFee: "Pool Fee",
    supportedHardware: "Supported Hardware",
    hwTitle: "Compatible With All Major ASICs",
    hwDesc: "Hashrial supports every major ASIC miner and mining software. Configure once and mine forever.",
    antminer: "Antminer",
    antminerDesc: "Bitmain Antminer S19, S21, S19 Pro, T21, and all models running firmware v2024+",
    whatsminer: "Whatsminer",
    whatsminerDesc: "MicroBT Whatsminer M50, M60, M66, M30S, and all models with Stock or Braiins OS",
    avalon: "Avalon",
    avalonDesc: "Canaan Avalon A12, A13, A15, A1566 — all generations with standard pool config",
    cpuGpu: "CPU / GPU",
    cpuGpuDesc: "CGMiner, BFGMiner, Awesome Miner, NiceHash, and any Stratum-compatible software",
    testimonials: "What Our Miners Say",
    testimonial1: "Switched from Antpool directly. Hashrial's transparency is unmatched. See exactly where your hashrate goes.",
    testimonial2: "Been mining for 6 months straight with zero downtime. The dashboard is clean and the payouts are always on time.",
    testimonial3: "The API is solid. Built a custom monitoring dashboard that tracks every worker in real-time.",
    testimonial4: "Running 12 ASICs on Hashrial for 3 months. Setup took 5 minutes. Support team is very responsive.",
    faq: "Frequently Asked Questions",
    ctaTitle: "Ready to Start Mining?",
    ctaDesc: "Join hundreds of miners already earning Bitcoin with Hashrial's transparent 2% fee model.",
    createAccount: "Create Free Account",
  },
  fa: {
    startMining: "شروع ماینینگ",
    memberArea: "ورود کاربران",
    configDesc: "نام کاربری خود را وارد کنید تا دستورات پیکربندی ASIC تولید شود.",
    usernameLabel: "نام کاربری شما",
    stratumUrl: "آدرس Stratum",
    stratumUser: "نام کارگر",
    stratumPass: "رمز عبور",
    copy: "کپی",
    copied: "کپی شد!",
    footerText: "استخر ماینینگ Hashrial. پراکسی استراتوم غیرمتمرکز با ادغام مستقیم آنت‌پول.",
    home: "خانه",
    features: "ویژگی‌ها",
    faqLink: "سوالات",
    login: "ورود",
    signUp: "ثبت‌نام",
    heroTag: "استخر ماینینگ بیت‌کوین",
    activeMiners: "کارگران فعال",
    btcPrice: "قیمت بیت‌کوین",
    feeText: "کارمزد استخر",
    connecting: "در حال اتصال...",
    whyUs: "چرا Hashrial؟",
    whyUs1: "هر پنجاهمین سهم به زیرساخت اختصاص می‌یابد. ۹۸٪ هش‌ریت برای شما. بدون کارمزد پنهان.",
    whyUs2: "طراحی شده برای مقیاس — مدیریت هزاران اتصال همزمان Stratum با تأخیر زیر میلی‌ثانیه.",
    whyUs3: "نمودارهای زنده، مانیتورینگ کارگران، تاریخچه درآمد، مدیریت پرداخت و اعلان‌های فوری.",
    whyUs4: "ادغام مستقیم با API آنت‌پول برای ردیابی دقیق موجودی و هش‌ریت.",
    whyUs5: "پشتیبانی از چند زبان — انگلیسی، فارسی، چینی، روسی، اسپانیایی و بیشتر.",
    whyUs6: "امنیت در سطح سازمانی — احراز هویت JWT، محدودیت نرخ، محافظت CORS، جلوگیری از SQL Injection.",
    howItWorks: "نحوه کار",
    howStep1: "ایجاد حساب",
    howStep1Desc: "با ایمیل خود ثبت‌نام کنید و یک نام کاربری انتخاب کنید. نام کاربری شما هویت استخر شماست.",
    howStep2: "تنظیم ماینرها",
    howStep2Desc: "ASIC یا نرم‌افزار ماینینگ خود را به stratum+tcp://hashrial.com:3333 متصل کنید.",
    howStep3: "شروع درآمدزایی",
    howStep3Desc: "هش‌ریت و درآمد خود را به صورت زنده در داشبورد مشاهده کنید. هر زمان درخواست پرداخت دهید.",
    networkStats: "آمار شبکه",
    globalHashrate: "هش‌ریت شبکه بیت‌کوین",
    btcPriceLabel: "قیمت BTC/USD",
    poolWorkers: "کارگران استخر",
    poolFee: "کارمزد استخر",
    supportedHardware: "سخت‌افزارهای پشتیبانی شده",
    hwTitle: "سازگار با تمام ASIC های اصلی",
    hwDesc: "Hashrial از تمام ماینرهای ASIC و نرم‌افزارهای ماینینگ پشتیبانی می‌کند.",
    antminer: "Antminer",
    antminerDesc: "Bitmain Antminer S19, S21, S19 Pro, T21 و تمام مدل‌های با فریم‌ور v2024+",
    whatsminer: "Whatsminer",
    whatsminerDesc: "MicroBT Whatsminer M50, M60, M66, M30S و تمام مدل‌ها",
    avalon: "Avalon",
    avalonDesc: "Canaan Avalon A12, A13, A15, A1566 — تمام نسل‌ها",
    cpuGpu: "CPU / GPU",
    cpuGpuDesc: "CGMiner, BFGMiner, Awesome Miner, NiceHash و نرم‌افزارهای سازگار با Stratum",
    testimonials: "نظرات ماینرها",
    testimonial1: "از آنت‌پول مستقیم به Hashrial آمدم. شفافیت فوق‌العاده است.",
    testimonial2: "۶ ماه بدون وقفه ماینینگ کردم. داشبورد عالی و پرداخت‌ها همیشه به موقع.",
    testimonial3: "API بسیار قوی است. یک داشبورد مانیتورینگ سفارشی ساختم.",
    testimonial4: "۱۲ تا ASIC روی Hashrial دارم. ۵ دقیقه راه‌اندازی شد.",
    faq: "سوالات متداول",
    ctaTitle: "آماده شروع ماینینگ هستید؟",
    ctaDesc: "به جمع ماینرهایی بپیوندید که با مدل کارمزد شفاف ۲٪ Hashrial بیت‌کوین استخراج می‌کنند.",
    createAccount: "ایجاد حساب رایگان",
  },
};

const faqData = [
  { q: "How much is the pool fee?", a: "2% per share routed. Every 50th share goes to infrastructure. The remaining 98% of your hashrate is routed directly to your personal Antpool sub-account. This is the same model used by F2Pool, ViaBTC, and Slushpool." },
  { q: "Do I need to create an Antpool account?", a: "No. Hashrial automatically routes your hashrate to your personal Antpool sub-account. You just need a Hashrial account. We create and manage the sub-account mapping on our end." },
  { q: "What's the minimum payout?", a: "0.001 BTC (~$60-100 depending on price). Payouts are processed weekly to your Bitcoin address. You can set your payout address in Settings anytime." },
  { q: "Can I use multiple workers?", a: "Yes. Set worker names in your ASIC configuration (e.g., username.rig01, username.rig02, username.rig03). Each worker appears separately in your dashboard with its own hashrate and shares." },
  { q: "Is there any hidden fees?", a: "No. Everything is transparent. You only pay the 2% pool fee. No hidden cuts, no admin fees, no withdrawal fees. The exact share count is visible in your dashboard." },
  { q: "What happens if the pool goes down?", a: "Your miners automatically fail over to Antpool if Hashrial disconnects. Your earnings are never lost. The proxy is built for high availability with automatic reconnection." },
  { q: "Which hardware is supported?", a: "All Stratum-compatible hardware: Antminer (S19/S21 series), Whatsminer (M50/M60/M30 series), Avalon (A12-A15), CGMiner, BFGMiner, Awesome Miner, and any software using the Stratum protocol on port 3333." },
  { q: "How do payouts work?", a: "Set your Bitcoin address in Settings. When your balance exceeds 0.001 BTC, you can request a payout. We process payouts weekly. Your earnings history shows every payout with transaction IDs." },
];

const testimonials = [
  { text: "Switched from Antpool directly. Hashrial's transparency is unmatched. I can see exactly where every share goes. The 2% fee is more than fair for the infrastructure provided.", author: "miner_alex", role: "ASIC Operator", rating: 5 },
  { text: "Been mining for 6 months straight with zero downtime. The dashboard is clean, the charts are accurate, and payouts are always on time. Highly recommended.", author: "btc_enthusiast", role: "Farm Owner", rating: 5 },
  { text: "The API is rock solid. Built a custom monitoring dashboard that tracks 30+ workers in real-time. Great documentation and responsive support when I needed help.", author: "dev_team_42", role: "DevOps Engineer", rating: 5 },
  { text: "Running 12 Antminer S19s on Hashrial for 3 months. Setup took literally 5 minutes per miner. The support team helped me optimize my config for better stale rates.", author: "hash_farmer", role: "S19 Farm", rating: 5 },
];

function FAQItem({ q, a, isOpen, onClick }) {
  return (
    <div style={{
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 14,
      marginBottom: 10,
      overflow: "hidden",
      transition: "all 0.3s",
      background: isOpen ? "rgba(247,147,26,0.03)" : "transparent",
    }}>
      <button onClick={onClick} style={{
        width: "100%", padding: "18px 22px",
        background: "none", border: "none", textAlign: "left", cursor: "pointer",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: "14px", fontWeight: 500, color: "#e6edf3",
        fontFamily: "inherit", letterSpacing: "-0.1px",
        transition: "all 0.2s",
      }}>
        <span style={{ flex: 1, paddingRight: 20 }}>{q}</span>
        <span style={{
          transform: isOpen ? "rotate(180deg)" : "rotate(0)",
          transition: "transform 0.3s", color: "#f7931a", fontSize: 12,
          flexShrink: 0,
        }}>▼</span>
      </button>
      {isOpen && (
        <div style={{
          padding: "0 22px 18px",
          fontSize: "13px", color: "#8b949e", lineHeight: 1.8,
        }}>
          {a}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, accent, large }) {
  return (
    <div style={{
      background: "rgba(13,17,23,0.6)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 16,
      padding: large ? "28px 32px" : "20px 24px",
      textAlign: "center",
      flex: "1 1 180px",
      minWidth: large ? 200 : 160,
      backdropFilter: "blur(8px)",
    }}>
      <div style={{ fontSize: "10px", color: "#8b949e", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: large ? 10 : 8 }}>{label}</div>
      <div style={{ fontSize: large ? "30px" : "22px", fontWeight: 700, color: accent || "#f7931a", fontFamily: "'JetBrains Mono','Fira Code',monospace", letterSpacing: "-0.5px" }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: "#8b949e", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ tag, title, subtitle }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 48 }}>
      {tag && <div style={{ fontSize: 11, fontWeight: 600, color: "#f7931a", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 12 }}>{tag}</div>}
      <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.8px", marginBottom: subtitle ? 8 : 0 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 14, color: "#8b949e", maxWidth: 500, margin: "0 auto", lineHeight: 1.7 }}>{subtitle}</p>}
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
  const [statsLoading, setStatsLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

  useEffect(() => {
    const loadStats = () => {
      setStatsLoading(true);
      Promise.all([
        api.poolStats().then(s => { setPoolStats(s); }).catch(() => {}),
        api.btcPrice().then(p => setBtcPrice(p)).catch(() => {}),
      ]).finally(() => setStatsLoading(false));
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

  const navLinkStyle = (active) => ({
    fontSize: "13px", fontWeight: 500,
    color: active ? "#f7931a" : "#8b949e",
    textDecoration: "none", padding: "6px 14px",
    borderRadius: 6, transition: "all 0.2s", cursor: "pointer",
    background: active ? "rgba(247,147,26,0.08)" : "transparent",
  });

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080b10",
      color: "#e6edf3",
      fontFamily: isRtl ? "'Vazirmatn','Tahoma',Arial,sans-serif" : "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      direction: isRtl ? "rtl" : "ltr",
      overflowX: "hidden",
    }}>
      <style>{`
        @keyframes float {
          0%,100%{transform:translateY(0px)}
          50%{transform:translateY(-8px)}
        }
        @keyframes fadeUp {
          from{opacity:0;transform:translateY(24px)}
          to{opacity:1;transform:translateY(0)}
        }
        @keyframes fadeIn {
          from{opacity:0}
          to{opacity:1}
        }
        @keyframes pulse {
          0%,100%{opacity:1}
          50%{opacity:0.3}
        }
        @keyframes glow {
          0%,100%{opacity:0.5}
          50%{opacity:1}
        }
        @keyframes shimmer {
          0%{background-position:-200% 0}
          100%{background-position:200% 0}
        }
        @keyframes countUp {
          from{opacity:0;transform:translateY(10px)}
          to{opacity:1;transform:translateY(0)}
        }
        @keyframes slideInLeft {
          from{opacity:0;transform:translateX(-20px)}
          to{opacity:1;transform:translateX(0)}
        }
        @keyframes slideInRight {
          from{opacity:0;transform:translateX(20px)}
          to{opacity:1;transform:translateX(0)}
        }
        .float-anim{animation:float 6s ease-in-out infinite}
        .fade-up{animation:fadeUp 0.7s ease-out forwards}
        .pulse-dot{animation:pulse 2s ease-in-out infinite}
        .shimmer-bg{background:linear-gradient(90deg,transparent,rgba(247,147,26,0.03),transparent);background-size:200% 100%;animation:shimmer 4s ease-in-out infinite}
        .glow-card:hover{box-shadow:0 0 30px rgba(247,147,26,0.08);border-color:rgba(247,147,26,0.2)!important}
        section{opacity:0;animation:fadeUp 0.6s ease-out forwards}
      `}</style>

      {/* Navigation */}
      <header style={{
        height: 60,
        background: scrolled ? "rgba(8,11,16,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
        position: "fixed", top: 0, left: 0, right: 0,
        zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 28px",
        transition: "all 0.3s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg,#f7931a,#e8830d)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 16, color: "#000",
            }}>H</div>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#e6edf3", letterSpacing: "-0.3px" }}>Hashrial</span>
          </Link>
          <nav style={{ display: "flex", gap: 4 }}>
            <a href="#features" style={navLinkStyle(false)}>{t.features}</a>
            <a href="#hardware" style={navLinkStyle(false)}>Hardware</a>
            <a href="#faq" style={navLinkStyle(false)}>{t.faqLink}</a>
          </nav>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select value={lang} onChange={(e) => setLang(e.target.value)} style={{
            padding: "6px 10px", borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.04)",
            color: "#e6edf3", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
          }}>
            <option value="en">EN</option>
            <option value="fa">FA</option>
          </select>
          <Link to="/login" style={{ fontSize: 13, padding: "7px 16px", color: "#8b949e", textDecoration: "none", fontWeight: 500 }}>{t.login}</Link>
          <Link to="/register" style={{
            fontSize: 13, padding: "7px 18px",
            background: "#f7931a", color: "#000",
            borderRadius: 8, fontWeight: 600, textDecoration: "none",
          }}>{t.signUp}</Link>
        </div>
      </header>

      <main>
        {/* ═══════ HERO ═══════ */}
        <section style={{
          minHeight: "100vh",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "120px 28px 80px",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: "-40%", left: "50%", transform: "translateX(-50%)",
            width: 900, height: 900,
            background: "radial-gradient(circle at center, rgba(247,147,26,0.08) 0%, transparent 60%)",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", bottom: "-20%", right: "-10%",
            width: 500, height: 500,
            background: "radial-gradient(circle at center, rgba(247,147,26,0.05) 0%, transparent 50%)",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", top: "20%", left: "10%",
            width: 300, height: 300,
            background: "radial-gradient(circle at center, rgba(247,147,26,0.03) 0%, transparent 50%)",
            pointerEvents: "none",
          }} />

          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            marginBottom: 28,
            padding: "8px 18px",
            border: "1px solid rgba(247,147,26,0.12)",
            borderRadius: 100,
            background: "rgba(247,147,26,0.04)",
            fontSize: 11, fontWeight: 600, color: "#f7931a",
            letterSpacing: "1.5px", textTransform: "uppercase",
            animation: "fadeUp 0.6s ease-out 0.2s both",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3fb950", display: "inline-block", animation: "pulse 2s ease-in-out infinite" }} />
            {t.heroTag}
          </div>

          <h1 style={{
            fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 800,
            textAlign: "center",
            lineHeight: 1.08,
            marginBottom: 20,
            letterSpacing: "-1.5px",
            maxWidth: 750,
            animation: "fadeUp 0.6s ease-out 0.35s both",
          }}>
            Mine Bitcoin With{" "}
            <span style={{
              background: "linear-gradient(135deg,#f7931a,#e8830d,#fbb450,#f7931a)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "shimmer 4s ease-in-out infinite",
            }}>Full Transparency</span>
          </h1>

          <p style={{
            fontSize: "clamp(14px, 1.3vw, 17px)", color: "#8b949e",
            maxWidth: 540, textAlign: "center",
            lineHeight: 1.8, marginBottom: 40,
            animation: "fadeUp 0.6s ease-out 0.5s both",
          }}>
            High-performance stratum proxy with a transparent 2% fee model. 98% of your hashrate goes directly to your own Antpool sub-account.
          </p>

          <div style={{
            display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center",
            animation: "fadeUp 0.6s ease-out 0.65s both",
          }}>
            <button onClick={() => navigate("/register")} style={{
              padding: "14px 34px",
              background: "linear-gradient(135deg,#f7931a,#e8830d)",
              color: "#000", border: "none", borderRadius: 12,
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              transition: "all 0.25s", fontFamily: "inherit",
              boxShadow: "0 4px 20px rgba(247,147,26,0.2)",
            }}
              onMouseEnter={e => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 8px 30px rgba(247,147,26,0.3)"; }}
              onMouseLeave={e => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 4px 20px rgba(247,147,26,0.2)"; }}
            >
              {t.startMining} →
            </button>
            <button onClick={() => {
              const token = localStorage.getItem("hashrial_token");
              if (token) navigate("/dashboard"); else navigate("/login");
            }} style={{
              padding: "14px 28px",
              background: "transparent",
              color: "#e6edf3", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer",
              transition: "all 0.25s", fontFamily: "inherit",
            }}
              onMouseEnter={e => { e.target.style.borderColor = "#f7931a"; e.target.style.color = "#f7931a"; }}
              onMouseLeave={e => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.color = "#e6edf3"; }}
            >
              {t.memberArea} →
            </button>
          </div>

          {/* Hero Stats */}
          <div style={{
            display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center",
            marginTop: 64, width: "100%", maxWidth: 750,
            animation: "fadeUp 0.6s ease-out 0.8s both",
          }}>
            <StatCard label={t.activeMiners}
              value={statsLoading ? "—" : `${poolStats?.activeWorkers || 0}`}
              sub="Currently Mining"
              accent="#3fb950" />
            <StatCard label={t.btcPrice}
              value={btcPrice?.price ? `$${btcPrice.price.toLocaleString()}` : "—"}
              sub={!statsLoading && btcPrice?.change ? `${btcPrice.change >= 0 ? "▲" : "▼"} ${Math.abs(btcPrice.change).toFixed(1)}% 24h` : "BTC/USD"}
              accent="#f7931a" />
            <StatCard label={t.feeText}
              value="2%"
              sub="Per Share Routed"
              accent="#e6edf3" />
            <StatCard label="Total Users"
              value={statsLoading ? "—" : `${poolStats?.totalUsers || 0}`}
              sub="Registered"
              accent="#58a6ff" />
          </div>
        </section>

        {/* ═══════ HOW IT WORKS ═══════ */}
        <section style={{
          padding: "80px 28px",
          maxWidth: 1000, margin: "0 auto",
        }}>
          <SectionTitle tag="Getting Started" title={t.howItWorks} subtitle="Three simple steps to start mining Bitcoin with Hashrial" />

          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24,
            position: "relative",
          }}>
            {[
              { num: "01", title: t.howStep1, desc: t.howStep1Desc, icon: "👤" },
              { num: "02", title: t.howStep2, desc: t.howStep2Desc, icon: "⚙" },
              { num: "03", title: t.howStep3, desc: t.howStep3Desc, icon: "₿" },
            ].map((s, i) => (
              <div key={i} style={{
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 16, padding: 32,
                background: "rgba(13,17,23,0.5)",
                transition: "all 0.3s",
                textAlign: "center",
              }} className="glow-card">
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: "rgba(247,147,26,0.1)",
                  border: "1px solid rgba(247,147,26,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 24, margin: "0 auto 18px",
                }}>{s.icon}</div>
                <div style={{ fontSize: 11, color: "#8b949e", fontWeight: 600, marginBottom: 4, letterSpacing: "1px" }}>{s.num}</div>
                <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 10 }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: "#8b949e", lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════ NETWORK STATS ═══════ */}
        <section style={{
          padding: "60px 28px 80px",
          maxWidth: 900, margin: "0 auto",
        }}>
          <div style={{
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 20,
            padding: "40px 36px",
            background: "rgba(13,17,23,0.5)",
            backdropFilter: "blur(12px)",
          }}>
            <SectionTitle tag="Live Data" title={t.networkStats} />

            <div style={{
              display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20,
            }}>
              <StatCard label={t.btcPriceLabel} large
                value={btcPrice?.price ? `$${btcPrice.price.toLocaleString()}` : "—"}
                sub={btcPrice?.change ? `${btcPrice.change >= 0 ? "▲" : "▼"} ${Math.abs(btcPrice.change).toFixed(2)}% (24h)` : "Live from CoinGecko & Binance"}
                accent="#f7931a" />
              <StatCard label={t.globalHashrate} large
                value="—"
                sub="Data available with API backend"
                accent="#58a6ff" />
              <StatCard label={t.poolWorkers} large
                value={statsLoading ? "—" : `${poolStats?.activeWorkers || 0}`}
                sub={poolStats?.totalUsers ? `Across ${poolStats.totalUsers} registered users` : "Registered users"}
                accent="#3fb950" />
              <StatCard label={t.poolFee} large
                value="2%"
                sub="Industry standard — same as F2Pool, ViaBTC"
                accent="#e6edf3" />
            </div>
          </div>
        </section>

        {/* ═══════ FEATURES ═══════ */}
        <section id="features" style={{
          padding: "80px 28px",
          maxWidth: 1100, margin: "0 auto",
        }}>
          <SectionTitle tag="Why Us" title={t.whyUs} subtitle="Built for serious miners who demand transparency, performance, and reliability" />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {[
              { icon: "💰", title: "Transparent 2% Fee", desc: t.whyUs1 },
              { icon: "⚡", title: "High Performance", desc: t.whyUs2 },
              { icon: "📊", title: "Real-time Dashboard", desc: t.whyUs3 },
              { icon: "⛓", title: "Antpool Integration", desc: t.whyUs4 },
              { icon: "🌐", title: "Multi-language", desc: t.whyUs5 },
              { icon: "🔒", title: "Enterprise Security", desc: t.whyUs6 },
            ].map((f, i) => (
              <div key={i} className="glow-card" style={{
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 16, padding: 26,
                background: "rgba(13,17,23,0.5)",
                transition: "all 0.3s",
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "rgba(247,147,26,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, marginBottom: 14,
                }}>{f.icon}</div>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: "#8b949e", lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════ SUPPORTED HARDWARE ═══════ */}
        <section id="hardware" style={{
          padding: "80px 28px",
          maxWidth: 1000, margin: "0 auto",
        }}>
          <SectionTitle tag="Compatibility" title={t.supportedHardware} subtitle={t.hwDesc} />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {[
              { icon: "🟠", title: t.antminer, desc: t.antminerDesc },
              { icon: "🔵", title: t.whatsminer, desc: t.whatsminerDesc },
              { icon: "🟢", title: t.avalon, desc: t.avalonDesc },
              { icon: "🟣", title: t.cpuGpu, desc: t.cpuGpuDesc },
            ].map((h, i) => (
              <div key={i} className="glow-card" style={{
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 14, padding: 24,
                background: "rgba(13,17,23,0.5)",
                textAlign: "center",
                transition: "all 0.3s",
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{h.icon}</div>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{h.title}</h3>
                <p style={{ fontSize: 12, color: "#8b949e", lineHeight: 1.7 }}>{h.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════ TESTIMONIALS ═══════ */}
        <section style={{
          padding: "80px 28px",
          maxWidth: 1000, margin: "0 auto",
        }}>
          <SectionTitle tag="Testimonials" title={t.testimonials} />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
            {testimonials.map((item, i) => (
              <div key={i} style={{
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 14, padding: 24,
                background: "rgba(13,17,23,0.5)",
                display: "flex", flexDirection: "column",
                justifyContent: "space-between",
                transition: "all 0.3s",
              }} className="glow-card">
                <div>
                  <div style={{ marginBottom: 10 }}>
                    {Array(item.rating).fill(0).map((_, i) => (
                      <span key={i} style={{ color: "#f7931a", marginRight: 2, fontSize: 14 }}>★</span>
                    ))}
                  </div>
                  <p style={{ fontSize: 13, color: "#e6edf3", lineHeight: 1.7, marginBottom: 14, fontStyle: "italic" }}>
                    "{item.text}"
                  </p>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#f7931a" }}>{item.author}</div>
                  <div style={{ fontSize: 11, color: "#8b949e" }}>{item.role}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════ CONFIGURATOR ═══════ */}
        <section style={{
          padding: "60px 28px 80px",
          maxWidth: 560, margin: "0 auto",
        }}>
          <div style={{
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 20,
            padding: "36px 32px",
            background: "rgba(13,17,23,0.5)",
          }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{
                fontSize: 36, marginBottom: 12,
              }}>⚡</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Stratum Configurator</h2>
              <p style={{ fontSize: 13, color: "#8b949e", lineHeight: 1.6 }}>{t.configDesc}</p>
            </div>

            <input type="text" placeholder={t.usernameLabel}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
                color: "#e6edf3", fontSize: 14,
                fontFamily: "'JetBrains Mono','Fira Code',monospace",
                outline: "none", marginBottom: 16,
              }}
              onFocus={e => e.target.style.borderColor = "#f7931a"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
            />

            {username && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: t.stratumUrl, value: "stratum+tcp://hashrial.com:3333" },
                  { label: t.stratumUser, value: `${username}.worker1` },
                  { label: t.stratumPass, value: "x" },
                ].map((item, i) => (
                  <div key={i} style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 10, padding: "12px 16px",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    transition: "border 0.2s",
                  }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#8b949e", marginBottom: 3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{item.label}</div>
                      <div style={{ fontSize: 13, fontFamily: "'JetBrains Mono','Fira Code',monospace", color: "#f7931a" }}>{item.value}</div>
                    </div>
                    <button onClick={() => handleCopy(item.value, i)} style={{
                      padding: "6px 14px",
                      background: copied === i ? "rgba(63,185,80,0.12)" : "rgba(247,147,26,0.1)",
                      color: copied === i ? "#3fb950" : "#f7931a",
                      border: `1px solid ${copied === i ? "rgba(63,185,80,0.2)" : "rgba(247,147,26,0.15)"}`,
                      borderRadius: 6, fontSize: 11, fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit",
                      transition: "all 0.2s",
                    }}>
                      {copied === i ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ═══════ FAQ ═══════ */}
        <section id="faq" style={{
          padding: "0 28px 80px",
          maxWidth: 640, margin: "0 auto",
        }}>
          <SectionTitle tag="Support" title={t.faq} />
          {faqData.map((item, i) => (
            <FAQItem key={i} q={item.q} a={item.a} isOpen={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? -1 : i)} />
          ))}
        </section>

        {/* ═══════ CTA ═══════ */}
        <section style={{
          padding: "60px 28px 80px",
          maxWidth: 640, margin: "0 auto",
        }}>
          <div style={{
            border: "1px solid rgba(247,147,26,0.12)",
            borderRadius: 24,
            padding: "48px 36px",
            textAlign: "center",
            background: "linear-gradient(135deg, rgba(247,147,26,0.06), rgba(247,147,26,0.02))",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: "-50%", left: "50%", transform: "translateX(-50%)",
              width: 400, height: 400,
              background: "radial-gradient(circle at center, rgba(247,147,26,0.06) 0%, transparent 60%)",
              pointerEvents: "none",
            }} />
            <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 12, position: "relative" }}>{t.ctaTitle}</h2>
            <p style={{ fontSize: 14, color: "#8b949e", lineHeight: 1.7, marginBottom: 28, maxWidth: 460, margin: "0 auto 28px", position: "relative" }}>
              {t.ctaDesc}
            </p>
            <button onClick={() => navigate("/register")} style={{
              padding: "14px 34px",
              background: "linear-gradient(135deg,#f7931a,#e8830d)",
              color: "#000", border: "none", borderRadius: 12,
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              transition: "all 0.25s", fontFamily: "inherit",
              boxShadow: "0 4px 20px rgba(247,147,26,0.15)",
              position: "relative",
            }}
              onMouseEnter={e => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 8px 30px rgba(247,147,26,0.25)"; }}
              onMouseLeave={e => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 4px 20px rgba(247,147,26,0.15)"; }}
            >
              {t.createAccount} →
            </button>
          </div>
        </section>
      </main>

      {/* ═══════ FOOTER ═══════ */}
      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "48px 28px 32px",
      }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "flex-start",
            flexWrap: "wrap", gap: 32, marginBottom: 40,
          }}>
            <div style={{ maxWidth: 300 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: "linear-gradient(135deg,#f7931a,#e8830d)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 14, color: "#000",
                }}>H</div>
                <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.3px" }}>Hashrial</span>
              </div>
              <p style={{ fontSize: 13, color: "#8b949e", lineHeight: 1.7 }}>
                {t.footerText}
              </p>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#e6edf3", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.5px" }}>Quick Links</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {["Home", "Features", "Hardware", "FAQ", "Support"].map(link => (
                  <a key={link} href={`#${link.toLowerCase()}`} style={{ fontSize: 13, color: "#8b949e", textDecoration: "none", transition: "color 0.2s" }}
                    onMouseEnter={e => e.target.style.color = "#f7931a"}
                    onMouseLeave={e => e.target.style.color = "#8b949e"}
                  >{link}</a>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#e6edf3", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.5px" }}>Account</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Link to="/login" style={{ fontSize: 13, color: "#8b949e", textDecoration: "none", transition: "color 0.2s" }}
                  onMouseEnter={e => e.target.style.color = "#f7931a"}
                  onMouseLeave={e => e.target.style.color = "#8b949e"}
                >Sign In</Link>
                <Link to="/register" style={{ fontSize: 13, color: "#8b949e", textDecoration: "none", transition: "color 0.2s" }}
                  onMouseEnter={e => e.target.style.color = "#f7931a"}
                  onMouseLeave={e => e.target.style.color = "#8b949e"}
                >Create Account</Link>
                <Link to="/dashboard" style={{ fontSize: 13, color: "#8b949e", textDecoration: "none", transition: "color 0.2s" }}
                  onMouseEnter={e => e.target.style.color = "#f7931a"}
                  onMouseLeave={e => e.target.style.color = "#8b949e"}
                >Dashboard</Link>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#e6edf3", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.5px" }}>Language</div>
              <select value={lang} onChange={(e) => setLang(e.target.value)} style={{
                padding: "8px 12px", borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)",
                color: "#e6edf3", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
              }}>
                <option value="en">English</option>
                <option value="fa">فارسی</option>
              </select>
            </div>
          </div>

          <div style={{
            borderTop: "1px solid rgba(255,255,255,0.04)",
            paddingTop: 20,
            display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
            fontSize: 12, color: "#484f58",
          }}>
            <span>© {new Date().getFullYear()} Hashrial. All rights reserved.</span>
            <div style={{ display: "flex", gap: 16 }}>
              <span>Terms</span>
              <span>Privacy</span>
              <span>Contact</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
