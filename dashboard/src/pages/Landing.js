import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

const T = {
  en: {
    subtitle: "High-performance stratum proxy with a transparent 2% fee model. 98% of your hashrate goes directly to your own Antpool sub-account.",
    startMining: "Start Mining Now",
    memberArea: "Member Area",
    activeMiners: "Active Workers",
    btcPrice: "Bitcoin Price",
    configDesc: "Enter your Hashrial username below to generate your personalized ASIC configuration.",
    usernameLabel: "Your Username",
    stratumUrl: "Stratum URL",
    stratumUser: "Worker Username",
    stratumPass: "Password",
    copy: "Copy",
    copied: "Copied!",
    whyUs: "Why Hashrial?",
    whyUs1: "98% of your hashrate goes directly to your personal Antpool sub-account. Fully transparent, no hidden fees.",
    whyUs2: "Standard 2% share-routing fee. Every 50th share goes to infrastructure. Same model as F2Pool, ViaBTC, Slushpool.",
    whyUs3: "Multilingual dashboard with real-time charts, worker monitoring, earnings tracking, and instant notifications.",
    testimonials: "Trusted by Miners Worldwide",
    faq: "Frequently Asked Questions",
    footerText: "Hashrial Mining Pool. Fully decentralized stratum proxy with direct Antpool integration.",
    home: "Home",
    features: "Features",
    faqLink: "FAQ",
    support: "Support",
    login: "Login",
    signUp: "Sign Up",
    heroTag: "BITCOIN MINING POOL",
    heroStats: "Live Pool Statistics",
    poolHashrate: "Pool Hashrate",
    onlineMiners: "Online Workers",
    totalUsers: "Total Users",
    feeText: "2% Fee",
    liveStats: "Live Stats",
    poolStats: "Pool Status",
    statNote: "Available once backend is connected",
    connecting: "Connecting...",
  },
  fa: {
    subtitle: "پراکسی استراتوم با کارایی بالا و مدل کارمزد ۲٪ شفاف. ۹۸٪ از هش‌ریت شما مستقیماً به حساب شخصی شما در آنت‌پول واریز می‌شود.",
    startMining: "شروع ماینینگ",
    memberArea: "ورود کاربران",
    activeMiners: "کارگران فعال",
    btcPrice: "قیمت بیت‌کوین",
    configDesc: "نام کاربری خود را وارد کنید تا دستورات پیکربندی ASIC تولید شود.",
    usernameLabel: "نام کاربری شما",
    stratumUrl: "آدرس Stratum",
    stratumUser: "نام کارگر",
    stratumPass: "رمز عبور",
    copy: "کپی",
    copied: "کپی شد!",
    whyUs: "چرا Hashrial؟",
    whyUs1: "۹۸٪ از هش‌ریت شما مستقیماً به حساب شخصی شما در آنت‌پول منتقل می‌شود. کاملاً شفاف، بدون کارمزد پنهان.",
    whyUs2: "کارمزد استاندارد ۲٪. هر پنجاهمین سهم به زیرساخت اختصاص می‌یابد.",
    whyUs3: "داشبورد چندزبانه با نمودارهای زنده، مانیتورینگ کارگران، پیگیری درآمد و اعلان‌های فوری.",
    testimonials: "مورد اعتماد ماینرها در سراسر جهان",
    faq: "سوالات متداول",
    footerText: "استخر ماینینگ Hashrial. پراکسی استراتوم غیرمتمرکز با ادغام مستقیم آنت‌پول.",
    home: "خانه",
    features: "ویژگی‌ها",
    faqLink: "سوالات",
    support: "پشتیبانی",
    login: "ورود",
    signUp: "ثبت‌نام",
    heroTag: "استخر ماینینگ بیت‌کوین",
    heroStats: "آمار زنده استخر",
    poolHashrate: "هش‌ریت استخر",
    onlineMiners: "کارگران آنلاین",
    totalUsers: "کاربران کل",
    feeText: "کارمزد ۲٪",
    liveStats: "آمار زنده",
    poolStats: "وضعیت استخر",
    statNote: "پس از اتصال Backend در دسترس خواهد بود",
    connecting: "در حال اتصال...",
  },
};

const faqData = [
  { q: "How much is the pool fee?", a: "2% per share routed. Every 50th share goes to infrastructure. The remaining 98% of your hashrate is routed directly to your personal Antpool sub-account." },
  { q: "Do I need to create an Antpool account?", a: "No. Hashrial automatically routes your hashrate to your personal Antpool sub-account. You just need a Hashrial account." },
  { q: "What's the minimum payout?", a: "0.001 BTC. Payouts are processed weekly to your Bitcoin address." },
  { q: "Can I use multiple workers?", a: "Yes. Set worker names in your ASIC configuration (e.g., rig01, rig02, rig03)." },
  { q: "Is there any hidden fees?", a: "No. Everything is transparent. You only pay the 2% pool fee. No hidden cuts, no admin fees." },
  { q: "What happens if the pool goes down?", a: "Your miners automatically fail over to Antpool if Hashrial disconnects. Your earnings are safe." },
];

function FAQItem({ q, a, isOpen, onClick }) {
  return (
    <div style={{
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 12,
      marginBottom: 8,
      overflow: "hidden",
      transition: "all 0.3s",
    }}>
      <button onClick={onClick} style={{
        width: "100%", padding: "16px 20px",
        background: isOpen ? "rgba(247,147,26,0.06)" : "transparent",
        border: "none", textAlign: "left", cursor: "pointer",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: "14px", fontWeight: 500, color: "#e6edf3",
        fontFamily: "inherit",
        transition: "all 0.2s",
      }}>
        <span>{q}</span>
        <span style={{
          transform: isOpen ? "rotate(180deg)" : "rotate(0)",
          transition: "transform 0.3s", color: "#f7931a", fontSize: 12,
        }}>▼</span>
      </button>
      {isOpen && (
        <div style={{
          padding: "4px 20px 16px",
          fontSize: "13px", color: "#8b949e", lineHeight: 1.7,
        }}>
          {a}
        </div>
      )}
    </div>
  );
}

function PulseStat({ label, value, sub, accent }) {
  return (
    <div style={{
      background: "rgba(13,17,23,0.6)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 16,
      padding: "20px 24px",
      textAlign: "center",
      flex: "1 1 160px",
      minWidth: 140,
      backdropFilter: "blur(8px)",
    }}>
      <div style={{ fontSize: "10px", color: "#8b949e", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: "24px", fontWeight: 700, color: accent || "#f7931a", fontFamily: "'JetBrains Mono','Fira Code',monospace", letterSpacing: "-0.5px" }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: "#8b949e", marginTop: 4 }}>{sub}</div>}
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

  const navLinkStyle = (isActive) => ({
    fontSize: "13px",
    fontWeight: 500,
    color: isActive ? "#f7931a" : "#8b949e",
    textDecoration: "none",
    padding: "6px 14px",
    borderRadius: 6,
    transition: "all 0.2s",
    cursor: "pointer",
    background: isActive ? "rgba(247,147,26,0.08)" : "transparent",
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
          0%,100%{transform:translateY(0)}
          50%{transform:translateY(-10px)}
        }
        @keyframes fadeUp {
          from{opacity:0;transform:translateY(20px)}
          to{opacity:1;transform:translateY(0)}
        }
        @keyframes pulse {
          0%,100%{opacity:1}
          50%{opacity:0.4}
        }
        @keyframes glow {
          0%,100%{box-shadow:0 0 20px rgba(247,147,26,0.1)}
          50%{box-shadow:0 0 40px rgba(247,147,26,0.25)}
        }
        .hero-glow{animation:glow 3s ease-in-out infinite}
        .float-anim{animation:float 6s ease-in-out infinite}
        .fade-up{animation:fadeUp 0.6s ease-out forwards}
        .pulse-dot{animation:pulse 2s ease-in-out infinite}
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg,#f7931a,#e8830d)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 16, color: "#000",
            }}>H</div>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.3px" }}>Hashrial</span>
          </div>
          <nav style={{ display: "flex", gap: 4 }}>
            <a href="#" style={navLinkStyle(true)}>{t.home}</a>
            <a href="#features" style={navLinkStyle(false)}>{t.features}</a>
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
        {/* Hero Section */}
        <section style={{
          minHeight: "100vh",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "100px 28px 60px",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Background gradient */}
          <div style={{
            position: "absolute", top: "-50%", left: "50%", transform: "translateX(-50%)",
            width: 800, height: 800,
            background: "radial-gradient(circle at center, rgba(247,147,26,0.08) 0%, transparent 60%)",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", bottom: "-30%", right: "-20%",
            width: 600, height: 600,
            background: "radial-gradient(circle at center, rgba(247,147,26,0.05) 0%, transparent 50%)",
            pointerEvents: "none",
          }} />

          <div style={{
            display: "flex", alignItems: "center", gap: 16,
            marginBottom: 24,
            padding: "6px 16px",
            border: "1px solid rgba(247,147,26,0.15)",
            borderRadius: 100,
            background: "rgba(247,147,26,0.04)",
            fontSize: 11, fontWeight: 600, color: "#f7931a",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3fb950", display: "inline-block" }} />
            {t.heroTag}
          </div>

          <h1 style={{
            fontSize: 56, fontWeight: 800,
            textAlign: "center",
            lineHeight: 1.08,
            marginBottom: 16,
            letterSpacing: "-1.5px",
            maxWidth: 700,
          }}>
            Mine Bitcoin With{" "}
            <span style={{
              background: "linear-gradient(135deg,#f7931a,#e8830d,#f7931a)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>Full Transparency</span>
          </h1>

          <p style={{
            fontSize: 16, color: "#8b949e",
            maxWidth: 520, textAlign: "center",
            lineHeight: 1.7, marginBottom: 36,
          }}>
            {t.subtitle}
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <button onClick={() => navigate("/register")} style={{
              padding: "14px 32px",
              background: "linear-gradient(135deg,#f7931a,#e8830d)",
              color: "#000", border: "none", borderRadius: 12,
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              transition: "all 0.2s",
              fontFamily: "inherit",
            }}
              onMouseEnter={e => e.target.style.transform = "translateY(-1px)"}
              onMouseLeave={e => e.target.style.transform = "translateY(0)"}
            >
              {t.startMining} →
            </button>
            <button onClick={() => {
              const token = localStorage.getItem("hashrial_token");
              if (token) navigate("/dashboard");
              else navigate("/login");
            }} style={{
              padding: "14px 28px",
              background: "transparent",
              color: "#e6edf3", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer",
              transition: "all 0.2s", fontFamily: "inherit",
            }}
              onMouseEnter={e => e.target.style.borderColor = "#f7931a"}
              onMouseLeave={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
            >
              {t.memberArea} →
            </button>
          </div>

          {/* Stats */}
          <div style={{
            display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center",
            marginTop: 60, width: "100%", maxWidth: 700,
          }}>
            <PulseStat label={t.activeMiners}
              value={statsLoading ? "—" : `${poolStats?.activeWorkers || 0}`}
              sub={statsLoading ? t.connecting : "Mining Now"}
              accent="#3fb950" />
            <PulseStat label={t.btcPrice}
              value={btcPrice?.price ? `$${btcPrice.price.toLocaleString()}` : "—"}
              sub={!statsLoading && btcPrice?.change ? `${btcPrice.change >= 0 ? "▲" : "▼"} ${Math.abs(btcPrice.change).toFixed(1)}%` : t.feeText}
              accent="#f7931a" />
            <PulseStat label={t.feeText}
              value="2%"
              sub="Share Routing"
              accent="#e6edf3" />
          </div>
        </section>

        {/* Why Hashrial */}
        <section id="features" style={{
          padding: "80px 28px",
          maxWidth: 1100, margin: "0 auto",
        }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: "#f7931a",
              letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 12,
            }}>{t.features}</div>
            <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.5px" }}>{t.whyUs}</h2>
          </div>

          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20,
          }}>
            {[
              { num: "01", title: "Direct Antpool Routing", desc: t.whyUs1, icon: "⛓" },
              { num: "02", title: "Transparent 2% Fee", desc: t.whyUs2, icon: "💰" },
              { num: "03", title: "Real-time Dashboard", desc: t.whyUs3, icon: "📊" },
            ].map((f, i) => (
              <div key={i} style={{
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 16, padding: 28,
                background: "rgba(13,17,23,0.5)",
                transition: "all 0.3s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(247,147,26,0.2)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <div style={{ fontSize: 28, marginBottom: 16 }}>{f.icon}</div>
                <div style={{ fontSize: 11, color: "#8b949e", fontWeight: 600, marginBottom: 6 }}>{f.num}</div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: "#8b949e", lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Configurator */}
        <section style={{
          padding: "60px 28px 80px",
          maxWidth: 600, margin: "0 auto",
        }}>
          <div style={{
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 20,
            padding: "36px 32px",
            background: "rgba(13,17,23,0.5)",
          }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>⚡</div>
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
                  }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#8b949e", marginBottom: 3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{item.label}</div>
                      <div style={{ fontSize: 13, fontFamily: "'JetBrains Mono','Fira Code',monospace", color: "#f7931a" }}>{item.value}</div>
                    </div>
                    <button onClick={() => handleCopy(item.value, i)} style={{
                      padding: "6px 14px",
                      background: copied === i ? "rgba(63,185,80,0.15)" : "rgba(247,147,26,0.1)",
                      color: copied === i ? "#3fb950" : "#f7931a",
                      border: `1px solid ${copied === i ? "rgba(63,185,80,0.2)" : "rgba(247,147,26,0.15)"}`,
                      borderRadius: 6, fontSize: 11, fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit",
                    }}>
                      {copied === i ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" style={{
          padding: "0 28px 80px",
          maxWidth: 640, margin: "0 auto",
        }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px" }}>{t.faq}</h2>
          </div>
          {faqData.map((item, i) => (
            <FAQItem key={i} q={item.q} a={item.a} isOpen={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? -1 : i)} />
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "40px 28px",
        textAlign: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            background: "linear-gradient(135deg,#f7931a,#e8830d)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 12, color: "#000",
          }}>H</div>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Hashrial</span>
        </div>
        <div style={{ fontSize: 13, color: "#8b949e", maxWidth: 400, margin: "0 auto", lineHeight: 1.6 }}>
          {t.footerText}
        </div>
        <div style={{ marginTop: 24, fontSize: 12, color: "#484f58" }}>
          © {new Date().getFullYear()} Hashrial. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
