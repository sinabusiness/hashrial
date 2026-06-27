import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧", dir: "ltr" },
  { code: "ar", label: "العربية", flag: "🇸🇦", dir: "rtl" },
  { code: "fa", label: "فارسی", flag: "🇮🇷", dir: "rtl" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷", dir: "ltr" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳", dir: "ltr" },
  { code: "ur", label: "اردو", flag: "🇵🇰", dir: "rtl" },
  { code: "bn", label: "বাংলা", flag: "🇧🇩", dir: "ltr" },
  { code: "zh", label: "中文", flag: "🇨🇳", dir: "ltr" },
  { code: "ru", label: "Русский", flag: "🇷🇺", dir: "ltr" },
  { code: "uk", label: "Українська", flag: "🇺🇦", dir: "ltr" },
  { code: "es", label: "Español", flag: "🇪🇸", dir: "ltr" },
  { code: "pt", label: "Português", flag: "🇵🇹", dir: "ltr" },
  { code: "de", label: "Deutsch", flag: "🇩🇪", dir: "ltr" },
  { code: "fr", label: "Français", flag: "🇫🇷", dir: "ltr" },
  { code: "ja", label: "日本語", flag: "🇯🇵", dir: "ltr" },
  { code: "ko", label: "한국어", flag: "🇰🇷", dir: "ltr" },
  { code: "id", label: "Bahasa Indonesia", flag: "🇮🇩", dir: "ltr" },
];

const T = {
  en: {
    navHome: "Home", navFeatures: "Features", navMining: "How to Mine", navFaq: "FAQ",
    login: "Login", signUp: "Sign Up",
    heroTitle1: "Mine Bitcoin",
    heroTitle2: "With Zero Compromise",
    heroSub: "Professional-grade stratum proxy. 2% flat fee. 98% hashrate delivered straight to your account. Full transparency, no hidden cuts.",
    heroCta: "Start Mining Free",
    heroStat1: "Active Workers",
    heroStat2: "Pool Hashrate",
    heroStat3: "Blocks Found",
    howTitle: "Start Mining in 3 Minutes",
    howSub: "Get connected and earning Bitcoin faster than any other pool.",
    howStep1: "Create Account",
    howStep1Desc: "Register in seconds with your email. Choose a username — this becomes your pool identity.",
    howStep2: "Configure Miner",
    howStep2Desc: "Point your ASIC or software to stratum+tcp://hashrial.com:3333 using your username as the worker.",
    howStep3: "Track & Earn",
    howStep3Desc: "Monitor your hashrate, shares, and earnings in real-time. Request payouts anytime above 0.001 BTC.",
    featuresTitle: "Built for Serious Miners",
    featuresSub: "Every feature designed to maximize your mining profitability and give you full control.",
    feat1: "2% Flat Fee",
    feat1Desc: "Predictable pricing. Every 50th share covers infrastructure — you keep 98% with zero surprises.",
    feat2: "Real-time Dashboard",
    feat2Desc: "Live hashrate charts, worker monitoring, earnings history, and payout management in one place.",
    feat3: "Enterprise Security",
    feat3Desc: "JWT authentication, rate limiting, CORS protection, and SQL injection prevention out of the box.",
    feat4: "Multi-language",
    feat4Desc: "Full interface support for English, Arabic, Persian, Turkish, Hindi, Urdu, Bengali, Chinese, Russian, Ukrainian, Spanish, Portuguese, German, French, Japanese, Korean, and Indonesian.",
    feat5: "Global Low Latency",
    feat5Desc: "Handle thousands of concurrent Stratum connections with sub-millisecond routing latency.",
    feat6: "Instant Payouts",
    feat6Desc: "Request withdrawals anytime. Minimum 0.001 BTC. Weekly batch processing with full on-chain tracking.",
    hardwareTitle: "Works With Every Major ASIC",
    hardwareSub: "Antminer, Whatsminer, Avalon, GPU rigs — if it speaks Stratum, it mines here.",
    faqTitle: "Frequently Asked Questions",
    faq1q: "What is the pool fee?",
    faq1a: "2% per share. Every 50th share goes to pool infrastructure. The remaining 98% of your hashrate routes directly to your personal account. This is the same model used by F2Pool, ViaBTC, and Slushpool.",
    faq2q: "Do I need my own pool account?",
    faq2a: "No. Hashrial handles everything on the backend. You just register here, configure your miners with your username, and start earning. We manage the sub-account mapping for you.",
    faq3q: "What is the minimum payout?",
    faq3a: "0.001 BTC (~$60-100 depending on market price). Payouts are processed weekly to your Bitcoin address. Set your payout address in Settings anytime.",
    faq4q: "Can I use multiple workers?",
    faq4a: "Yes. Use worker names in your config like username.rig01, username.rig02. Each worker appears separately in your dashboard with its own hashrate and share count.",
    faq5q: "Is there any hidden fee?",
    faq5a: "No. Everything is transparent. 2% pool fee. No hidden cuts, no admin fees, no withdrawal fees. Your exact share count is visible in the dashboard.",
    faq6q: "What if the pool disconnects?",
    faq6a: "Your miners automatically fail over to the upstream pool if Hashrial disconnects. Your earnings are never lost. The proxy is built for automatic reconnection.",
    faq7q: "Which hardware is compatible?",
    faq7a: "All Stratum-compatible hardware: Antminer (S19/S21 series), Whatsminer (M50/M60 series), Avalon (A12-A15), CGminer, BFGminer, Awesome Miner, and any Stratum software on port 3333.",
    faq8q: "How do payouts work?",
    faq8a: "Set your Bitcoin address in Settings. When your balance exceeds 0.001 BTC, request a payout. We process every Friday. Transaction IDs are visible in your earnings history.",
    ctaTitle: "Ready to Start Mining?",
    ctaDesc: "Join hundreds of miners earning Bitcoin with Hashrial's transparent 2% fee model. No hidden costs, no tricks.",
    ctaBtn: "Create Free Account",
    footerText: "Professional Bitcoin mining pool. Low fees, high reliability, full transparency.",
    quickLinks: "Quick Links", account: "Account",
    signIn: "Sign In", createAccount: "Create Account",
    language: "Language", allRights: "All rights reserved.",
    terms: "Terms", privacy: "Privacy", contact: "Contact",
    poolFee: "2% Flat Fee",
  },
  fa: {
    navHome: "خانه", navFeatures: "ویژگی‌ها", navMining: "نحوه ماینینگ", navFaq: "سوالات",
    login: "ورود", signUp: "ثبت‌نام",
    heroTitle1: "بیت‌کوین استخراج کنید",
    heroTitle2: "بدون هیچ مصالحه‌ای",
    heroSub: "پراکسی استراتوم حرفه‌ای. کارمزد ثابت ۲٪. ۹۸٪ هش‌ریت مستقیماً به حساب شما. شفافیت کامل، بدون هزینه پنهان.",
    heroCta: "شروع رایگان ماینینگ",
    heroStat1: "کارگران فعال",
    heroStat2: "هش‌ریت استخر",
    heroStat3: "بلاک‌های یافت شده",
    howTitle: "در ۳ دقیقه شروع کنید",
    howSub: "سریع‌تر از هر استخر دیگری متصل شوید و درآمد کسب کنید.",
    howStep1: "ایجاد حساب",
    howStep1Desc: "با ایمیل خود ثبت‌نام کنید. یک نام کاربری انتخاب کنید — هویت شما در استخر.",
    howStep2: "تنظیم ماینر",
    howStep2Desc: "ASIC یا نرم‌افزار خود را به stratum+tcp://hashrial.com:3333 متصل کنید.",
    howStep3: "ردیابی و درآمد",
    howStep3Desc: "هش‌ریت، سهم‌ها و درآمد خود را به صورت زنده مشاهده کنید. درخواست پرداخت از ۰.۰۰۱ BTC.",
    featuresTitle: "طراحی شده برای ماینرهای حرفه‌ای",
    featuresSub: "هر ویژگی برای حداکثر سودآوری ماینینگ و کنترل کامل طراحی شده است.",
    feat1: "کارمزد ثابت ۲٪",
    feat1Desc: "قیمت‌گذاری قابل پیش‌بینی. هر پنجاهمین سهم برای زیرساخت — ۹۸٪ برای شما.",
    feat2: "داشبورد زنده",
    feat2Desc: "نمودارهای زنده هش‌ریت، مانیتورینگ کارگران، تاریخچه درآمد و مدیریت پرداخت.",
    feat3: "امنیت سازمانی",
    feat3Desc: "احراز هویت JWT، محدودیت نرخ، محافظت CORS و جلوگیری از SQL Injection.",
    feat4: "چند زبانه",
    feat4Desc: "پشتیبانی کامل از انگلیسی، فارسی، چینی، روسی، اسپانیایی و پرتغالی.",
    feat5: "تأخیر کم جهانی",
    feat5Desc: "مدیریت هزاران اتصال همزمان Stratum با تأخیر زیر میلی‌ثانیه.",
    feat6: "پرداخت فوری",
    feat6Desc: "درخواست برداشت هر زمان. حداقل ۰.۰۰۱ BTC. پرداخت هفتگی با رهگیری کامل بلاکچین.",
    hardwareTitle: "کار با تمام ASIC های اصلی",
    hardwareSub: "Antminer، Whatsminer، Avalon، GPU — اگر از Stratum پشتیبانی کند، اینجا کار می‌کند.",
    faqTitle: "سوالات متداول",
    faq1q: "کارمزد استخر چقدر است؟",
    faq1a: "۲٪ به ازای هر سهم. هر پنجاهمین سهم به زیرساخت استخر می‌رود. ۹۸٪ باقی مانده مستقیماً به حساب شما واریز می‌شود.",
    faq2q: "آیا به حساب استخر جداگانه نیاز دارم؟",
    faq2a: "خیر. Hashrial همه چیز را در بک‌اند مدیریت می‌کند. شما فقط ثبت‌نام کنید، ماینرها را تنظیم کنید و درآمد کسب کنید.",
    faq3q: "حداقل پرداخت چقدر است؟",
    faq3a: "۰.۰۰۱ BTC. پرداخت‌ها هفتگی به آدرس بیت‌کوین شما انجام می‌شود.",
    faq4q: "آیا می‌توانم از چند کارگر استفاده کنم؟",
    faq4a: "بله. از نام‌های کارگر مانند username.rig01 و username.rig02 استفاده کنید.",
    faq5q: "آیا هزینه پنهانی وجود دارد؟",
    faq5a: "خیر. همه چیز شفاف است. کارمزد ۲٪. بدون هزینه پنهان، بدون کارمزد اداری، بدون کارمزد برداشت.",
    faq6q: "اگر استخر قطع شود چه؟",
    faq6a: "ماینرهای شما به طور خودکار به استخر بالادستی متصل می‌شوند. درآمد شما هرگز از دست نمی‌رود.",
    faq7q: "کدام سخت‌افزار سازگار است؟",
    faq7a: "تمام سخت‌افزارهای سازگار با Stratum: Antminer، Whatsminer، Avalon، CGMiner، BFGMiner و غیره.",
    faq8q: "پرداخت‌ها چگونه کار می‌کنند؟",
    faq8a: "آدرس بیت‌کوین خود را در تنظیمات وارد کنید. وقتی موجودی از ۰.۰۰۱ BTC بیشتر شد، درخواست پرداخت دهید.",
    ctaTitle: "آماده شروع ماینینگ هستید؟",
    ctaDesc: "به جمع ماینرهایی بپیوندید که با مدل شفاف ۲٪ Hashrial بیت‌کوین استخراج می‌کنند.",
    ctaBtn: "ایجاد حساب رایگان",
    footerText: "استخر حرفه‌ای ماینینگ بیت‌کوین. کارمزد کم، قابلیت اطمینان بالا، شفافیت کامل.",
    quickLinks: "لینک‌های سریع", account: "حساب",
    signIn: "ورود", createAccount: "ایجاد حساب",
    language: "زبان", allRights: "تمام حقوق محفوظ است.",
    terms: "شرایط", privacy: "حریم خصوصی", contact: "تماس",
    poolFee: "کارمزد ثابت ۲٪",
  },
  zh: {
    navHome: "首页", navFeatures: "特点", navMining: "如何挖矿", navFaq: "常见问题",
    login: "登录", signUp: "注册",
    heroTitle1: "比特币挖矿",
    heroTitle2: "零妥协",
    heroSub: "专业级 Stratum 代理。固定 2% 费用。98% 算力直接进入您的账户。完全透明，无隐藏费用。",
    heroCta: "免费开始挖矿",
    heroStat1: "活跃矿工",
    heroStat2: "矿池算力",
    heroStat3: "已发现区块",
    howTitle: "3 分钟开始挖矿",
    howSub: "比任何其他矿池更快连接并开始赚取。",
    howStep1: "创建账户",
    howStep1Desc: "用您的邮箱注册。选择一个用户名 — 这是您的矿池身份。",
    howStep2: "配置矿机",
    howStep2Desc: "将您的 ASIC 或软件指向 stratum+tcp://hashrial.com:3333。",
    howStep3: "跟踪并赚取",
    howStep3Desc: "实时监控您的算力、份额和收益。随时请求支付，最低 0.001 BTC。",
    featuresTitle: "为专业矿工打造",
    featuresSub: "每个功能都旨在最大化您的挖矿盈利能力和完全控制。",
    feat1: "固定 2% 费用",
    feat1Desc: "可预测的定价。每第50个份额用于基础设施 — 您保留98%。",
    feat2: "实时仪表板",
    feat2Desc: "实时算力图表、矿工监控、收益历史记录和支付管理。",
    feat3: "企业级安全",
    feat3Desc: "JWT 认证、速率限制、CORS 保护、SQL 注入防护。",
    feat4: "多语言",
    feat4Desc: "支持英语、中文、俄语、西班牙语、葡萄牙语、波斯语。",
    feat5: "全球低延迟",
    feat5Desc: "处理数千个并发 Stratum 连接，亚毫秒级路由延迟。",
    feat6: "即时支付",
    feat6Desc: "随时请求提款。最低 0.001 BTC。每周处理，完整的链上跟踪。",
    hardwareTitle: "兼容所有主要 ASIC",
    hardwareSub: "Antminer、Whatsminer、Avalon、GPU 矿机 — 只要支持 Stratum 就可以。",
    faqTitle: "常见问题",
    faq1q: "矿池费用是多少？",
    faq1a: "每份额 2%。每第50个份额用于矿池基础设施。98% 的算力直接进入您的个人账户。",
    faq2q: "我需要自己的矿池账户吗？",
    faq2a: "不需要。Hashrial 在后端处理一切。您只需注册、配置矿机即可开始。",
    faq3q: "最低支付额是多少？",
    faq3a: "0.001 BTC。每周支付到您的比特币地址。",
    faq4q: "可以使用多个矿工吗？",
    faq4a: "可以。在配置中使用 username.rig01、username.rig02 等工作名称。",
    faq5q: "有隐藏费用吗？",
    faq5a: "没有。完全透明。2% 矿池费用。无隐藏费用、无管理费、无提款费。",
    faq6q: "如果矿池断开连接怎么办？",
    faq6a: "如果 Hashrial 断开，您的矿机将自动切换到上游矿池。收益永远不会丢失。",
    faq7q: "哪些硬件兼容？",
    faq7a: "所有兼容 Stratum 的硬件：Antminer、Whatsminer、Avalon、CGMiner、BFGMiner 等。",
    faq8q: "支付如何工作？",
    faq8a: "在设置中输入您的比特币地址。余额超过 0.001 BTC 时请求支付。每周五处理。",
    ctaTitle: "准备好开始挖矿了吗？",
    ctaDesc: "加入数百名矿工，通过 Hashrial 透明 2% 费率模式赚取比特币。",
    ctaBtn: "创建免费账户",
    footerText: "专业比特币矿池。低费用、高可靠性、完全透明。",
    quickLinks: "快速链接", account: "账户",
    signIn: "登录", createAccount: "创建账户",
    language: "语言", allRights: "版权所有。",
    terms: "条款", privacy: "隐私", contact: "联系",
    poolFee: "固定 2% 费率",
  },
  ru: {
    navHome: "Главная", navFeatures: "Возможности", navMining: "Как майнить", navFaq: "FAQ",
    login: "Войти", signUp: "Регистрация",
    heroTitle1: "Майнинг Биткоина",
    heroTitle2: "Без Компромиссов",
    heroSub: "Профессиональный Stratum-прокси. Фиксированная комиссия 2%. 98% хешрейта напрямую на ваш счет. Полная прозрачность.",
    heroCta: "Начать майнинг",
    heroStat1: "Активные майнеры",
    heroStat2: "Хешрейт пула",
    heroStat3: "Найдено блоков",
    howTitle: "Начните за 3 минуты",
    howSub: "Подключайтесь и зарабатывайте быстрее, чем на любом другом пуле.",
    howStep1: "Создать аккаунт",
    howStep1Desc: "Зарегистрируйтесь с email. Выберите имя пользователя — ваш идентификатор в пуле.",
    howStep2: "Настроить майнер",
    howStep2Desc: "Направьте ваш ASIC на stratum+tcp://hashrial.com:3333, используя ваше имя пользователя.",
    howStep3: "Отслеживайте",
    howStep3Desc: "Мониторьте хешрейт, шеры и доход в реальном времени. Запрашивайте выплаты от 0.001 BTC.",
    featuresTitle: "Для серьезных майнеров",
    featuresSub: "Каждая функция для максимальной прибыльности и полного контроля.",
    feat1: "Фикс. комиссия 2%",
    feat1Desc: "Каждая 50-я шера на инфраструктуру — вы сохраняете 98%. Без сюрпризов.",
    feat2: "Дашборд онлайн",
    feat2Desc: "Графики хешрейта, мониторинг майнеров, история доходов и выплат.",
    feat3: "Безопасность",
    feat3Desc: "JWT аутентификация, лимиты запросов, CORS защита, SQL-инъекции.",
    feat4: "Многоязычность",
    feat4Desc: "Английский, русский, китайский, испанский, португальский, персидский.",
    feat5: "Низкая задержка",
    feat5Desc: "Тысячи Stratum-соединений с субмиллисекундной задержкой.",
    feat6: "Мгновенные выплаты",
    feat6Desc: "Запрашивайте вывод в любое время. От 0.001 BTC. Еженедельные выплаты.",
    hardwareTitle: "Работает со всеми ASIC",
    hardwareSub: "Antminer, Whatsminer, Avalon, GPU — если поддерживает Stratum, майнит здесь.",
    faqTitle: "Часто задаваемые вопросы",
    faq1q: "Какая комиссия пула?",
    faq1a: "2% за шеру. Каждая 50-я шера идет на инфраструктуру. 98% хешрейта напрямую вам.",
    faq2q: "Нужен свой аккаунт пула?",
    faq2a: "Нет. Hashrial управляет всем. Просто зарегистрируйтесь и настройте майнеры.",
    faq3q: "Минимальная выплата?",
    faq3a: "0.001 BTC. Еженедельные выплаты на ваш Bitcoin адрес.",
    faq4q: "Можно несколько майнеров?",
    faq4a: "Да. Используйте имена: username.rig01, username.rig02 и т.д.",
    faq5q: "Есть скрытые комиссии?",
    faq5a: "Нет. Полная прозрачность. 2% комиссия пула. Без скрытых платежей.",
    faq6q: "Что если пул отключится?",
    faq6a: "Майнеры автоматически переключатся на вышестоящий пул. Доход не теряется.",
    faq7q: "Какое оборудование подходит?",
    faq7a: "Все Stratum-совместимое: Antminer, Whatsminer, Avalon, CGMiner, BFGMiner и др.",
    faq8q: "Как работают выплаты?",
    faq8a: "Укажите Bitcoin адрес в настройках. При балансе от 0.001 BTC запросите выплату.",
    ctaTitle: "Готовы начать майнинг?",
    ctaDesc: "Присоединяйтесь к сотням майнеров с прозрачной комиссией 2%.",
    ctaBtn: "Создать аккаунт",
    footerText: "Профессиональный Bitcoin майнинг-пул. Низкие комиссии, надежность, прозрачность.",
    quickLinks: "Быстрые ссылки", account: "Аккаунт",
    signIn: "Войти", createAccount: "Создать аккаунт",
    language: "Язык", allRights: "Все права защищены.",
    terms: "Условия", privacy: "Конфиденциальность", contact: "Контакты",
    poolFee: "Комиссия 2%",
  },
  es: {
    navHome: "Inicio", navFeatures: "Características", navMining: "Cómo Minar", navFaq: "FAQ",
    login: "Iniciar", signUp: "Registrarse",
    heroTitle1: "Minar Bitcoin",
    heroTitle2: "Sin Compromisos",
    heroSub: "Proxy Stratum profesional. Tarifa fija del 2%. 98% del hashrate directo a su cuenta. Transparencia total.",
    heroCta: "Empezar Gratis",
    heroStat1: "Trabajadores Activos",
    heroStat2: "Hashrate del Pool",
    heroStat3: "Bloques Encontrados",
    howTitle: "Empiece en 3 Minutos",
    howSub: "Conéctese y gane más rápido que en cualquier otro pool.",
    howStep1: "Crear Cuenta",
    howStep1Desc: "Regístrese con su email. Elija un nombre de usuario — su identidad en el pool.",
    howStep2: "Configurar Minero",
    howStep2Desc: "Apunte su ASIC a stratum+tcp://hashrial.com:3333 usando su usuario.",
    howStep3: "Monitoree y Gane",
    howStep3Desc: "Vea hashrate, shares y ganancias en tiempo real. Solicite pagos desde 0.001 BTC.",
    featuresTitle: "Para Mineros Serios",
    featuresSub: "Cada función maximiza su rentabilidad y le da control total.",
    feat1: "Tarifa Fija 2%",
    feat1Desc: "Cada 50ª share para infraestructura — usted conserva el 98%. Sin sorpresas.",
    feat2: "Dashboard en Vivo",
    feat2Desc: "Gráficos de hashrate, monitoreo de workers, historial de ganancias y pagos.",
    feat3: "Seguridad Empresarial",
    feat3Desc: "Autenticación JWT, límites de tasa, protección CORS y SQL injection.",
    feat4: "Multilenguaje",
    feat4Desc: "Inglés, español, chino, ruso, portugués y persa.",
    feat5: "Baja Latencia Global",
    feat5Desc: "Miles de conexiones Stratum con latencia de submilisegundos.",
    feat6: "Pagos Instantáneos",
    feat6Desc: "Solicite retiros cuando quiera. Mínimo 0.001 BTC. Pagos semanales.",
    hardwareTitle: "Funciona con Todo ASIC",
    hardwareSub: "Antminer, Whatsminer, Avalon, GPU — si habla Stratum, mina aquí.",
    faqTitle: "Preguntas Frecuentes",
    faq1q: "¿Cuál es la tarifa del pool?",
    faq1a: "2% por share. Cada 50ª share va a infraestructura. El 98% del hashrate va directo a su cuenta.",
    faq2q: "¿Necesito mi propia cuenta?",
    faq2a: "No. Hashrial maneja todo. Solo regístrese y configure sus mineros.",
    faq3q: "¿Pago mínimo?",
    faq3a: "0.001 BTC. Pagos semanales a su dirección Bitcoin.",
    faq4q: "¿Puedo usar varios workers?",
    faq4a: "Sí. Use nombres como username.rig01, username.rig02.",
    faq5q: "¿Hay tarifas ocultas?",
    faq5a: "No. Transparencia total. 2% de comisión. Sin cargos ocultos.",
    faq6q: "¿Si el pool se desconecta?",
    faq6a: "Sus mineros cambian automáticamente al pool upstream. Sus ganancias nunca se pierden.",
    faq7q: "¿Qué hardware es compatible?",
    faq7a: "Todo hardware compatible con Stratum: Antminer, Whatsminer, Avalon, CGMiner, etc.",
    faq8q: "¿Cómo funcionan los pagos?",
    faq8a: "Configure su dirección Bitcoin. Cuando supere 0.001 BTC, solicite el pago.",
    ctaTitle: "¿Listo para Minar?",
    ctaDesc: "Únase a cientos de mineros con el modelo transparente de 2%.",
    ctaBtn: "Crear Cuenta Gratis",
    footerText: "Pool profesional de minería Bitcoin. Bajas tarifas, alta confiabilidad, transparencia.",
    quickLinks: "Enlaces", account: "Cuenta",
    signIn: "Iniciar Sesión", createAccount: "Crear Cuenta",
    language: "Idioma", allRights: "Todos los derechos reservados.",
    terms: "Términos", privacy: "Privacidad", contact: "Contacto",
    poolFee: "Tarifa Fija 2%",
  },
  pt: {
    navHome: "Início", navFeatures: "Recursos", navMining: "Como Minerar", navFaq: "FAQ",
    login: "Entrar", signUp: "Cadastrar",
    heroTitle1: "Minere Bitcoin",
    heroTitle2: "Sem Compromissos",
    heroSub: "Proxy Stratum profissional. Taxa fixa de 2%. 98% do hashrate direto para sua conta. Transparência total.",
    heroCta: "Comece Grátis",
    heroStat1: "Trabalhadores Ativos",
    heroStat2: "Hashrate do Pool",
    heroStat3: "Blocos Encontrados",
    howTitle: "Comece em 3 Minutos",
    howSub: "Conecte-se e ganhe mais rápido que qualquer outro pool.",
    howStep1: "Criar Conta",
    howStep1Desc: "Cadastre-se com seu email. Escolha um nome de usuário.",
    howStep2: "Configurar Minerador",
    howStep2Desc: "Aponte seu ASIC para stratum+tcp://hashrial.com:3333.",
    howStep3: "Acompanhe e Ganhe",
    howStep3Desc: "Veja hashrate, shares e ganhos em tempo real. Solicite pagamentos acima de 0.001 BTC.",
    featuresTitle: "Para Mineradores Sérios",
    featuresSub: "Cada recurso maximiza sua lucratividade com controle total.",
    feat1: "Taxa Fixa de 2%",
    feat1Desc: "Cada 50ª share para infraestrutura — você fica com 98%. Sem surpresas.",
    feat2: "Dashboard ao Vivo",
    feat2Desc: "Gráficos de hashrate, monitoramento de workers, histórico de ganhos.",
    feat3: "Segurança Empresarial",
    feat3Desc: "Autenticação JWT, limite de taxa, proteção CORS e SQL injection.",
    feat4: "Multilíngue",
    feat4Desc: "Inglês, português, espanhol, chinês, russo e persa.",
    feat5: "Baixa Latência",
    feat5Desc: "Milhares de conexões Stratum com latência de submilissegundos.",
    feat6: "Pagamentos Instantâneos",
    feat6Desc: "Solicite saques quando quiser. Mínimo 0.001 BTC. Pagamentos semanais.",
    hardwareTitle: "Funciona com Todo ASIC",
    hardwareSub: "Antminer, Whatsminer, Avalon, GPU — se fala Stratum, minera aqui.",
    faqTitle: "Perguntas Frequentes",
    faq1q: "Qual é a taxa do pool?",
    faq1a: "2% por share. A cada 50ª share vai para infraestrutura. 98% do hashrate vai direto para você.",
    faq2q: "Preciso da minha conta?",
    faq2a: "Não. O Hashrial gerencia tudo. Apenas cadastre-se e configure seus mineradores.",
    faq3q: "Pagamento mínimo?",
    faq3a: "0.001 BTC. Pagamentos semanais para seu endereço Bitcoin.",
    faq4q: "Posso usar vários workers?",
    faq4a: "Sim. Use nomes como username.rig01, username.rig02.",
    faq5q: "Tem taxas ocultas?",
    faq5a: "Não. Transparência total. Taxa de 2%. Sem custos ocultos.",
    faq6q: "E se o pool desconectar?",
    faq6a: "Seus mineradores mudam automaticamente para o pool upstream. Ganhos nunca perdidos.",
    faq7q: "Qual hardware é compatível?",
    faq7a: "Todo hardware compatível com Stratum: Antminer, Whatsminer, Avalon, CGMiner, etc.",
    faq8q: "Como funcionam os pagamentos?",
    faq8a: "Configure seu endereço Bitcoin. Quando o saldo exceder 0.001 BTC, solicite o pagamento.",
    ctaTitle: "Pronto para Minerar?",
    ctaDesc: "Junte-se a centenas de mineradores com taxa transparente de 2%.",
    ctaBtn: "Criar Conta Grátis",
    footerText: "Pool profissional de mineração Bitcoin. Taxas baixas, alta confiabilidade, transparência.",
    quickLinks: "Links", account: "Conta",
    signIn: "Entrar", createAccount: "Criar Conta",
    language: "Idioma", allRights: "Todos os direitos reservados.",
    terms: "Termos", privacy: "Privacidade", contact: "Contato",
    poolFee: "Taxa Fixa 2%",
  },
  ar: {
    navHome: "الرئيسية", navFeatures: "المميزات", navMining: "كيفية التعدين", navFaq: "الأسئلة الشائعة",
    login: "تسجيل الدخول", signUp: "إنشاء حساب",
    heroTitle1: "استخرج البيتكوين",
    heroTitle2: "بلا تنازلات",
    heroSub: "بروكسي ستراتوم احترافي. رسوم ثابتة 2%. 98% من قوة التhashed تذهب مباشرة إلى حسابك. شفافية كاملة بدون خصومات مخفية.",
    heroCta: "ابدأ التعدين مجاناً",
    heroStat1: "عمليات نشطة",
    heroStat2: "قوة الت hashed للمجمع",
    heroStat3: "البلوكات المكتشفة",
    howTitle: "ابدأ التعدن في 3 دقائق",
    howSub: "اتصل واكسب البيتكوين أسرع من أي مجمع آخر.",
    howStep1: "إنشاء حساب",
    howStep1Desc: "سجّل في ثوانٍ باستخدام بريدك الإلكتروني. اختر اسم مستخدم — هذا将成为 هوية المجمع الخاصة بك.",
    howStep2: "تكوين المعدّن",
    howStep2Desc: "وجّه جهاز ASIC أو البرنامج إلى stratum+tcp://hashrial.com:3333 باستخدام اسم المستخدم كـ worker.",
    howStep3: "تتبع واكسب",
    howStep3Desc: "راقب قوة الت hashed والأسهم والأرباح في الوقت الفعلي. اطلب سحوبات في أي وقت فوق 0.001 BTC.",
    featuresTitle: "مصمم للمعدنين الجادين",
    featuresSub: "كل ميزة مصممة لتعظيم ربحيتك من التعدين ومنحك سيطرة كاملة.",
    feat1: "رسوم ثابتة 2%",
    feat1Desc: "تسعير متوقع. كل 50 سهماً تغطي البنية التحتية — تحتفظ بـ 98% بدون مفاجآت.",
    feat2: "لوحة تحكم بالوقت الفعلي",
    feat2Desc: "رسوم بيانية مباشرة لقوة الت hashed ومراقبة العمال وسجل الأرباح وإدارة السحوبات في مكان واحد.",
    feat3: "أمان المؤسسات",
    feat3Desc: "مصادقة JWT وتحديد معدل الطلبات وحماية CORS ومنع حقن SQL بشكل افتراضي.",
    feat4: "متعدد اللغات",
    feat4Desc: "دعم كامل للواجهة بالعربية والفارسية والصينية والروسية والإسبانية والبرتغالية.",
    feat5: "زمن استجابة عالمي منخفض",
    feat5Desc: "تعامل مع آلاف اتصالات المتزامنة مع زمن توجيه أقل من ميلي ثانية.",
    feat6: "دفعات فورية",
    feat6Desc: "اطلب سحوبات في أي وقت. الحد الأدنى 0.001 BTC. معالجة أسبوعية مع تتبع كامل على السلسلة.",
    hardwareTitle: "يعمل مع كل ASIC رئيسي",
    hardwareSub: "Antminer و Whatsminer و Avalon وأجهزة GPU — إذا تحدث Stratum، فهي تعمل هنا.",
    faqTitle: "الأسئلة الشائعة",
    faq1q: "ما هي رسوم المجمع؟",
    faq1a: "2% لكل سهم. كل 50 سهماً تذهب لبنية المجمع التحتية. الـ 98% المتبقية من قوة الت hashed تذهب مباشرة إلى حسابك الشخصي. هذا هو النموذج نفسه المستخدم من قبل F2Pool و ViaBTC و Slushpool.",
    faq2q: "هل أحتاج حساب مجمع خاص بي؟",
    faq2a: "لا. Hashrial يتولى كل شيء في الخلفية. أنت فقط تسجّل هنا وتمكّن المعدّنات باسم المستخدم وتبدأ بالكسب. نحن نتولى إدارة الحسابات الفرعية لك.",
    faq3q: "ما هو الحد الأدنى للسحب؟",
    faq3a: "0.001 BTC (حوالي 60-100 دولار حسب سعر السوق). تُعالج السحوبات أسبوعياً إلى عنوان البيتكوين الخاص بك. قم بتعيين عنوان السحب في الإعدادات في أي وقت.",
    faq4q: "هل يمكنني استخدام عدة عمال؟",
    faq4a: "نعم. استخدم أسماء العمال في الإعدادات مثل username.rig01 و username.rig02. يظهر كل عامل بشكل منفصل في لوحة التحكم مع قوة ت hashed وعدد أسهم خاصة به.",
    faq5q: "هل هناك رسوم مخفية؟",
    faq5a: "لا. كل شيء شفاف. رسوم مجمع 2%. بدون خصومات مخفية أو رسوم إدارية أو رسوم سحب. عدد الأسهم الدقيق ظاهر في لوحة التحكم.",
    faq6q: "ماذا يحدث إذا انقطع المجمع؟",
    faq6a: "تنتقل المعدّنات تلقائياً إلى المجمع الأعلى إذا انقطع Hashrial. أرباحك لا تضيع أبداً. البروكسي مصمم لإعادة الاتصال التلقائي.",
    faq7q: "أي أجهزة متوافقة؟",
    faq7a: "جميع الأجهزة المتوافقة مع Stratum: Antminer (S19/S21) و Whatsminer (M50/M60) و Avalon (A12-A15) و CGminer و BFGminer و Awesome Miner وأي برنامج Stratum على المنفذ 3333.",
    faq8q: "كيف تعمل السحوبات؟",
    faq8a: "قم بتعيين عنوان البيتكوين في الإعدادات. عندما يتجاوز رصيدك 0.001 BTC، اطلب سحباً. نعالج كل جمعة. معرّفات المعاملات ظاهرة في سجل أرباحك.",
    ctaTitle: "هل أنت مستعد للبدء في التعدين؟",
    ctaDesc: "انضم إلى مئات المعدنين الذين يكسبون البيتكوين مع نموذج الرسوم الثابتة 2% من Hashrial. لا تكاليف مخفية ولا حيل.",
    ctaBtn: "إنشاء حساب مجاني",
    footerText: "مجمع تعدين البيتكوين الاحترافي. رسوم منخفضة وموثوقية عالية وشفافية كاملة.",
    quickLinks: "روابط سريعة", account: "الحساب",
    signIn: "تسجيل الدخول", createAccount: "إنشاء حساب",
    language: "اللغة", allRights: "جميع الحقوق محفوظة.",
    terms: "الشروط", privacy: "الخصوصية", contact: "اتصل بنا",
    poolFee: "رسوم ثابتة 2%",
  },
  tr: {
    navHome: "Ana Sayfa", navFeatures: "Özellikler", navMining: "Nasıl Madencilik Yapılır", navFaq: "SSS",
    login: "Giriş Yap", signUp: "Kayıt Ol",
    heroTitle1: "Bitcoin Madenciliği",
    heroTitle2: "Sıfır taviz",
    heroSub: "Profesyonel seviye stratum proxy. Sabit %2 ücret. %85 hashrate doğrudan hesabınıza iletilir. Tam şeffaflık, gizli kesinti yok.",
    heroCta: "Ücretsiz Madenciliğe Başla",
    heroStat1: "Aktif İşçiler",
    heroStat2: "Havuz Hashrate",
    heroStat3: "Bulunan Bloklar",
    howTitle: "3 Dakikada Madenciliğe Başlayın",
    howSub: "Bağlanın ve diğer tüm havuzlardan daha hızlı Bitcoin kazanmaya başlayın.",
    howStep1: "Hesap Oluştur",
    howStep1Desc: "E-postanızla saniyeler içinde kayıt olun. Bir kullanıcı adı seçin — bu havuz kimliğiniz olur.",
    howStep2: "Madenciyi Yapılandırın",
    howStep2Desc: "ASIC'inizi veya yazılımınızı stratum+tcp://hashrial.com:3333 adresine kullanıcı adınızla worker olarak yönlendirin.",
    howStep3: "Takip Edin ve Kazanın",
    howStep3Desc: "Hashrate, pay ve kazançlarınızı gerçek zamanlı izleyin. 0.001 BTC üzeri her zaman ödeme talep edin.",
    featuresTitle: "Ciddi Madenciler İçin Tasarlandı",
    featuresSub: "Her özellik karlılığınızı maksimize etmek ve size tam kontrol vermek için tasarlandı.",
    feat1: "%2 Sabit Ücret",
    feat1Desc: "Tahmin edilebilir fiyatlandırma. Her 50. pay altyapıyı karşılar — %88 sizde kalır, sürpriz yok.",
    feat2: "Gerçek Zamanlı Panel",
    feat2Desc: "Canlı hashrate grafikleri, işçi izleme, kazanç geçmişi ve ödeme yönetimi tek bir yerde.",
    feat3: "Kurumsal Güvenlik",
    feat3Desc: "JWT kimlik doğrulama, hız kısıtlama, CORS koruması ve SQL enjeksiyon önleme varsayılan olarak gelir.",
    feat4: "Çok Dilli",
    feat4Desc: "İngilizce, Farsça, Çince, Rusça, İspanyolca ve Portekizce tam arayüz desteği.",
    feat5: "Küçük Gecikme Süresi",
    feat5Desc: "Binlerce eşzamanlı Stratum bağlantısını milisaniyenin altında yönlendirme gecikmesiyle işleyin.",
    feat6: "Anında Ödemeler",
    feat6Desc: "İstediğiniz zaman para çekme talebinde bulunun. Minimum 0.001 BTC. Haftalık toplu işleme, tam zincir içi takip.",
    hardwareTitle: "Tüm Büyük ASIC'lerle Çalışır",
    hardwareSub: "Antminer, Whatsminer, Avalon, GPU rigleri — Stratum konuşuyorsa burada madencilik yapar.",
    faqTitle: "Sıkça Sorulan Sorular",
    faq1q: "Havuz ücreti nedir?",
    faq1a: "Pay başına %2. Her 50. pay havuz altyapısına gider. Kalan %85 hashrate doğrudan kişisel hesabınıza yönlendirilir. Bu, F2Pool, ViaBTC ve Slushpool tarafından kullanılan aynı modeldir.",
    faq2q: "Kendi havuz hesabım gerekiyor mu?",
    faq2a: "Hayır. Hashrial arka planda her şeyi halleder. Sadece burada kayıt olun, madencilerinizi kullanıcı adınızla yapılandırın ve kazanmaya başlayın. Alt hesap eşleştirmeyi sizin için yönetiyoruz.",
    faq3q: "Minimum ödeme nedir?",
    faq3a: "0.001 BTC (~60-100$ piyasa fiyatına bağlı). Ödemeler haftalık olarak Bitcoin adresinize işlenir. Ödeme adresinizi ayarlardan istediğiniz zaman ayarlayın.",
    faq4q: "Birden fazla işçi kullanabilir miyim?",
    faq4a: "Evet. Yapılandırmanızda username.rig01, username.rig02 gibi işçi adları kullanın. Her işçi kendi hashrate ve pay sayısıyla panelde ayrı ayrı görünür.",
    faq5q: "Gizli ücret var mı?",
    faq5a: "Hayır. Her şey şeffaf. %2 havuz ücreti. Gizli kesinti, yönetim ücreti veya çekim ücreti yok. Tam pay sayınız panelde görünür.",
    faq6q: "Havuz bağlantı kesilirse ne olur?",
    faq6a: "Hashrial bağlantı kesilirse madencileriniz otomatik olarak yukarı havuza devreder. Kazançlarınız asla kaybolmaz. Proxy otomatik yeniden bağlantı için tasarlanmıştır.",
    faq7q: "Hangi donanımlar uyumlu?",
    faq7a: "Tüm Stratum uyumlu donanımlar: Antminer (S19/S21), Whatsminer (M50/M60), Avalon (A12-A15), CGminer, BFGminer, Awesome Miner ve 3333 portundaki herhangi bir Stratum yazılımı.",
    faq8q: "Ödemeler nasıl çalışır?",
    faq8a: "Ayarlardan Bitcoin adresinizi ayarlayın. Bakiyeniz 0.001 BTC'yi aştığında ödeme talebinde bulunun. Her Cuma işliyoruz. İşlem kimlikleri kazanç geçmişinizde görünür.",
    ctaTitle: "Madenciliğe Başlamaya Hazır mısınız?",
    ctaDesc: "Hashrial'ın şeffaf %2 ücret modeliyle Bitcoin kazanan yüzlerce madenciye katılın. Gizli maliyet yok, hile yok.",
    ctaBtn: "Ücretsiz Hesap Oluştur",
    footerText: "Profesyonel Bitcoin madencilik havuzu. Düşük ücretler, yüksek güvenilirlik, tam şeffaflık.",
    quickLinks: "Hızlı Bağlantılar", account: "Hesap",
    signIn: "Giriş Yap", createAccount: "Hesap Oluştur",
    language: "Dil", allRights: "Tüm hakları saklıdır.",
    terms: "Koşullar", privacy: "Gizlilik", contact: "İletişim",
    poolFee: "Sabit %2 Ücret",
  },
  hi: {
    navHome: "मुखपृष्ठ", navFeatures: "विशेषताएँ", navMining: "कैसे माइन करें", navFaq: "सामान्य प्रश्न",
    login: "लॉग इन", signUp: "साइन अप",
    heroTitle1: "बिटकॉइन माइन करें",
    heroTitle2: "बिना किसी समझौते के",
    heroSub: "पेशेवर-स्तरीय स्ट्रैटम प्रॉक्सी। 2% फ्लैट शुल्क। 98% हैशरेट सीधे आपके खाते में। पूर्ण पारदर्शिता, कोई छिपी कटौती नहीं।",
    heroCta: "मुफ्त माइनिंग शुरू करें",
    heroStat1: "सक्रिय वर्कर्स",
    heroStat2: "पूल हैशरेट",
    heroStat3: "मिले ब्लॉक",
    howTitle: "3 मिनट में माइनिंग शुरू करें",
    howSub: "किसी भी पूल से तेज़ जुड़ें और बिटकॉइन कमाना शुरू करें।",
    howStep1: "खाता बनाएँ",
    howStep1Desc: "अपने ईमेल से सेकंडों में रजिस्टर करें। एक यूज़रनेम चुनें — यह आपकी पूल पहचान बन जाता है।",
    howStep2: "माइनर कॉन्फ़िगर करें",
    howStep2Desc: "अपने ASIC या सॉफ़्टवेयर को stratum+tcp://hashrial.com:3333 पर अपने यूज़रनेम को वर्कर के रूप में इस्तेमाल करके पॉइंट करें।",
    howStep3: "ट्रैक करें और कमाएँ",
    howStep3Desc: "अपनी हैशरेट, शेयर और कमाई को रीयल-टाइम में मॉनिटर करें। 0.001 BTC से ऊपर कभी भी पेआउट का अनुरोध करें।",
    featuresTitle: "गंभीर माइनर्स के लिए बनाया गया",
    featuresSub: "हर सुविधा आपकी माइनिंग लाभप्रदता को अधिकतम करने और आपको पूर्ण नियंत्रण देने के लिए डिज़ाइन की गई है।",
    feat1: "2% फ्लैट शुल्क",
    feat1Desc: "अनुमानित मूल्य निर्धारण। हर 50वां शेयर इंफ्रास्ट्रक्चर को कवर करता है — आप 98% रखते हैं, कोई सरप्राइज़ नहीं।",
    feat2: "रीयल-टाइम डैशबोर्ड",
    feat2Desc: "लाइव हैशरेट चार्ट, वर्कर मॉनिटरिंग, कमाई इतिहास और पेआउट प्रबंधन एक जगह।",
    feat3: "एंटरप्राइज़ सुरक्षा",
    feat3Desc: "JWT प्रमाणीकरण, दर सीमित करना, CORS सुरक्षा और SQL इंजेक्शन रोकथाम डिफ़ॉल्ट रूप से।",
    feat4: "बहुभाषी",
    feat4Desc: "अंग्रेज़ी, फ़ारसी, चीनी, रूसी, स्पेनिश और पुर्तगाली में पूर्ण इंटरफ़ेस समर्थन।",
    feat5: "वैश्विक कम विलंबता",
    feat5Desc: "हज़ारों समवर्ती स्ट्रैटम कनेक्शन को सब-मिलीसेकंड रूटिंग विलंबता के साथ संभालें।",
    feat6: "तत्काल भुगतान",
    heroCta: "मुफ्त माइनिंग शुरू करें",
    feat6Desc: "कभी भी निकासी का अनुरोध करें। न्यूनतम 0.001 BTC। साप्ताहिक बैच प्रोसेसिंग, पूर्ण ऑन-चेन ट्रैकिंग।",
    hardwareTitle: "हर प्रमुख ASIC के साथ काम करता है",
    hardwareSub: "Antminer, Whatsminer, Avalon, GPU rigs — अगर यह Stratum बोलता है, तो यहाँ माइन होता है।",
    faqTitle: "अक्सर पूछे जाने वाले प्रश्न",
    faq1q: "पूल शुल्क क्या है?",
    faq1a: "प्रति शेयर 2%। हर 50वां शेयर पूल इंफ्रास्ट्रक्चर को जाता है। बाकी 98% आपकी हैशरेट सीधे आपके व्यक्तिगत खाते में जाती है। यह F2Pool, ViaBTC और Slushpool द्वारा उपयोग किया जाने वाला एक ही मॉडल है।",
    faq2q: "क्या मुझे अपने पूल खाते की आवश्यकता है?",
    faq2a: "नहीं। Hashrial बैकएंड पर सब कुछ संभालता है। आप बस यहाँ रजिस्टर करें, अपने माइनर्स को अपने यूज़रनेम से कॉन्फ़िगर करें, और कमाना शुरू करें। हम सब-अकाउंट मैपिंग आपके लिए प्रबंधित करते हैं।",
    faq3q: "न्यूनतम भुगतान क्या है?",
    faq3a: "0.001 BTC (~$60-100 बाज़ार मूल्य के आधार पर)। भुगतान साप्ताहिक रूप से आपके बिटकॉइन पते पर संसाधित किए जाते हैं। सेटिंग्स में कभी भी अपना भुगतान पता सेट करें।",
    faq4q: "क्या मैं कई वर्कर्स का उपयोग कर सकता हूँ?",
    faq4a: "हाँ। अपने कॉन्फ़िग में username.rig01, username.rig02 जैसे वर्कर नाम का उपयोग करें। प्रत्येक वर्कर अपनी हैशरेट और शेयर काउंट के साथ डैशबोर्ड में अलग-अलग दिखाई देता है।",
    faq5q: "क्या कोई छिपा शुल्क है?",
    faq5a: "नहीं। सब कुछ पारदर्शी है। 2% पूल शुल्क। कोई छिपी कटौती, कोई प्रशासनिक शुल्क, कोई निकासी शुल्क नहीं। आपकी सटीक शेयर संख्या डैशबोर्ड में दिखाई देती है।",
    faq6q: "अगर पूल डिस्कनेक्ट हो जाए तो क्या होगा?",
    faq6a: "अगर Hashrial डिस्कनेक्ट हो जाता है तो आपके माइनर्स स्वचालित रूप से अपस्ट्रीम पूल पर फेलओवर कर जाते हैं। आपकी कमाई कभी नहीं खोती। प्रॉक्सी स्वचालित पुनर्संपर्क के लिए बनाया गया है।",
    faq7q: "कौन सा हार्डवेयर संगत है?",
    faq7a: "सभी स्ट्रैटम-संगत हार्डवेयर: Antminer (S19/S21), Whatsminer (M50/M60), Avalon (A12-A15), CGminer, BFGminer, Awesome Miner, और पोर्ट 3333 पर कोई भी स्ट्रैटम सॉफ़्टवेयर।",
    faq8q: "भुगतान कैसे काम करते हैं?",
    faq8a: "सेटिंग्स में अपना बिटकॉइन पता सेट करें। जब आपका बैलेंस 0.001 BTC से अधिक हो, भुगतान का अनुरोध करें। हम हर शुक्रवार प्रोसेस करते हैं। ट्रांज़ैक्शन आईडी आपकी कमाई इतिहास में दिखाई देते हैं।",
    ctaTitle: "माइनिंग शुरू करने के लिए तैयार?",
    ctaDesc: "Hashrial के पारदर्शी 2% शुल्क मॉडल के साथ बिटकॉइन कमाने वाले सैकड़ों माइनर्स से जुड़ें। कोई छिपी लागत नहीं, कोई चाल नहीं।",
    ctaBtn: "मुफ्त खाता बनाएँ",
    footerText: "पेशेवर बिटकॉइन माइनिंग पूल। कम शुल्क, उच्च विश्वसनीयता, पूर्ण पारदर्शिता।",
    quickLinks: "त्वरित लिंक", account: "खाता",
    signIn: "लॉग इन", createAccount: "खाता बनाएँ",
    language: "भाषा", allRights: "सर्वाधिकार सुरक्षित।",
    terms: "शर्तें", privacy: "गोपनीयता", contact: "संपर्क",
    poolFee: "फ्लैट 2% शुल्क",
  },
  ur: {
    navHome: "ہوم", navFeatures: "خصوصیات", navMining: "کیسے مائن کریں", navFaq: "عمومی سوالات",
    login: "لاگ ان", signUp: "سائن اپ",
    heroTitle1: "بٹ کوائن مائن کریں",
    heroTitle2: "بغیر کسی سمجھوتے کے",
    heroSub: "پیشہ ور درجے کا سٹریٹم پراکسی۔ 2% فلیٹ فیس۔ 98% ہیش ریٹ براہ راست آپ کے اکاؤنٹ میں۔ مکمل شفافیت، کوئی چھپی ہوئی کٹوتی نہیں۔",
    heroCta: "مفت مائننگ شروع کریں",
    heroStat1: "فعال ورکرز",
    heroStat2: "پول ہیش ریٹ",
    heroStat3: "ملے بلاکس",
    howTitle: "3 منٹ میں مائننگ شروع کریں",
    howSub: "کسی بھی پول سے تیزی سے جڑیں اور بٹ کوائن کمانا شروع کریں۔",
    howStep1: "اکاؤنٹ بنائیں",
    howStep1Desc: "اپنے ای میل سے سیکنڈوں میں رجسٹر کریں۔ ایک یوزر نام منتخب کریں — یہ آپ کی پول شناخت بن جاتا ہے۔",
    howStep2: "مائنر کنفیگر کریں",
    howStep2Desc: "اپنے ASIC یا سافٹ ویئر کو stratum+tcp://hashrial.com:3333 پر اپنے یوزر نام کو ورکر کے طور پر استعمال کرتے ہوئے پوائنٹ کریں۔",
    howStep3: "ٹریک کریں اور کمائیں",
    howStep3Desc: "اپنی ہیش ریٹ، شیئرز اور کمائی کو ریئل ٹائم میں مانیٹر کریں۔ 0.001 BTC سے اوپر کبھی بھی پی اؤٹ کی درخواست کریں۔",
    featuresTitle: "جدی مائنرز کے لیے بنایا گیا",
    featuresSub: "ہر خصوصیت آپ کی مائننگ کی منافع بخشی کو زیادہ سے زیادہ بنانے اور آپ کو مکمل کنٹرول دینے کے لیے ڈیزائن کی گئی ہے۔",
    feat1: "2% فلیٹ فیس",
    feat1Desc: "قابل پیش قیمت۔ ہر 50 واں شیئر انفراسٹرکچر کو کور کرتا ہے — آپ 98% رکھتے ہیں، کوئی حیرانی نہیں۔",
    feat2: "ریئل ٹائم ڈیش بورڈ",
    feat2Desc: "لائیو ہیش ریٹ چارٹس، ورکر مانیٹرنگ، کمائی کی تاریخ اور پی اؤٹ مینیجمنٹ ایک جگہ۔",
    feat3: "انٹرپرائز سیکیورٹی",
    feat3Desc: "JWT تصدیق، ریٹ لمیٹنگ، CORS حفاظت اور SQL انجکشن کی روک تھام ڈیفالٹ پر۔",
    feat4: "کثیر لسانی",
    feat4Desc: "انگریزی، فارسی، چینی، روسی، ہسپانوی اور پرتگالی میں مکمل انٹرفیس سپورٹ۔",
    feat5: "عالمی کم تاخیر",
    feat5Desc: "ہزاروں مطابقت پذیر سٹریٹم کنکشنز کو سب ملی سیکنڈ راؤٹنگ تاخیر کے ساتھ سنبھالیں۔",
    feat6: "فوری ادائیگیاں",
    feat6Desc: "کبھی بھی واپسی کی درخواست کریں۔ کم از کم 0.001 BTC۔ ہفتہ وار بیچ پروسیسنگ، مکمل آن چین ٹریکنگ۔",
    hardwareTitle: "ہر بڑے ASIC کے ساتھ کام کرتا ہے",
    hardwareSub: "Antminer، Whatsminer، Avalon، GPU rigs — اگر یہ سٹریٹم بولتا ہے، تو یہاں مائن ہوتا ہے۔",
    faqTitle: "عمومی طور پر پوچھے جانے والے سوالات",
    faq1q: "پول فیس کیا ہے؟",
    faq1a: "فی شیئر 2%۔ ہر 50 واں شیئر پول انفراسٹرکچر کو جاتا ہے۔ باقی 98% آپ کی ہیش ریٹ براہ راست آپ کے ذاتی اکاؤنٹ میں جاتی ہے۔ یہ وہی ماڈل ہے جو F2Pool، ViaBTC اور Slushpool استعمال کرتے ہیں۔",
    faq2q: "کیا مجھے اپنے پول اکاؤنٹ کی ضرورت ہے؟",
    faq2a: "نہیں۔ Hashrial بیک اینڈ پر سب کچھ سنبھالتا ہے۔ آپ بس یہاں رجسٹر کریں، اپنے مائنرز کو اپنے یوزر نام سے کنفیگر کریں، اور کمانا شروع کریں۔ ہم سب اکاؤنٹ میپنگ آپ کے لیے سنبھالتے ہیں۔",
    faq3q: "کم از کم ادائیگی کیا ہے؟",
    faq3a: "0.001 BTC (~$60-100 مارکیٹ قیمت کے مطابق)۔ ادائیگیاں ہفتہ وار آپ کے بٹ کوائن ایڈریس پر پروسیس ہوتی ہیں۔ سیٹنگز میں کبھی بھی اپنا ادائیگی ایڈریس سیٹ کریں۔",
    faq4q: "کیا میں متعدد ورکرز استعمال کر سکتا ہوں؟",
    faq4a: "ہاں۔ اپنے کنفیگ میں username.rig01، username.rig02 جیسے ورکر نام استعمال کریں۔ ہر ورکر ڈیش بورڈ میں الگ الگ اپنی ہیش ریٹ اور شیئر کاؤنٹ کے ساتھ نظر آتا ہے۔",
    faq5q: "کوئی چھپی ہوئی فیس ہے؟",
    faq5a: "نہیں۔ سب کچھ شفاف ہے۔ 2% پول فیس۔ کوئی چھپی ہوئی کٹوتی، کوئی انتظامی فیس، کوئی واپسی فیس نہیں۔ آپ کی بالکل شیئر تعداد ڈیش بورڈ میں نظر آتی ہے۔",
    faq6q: "اگر پول ڈسکنیکٹ ہو جائے تو کیا ہوگا؟",
    faq6a: "اگر Hashrial ڈسکنیکٹ ہو جاتا ہے تو آپ کے مائنرز خودکار طور پر اپسٹریم پول پر فیل اوور کر جاتے ہیں۔ آپ کی کمائی کبھی نہیں ہوتی۔ پراکسی خودکار دوبارہ 연결 کے لیے بنایا گیا ہے۔",
    faq7q: "کون سا ہارڈ ویئر مطابقت پذیر ہے؟",
    faq7a: "تمام سٹریٹم مطابقت پذیر ہارڈ ویئر: Antminer (S19/S21)، Whatsminer (M50/M60)، Avalon (A12-A15)، CGminer، BFGminer، Awesome Miner، اور پورٹ 3333 پر کوئی بھی سٹریٹم سافٹ ویئر۔",
    faq8q: "ادائیگیاں کیسے کام کرتی ہیں؟",
    faq8a: "سیٹنگز میں اپنا بٹ کوائن ایڈریس سیٹ کریں۔ جب آپ کا بیلنس 0.001 BTC سے زیادہ ہو جائے، ادائیگی کی درخواست کریں۔ ہم ہر جمعہ پروسیس کرتے ہیں۔ ٹرانزیکشن آئیڈیز آپ کی کمائی کی تاریخ میں نظر آتے ہیں۔",
    ctaTitle: "مائننگ شروع کرنے کے لیے تیار؟",
    ctaDesc: "Hashrial کے شفاف 2% فیس ماڈل کے ساتھ بٹ کوائن کمانے والے سینکڑوں مائنز سے جڑیں۔ کوئی چھپی ہوئی لاگت نہیں، کوئی چال نہیں۔",
    ctaBtn: "مفت اکاؤنٹ بنائیں",
    footerText: "پیشہ ور بٹ کوائن مائننگ پول۔ کم فیس، زیادہ قابل اعتمادیت، مکمل شفافیت۔",
    quickLinks: "فوری لنکس", account: "اکاؤنٹ",
    signIn: "لاگ ان", createAccount: "اکاؤنٹ بنائیں",
    language: "زبان", allRights: "جملہ حقوق محفوظ ہیں۔",
    terms: "شرائط", privacy: "رازداری", contact: "رابطہ",
    poolFee: "فلیٹ 2% فیس",
  },
  bn: {
    navHome: "হোম", navFeatures: "বৈশিষ্ট্য", navMining: "কিভাবে মাইন করবেন", navFaq: "সচরাচর জিজ্ঞাসা",
    login: "লগইন", signUp: "সাইন আপ",
    heroTitle1: "বিটকয়েন মাইন করুন",
    heroTitle2: "শূন্য আপস ছাড়া",
    heroSub: "পেশাদার মানের স্ট্র্যাটাম প্রক্সি। 2% ফ্ল্যাট ফি। 98% হ্যাশরেট সরাসরি আপনার অ্যাকাউন্টে পৌঁছায়। সম্পূর্ণ স্বচ্ছতা, কোনো লুকানো কাটছাড় নেই।",
    heroCta: "বিনামূল্যে মাইনিং শুরু করুন",
    heroStat1: "সক্রিয় ওয়ার্কার্স",
    heroStat2: "পুল হ্যাশরেট",
    heroStat3: "পাওয়া ব্লক",
    howTitle: "৩ মিনিটে মাইনিং শুরু করুন",
    howSub: "যেকোনো পুলের চেয়ে দ্রুত সংযোগ করুন এবং বিটকয়েন উপার্জন শুরু করুন।",
    howStep1: "অ্যাকাউন্ট তৈরি করুন",
    howStep1Desc: "আপনার ইমেইল দিয়ে সেকেন্ডের মধ্যে নিবন্ধন করুন। একটি ব্যবহারকারীর নাম বাছাই করুন — এটি আপনার পুল পরিচয় হয়ে যায়।",
    howStep2: "মাইনার কনফিগার করুন",
    howStep2Desc: "আপনার ASIC বা সফটওয়্যারকে stratum+tcp://hashrial.com:3333 এ আপনার ব্যবহারকারীর নাম ওয়ার্কার হিসাবে ব্যবহার করে পয়েন্ট করুন।",
    howStep3: "ট্র্যাক করুন এবং উপার্জন করুন",
    howStep3Desc: "আপনার হ্যাশরেট, শেয়ার এবং উপার্জন রিয়েল-টাইমে মনিটর করুন। 0.001 BTC এর উপরে যেকোনো সময় পেআউটের অনুরোধ করুন।",
    featuresTitle: "গুরুতর মাইনারদের জন্য তৈরি",
    featuresSub: "প্রতিটি বৈশিষ্ট্য আপনার মাইনিং লাভজনকতা সর্বোচ্চ করতে এবং আপনাকে সম্পূর্ণ নিয়ন্ত্রণ দিতে ডিজাইন করা হয়েছে।",
    feat1: "2% ফ্ল্যাট ফি",
    feat1Desc: "পূর্বাভাসযোগ্য মূল্য। প্রতি 50তম শেয়ার অবকাঠামো কভার করে — আপনি 98% রাখুন, কোনো সারপ্রাইজ নেই।",
    feat2: "রিয়েল-টাইম ড্যাশবোর্ড",
    feat2Desc: "লাইভ হ্যাশরেট চার্ট, ওয়ার্কার মনিটরিং, উপার্জন ইতিহাস এবং পেআউট ব্যবস্থাপনা এক জায়গায়।",
    feat3: "এন্টারপ্রাইজ নিরাপত্তা",
    feat3Desc: "JWT প্রমাণীকরণ, হার সীমাবদ্ধতা, CORS সুরক্ষা এবং SQL ইনজেকশন প্রতিরোধ ডিফল্টে।",
    feat4: "বহুভাষিক",
    feat4Desc: "ইংরেজি, ফারসি, চীনা, রাশিয়ান, স্প্যানিশ এবং পর্তুগিজে সম্পূর্ণ ইন্টারফেস সমর্থন।",
    feat5: "বৈশ্বিক কম বিলম্ব",
    feat5Desc: "হাজার হাজার সমকালীন স্ট্র্যাটাম সংযোগ সাব-মিলিসেকেন্ড রাউটিং বিলম্ব দিয়ে পরিচালনা করুন।",
    feat6: "তাৎক্ষণিক পেআউট",
    feat6Desc: "যেকোনো সময় প্রত্যাহারের অনুরোধ করুন। ন্যূনতম 0.001 BTC। সাপ্তাহিক ব্যাচ প্রক্রিয়াকরণ, সম্পূর্ণ অন-চেইন ট্র্যাকিং।",
    hardwareTitle: "প্রতিটি প্রধান ASIC এর সাথে কাজ করে",
    hardwareSub: "Antminer, Whatsminer, Avalon, GPU rigs — এটি যদি Stratum বলে, তাহলে এখানে মাইন হয়।",
    faqTitle: "সচরাচর জিজ্ঞাসা",
    faq1q: "পুল ফি কত?",
    faq1a: "প্রতি শেয়ারে 2%। প্রতি 50তম শেয়ার পুল অবকাঠামোতে যায়। বাকি 98% আপনার হ্যাশরেট সরাসরি আপনার ব্যক্তিগত অ্যাকাউন্টে যায়। এটি F2Pool, ViaBTC এবং Slushpool দ্বারা ব্যবহৃত একই মডেল।",
    faq2q: "আমার নিজের পুল অ্যাকাউন্ট কি প্রয়োজন?",
    faq2a: "না। Hashrial ব্যাকএন্ডে সব কিছু পরিচালনা করে। আপনি শুধু এখানে নিবন্ধন করুন, আপনার মাইনারকে আপনার ব্যবহারকারীর নাম দিয়ে কনফিগার করুন এবং উপার্জন শুরু করুন। আমরা আপনার জন্য সাব-অ্যাকাউন্ট ম্যাপিং পরিচালনা করি।",
    faq3q: "ন্যূনতম পেআউট কত?",
    faq3a: "0.001 BTC (~$60-100 বাজার মূল্যের উপর নির্ভরশীল)। পেআউট সাপ্তাহিকভাবে আপনার বিটকয়েন ঠিকানায় প্রক্রিয়া করা হয়। সেটিংসে যেকোনো সময় আপনার পেআউট ঠিকানা সেট করুন।",
    faq4q: "আমি কি একাধিক ওয়ার্কার ব্যবহার করতে পারি?",
    faq4a: "হ্যাঁ। আপনার কনফিগে username.rig01, username.rig02 এর মতো ওয়ার্কার নাম ব্যবহার করুন। প্রতিটি ওয়ার্কার আপনার ড্যাশবোর্ডে তার নিজের হ্যাশরেট এবং শেয়ার কাউন্ট সহ আলাদাভাবে দেখায়।",
    faq5q: "কোনো লুকানো ফি কি আছে?",
    faq5a: "না। সব কিছু স্বচ্ছ। 2% পুল ফি। কোনো লুকানো কাটছাড়, কোনো প্রশাসনিক ফি, কোনো প্রত্যাহার ফি নেই। আপনার নির্দিষ্ট শেয়ার সংখ্যা ড্যাশবোর্ডে দৃশ্যমান।",
    faq6q: "পুল ডিসকানেক্ট হলে কী হবে?",
    faq6a: "Hashrial ডিসকানেক্ট হলে আপনার মাইনাররা স্বয়ংক্রিয়ভাবে আপস্ট্রিম পুলে ফেলওভার করবে। আপনার উপার্জন কখনো হারাবে না। প্রক্সি স্বয়ংক্রিয় পুনঃসংযোগের জন্য তৈরি।",
    faq7q: "কোন হার্ডওয়্যার সামঞ্জস্যপূর্ণ?",
    faq7a: "সমস্ত স্ট্র্যাটাম-সামঞ্জস্যপূর্ণ হার্ডওয়্যার: Antminer (S19/S21), Whatsminer (M50/M60), Avalon (A12-A15), CGminer, BFGminer, Awesome Miner, এবং পোর্ট 3333 এ যেকোনো স্ট্র্যাটাম সফটওয়্যার।",
    faq8q: "পেআউট কিভাবে কাজ করে?",
    faq8a: "সেটিংসে আপনার বিটকয়েন ঠিকানা সেট করুন। আপনার ব্যালেন্স 0.001 BTC অতিক্রান্ত হলে, পেআউটের অনুরোধ করুন। আমরা প্রতি শুক্রবার প্রক্রিয়া করি। ট্রানজেকশন আইডি আপনার উপার্জন ইতিহাসে দৃশ্যমান।",
    ctaTitle: "মাইনিং শুরু করতে প্রস্তুত?",
    ctaDesc: "Hashrial-এর স্বচ্ছ 2% ফি মডেল দিয়ে বিটকয়েন উপার্জনকারী শত শত মাইনারদের সাথে যুক্ত হন। কোনো লুকানো খরচ নেই, কোনো কৌশল নেই।",
    ctaBtn: "বিনামূল্যে অ্যাকাউন্ট তৈরি করুন",
    footerText: "পেশাদার বিটকয়েন মাইনিং পুল। কম ফি, উচ্চ নির্ভরযোগ্যতা, সম্পূর্ণ স্বচ্ছতা।",
    quickLinks: "দ্রুত লিঙ্ক", account: "অ্যাকাউন্ট",
    signIn: "লগইন", createAccount: "অ্যাকাউন্ট তৈরি করুন",
    language: "ভাষা", allRights: "সর্বস্বত্ব সংরক্ষিত।",
    terms: "শর্তাবলী", privacy: "গোপনীয়তা", contact: "যোগাযোগ",
    poolFee: "ফ্ল্যাট 2% ফি",
  },
  de: {
    navHome: "Startseite", navFeatures: "Funktionen", navMining: "Wie man minet", navFaq: "FAQ",
    login: "Anmelden", signUp: "Registrieren",
    heroTitle1: "Bitcoin schürfen",
    heroTitle2: "Ohne Kompromisse",
    heroSub: "Professioneller Stratum-Proxy. 2% Pauschalgebühr. 98% Hashrate direkt auf Ihr Konto. Volle Transparenz, keine versteckten Abzüge.",
    heroCta: "Kostenlos Mining starten",
    heroStat1: "Aktive Worker",
    heroStat2: "Pool-Hashrate",
    heroStat3: "Gefundene Blöcke",
    howTitle: "In 3 Minuten mit dem Mining starten",
    howSub: "Verbinden Sie sich und verdienen Sie Bitcoin schneller als jeder andere Pool.",
    howStep1: "Konto erstellen",
    howStep1Desc: "Registrieren Sie sich in Sekunden mit Ihrer E-Mail. Wählen Sie einen Benutzernamen — dies wird Ihre Pool-Identität.",
    howStep2: "Miner konfigurieren",
    howStep2Desc: "Richten Sie Ihren ASIC oder Ihre Software auf stratum+tcp://hashrial.com:3333 mit Ihrem Benutzernamen als Worker.",
    howStep3: "Verfolgen & Verdienen",
    howStep3Desc: "Überwachen Sie Ihre Hashrate, Anteile und Einnahmen in Echtzeit. Fordern Sie jederzeit Auszahlungen über 0.001 BTC an.",
    featuresTitle: "Für ernsthafte Miner gebaut",
    featuresSub: "Jede Funktion ist darauf ausgelegt, Ihre Mining-Rentabilität zu maximieren und Ihnen volle Kontrolle zu geben.",
    feat1: "2% Pauschalgebühr",
    feat1Desc: "Vorhersehbare Preise. Jeder 50. Anteil deckt die Infrastruktur ab — Sie behalten 98%, keine Überraschungen.",
    feat2: "Echtzeit-Dashboard",
    feat2Desc: "Live-Hashrate-Diagramme, Worker-Überwachung, Einnahmenverlauf und Auszahlungsverwaltung an einem Ort.",
    feat3: "Unternehmens-Sicherheit",
    feat3Desc: "JWT-Authentifizierung, Ratenbegrenzung, CORS-Schutz und SQL-Injektionsprävention standardmäßig.",
    feat4: "Mehrsprachig",
    feat4Desc: "Vollständige Interface-Unterstützung für Englisch, Persisch, Chinesisch, Russisch, Spanisch und Portugiesisch.",
    feat5: "Globale niedrige Latenz",
    feat5Desc: "Verarbeiten Sie Tausende gleichzeitiger Stratum-Verbindungen mit unter Millisekunden Routing-Latenz.",
    feat6: "Sofortige Auszahlungen",
    feat6Desc: "Fordern Sie jederzeit Auszahlungen an. Minimum 0.001 BTC. Wöchentliche Stapelverarbeitung mit vollständiger On-Chain-Verfolgung.",
    hardwareTitle: "Funktioniert mit jedem großen ASIC",
    hardwareSub: "Antminer, Whatsminer, Avalon, GPU-Rigs — wenn es Stratum spricht, wird hier geschürft.",
    faqTitle: "Häufig gestellte Fragen",
    faq1q: "Was ist die Pool-Gebühr?",
    faq1a: "2% pro Anteil. Jeder 50. Anteil geht an die Pool-Infrastruktur. Die verbleibenden 98% Ihrer Hashrate werden direkt auf Ihr persönliches Konto weitergeleitet. Dies ist dasselbe Modell, das von F2Pool, ViaBTC und Slushpool verwendet wird.",
    faq2q: "Brauche ich mein eigenes Pool-Konto?",
    faq2a: "Nein. Hashrial kümmert sich um alles im Backend. Sie registrieren sich hier, konfigurieren Ihre Miner mit Ihrem Benutzernamen und fangen an zu verdienen. Wir verwalten das Sub-Account-Mapping für Sie.",
    faq3q: "Was ist die Mindestauszahlung?",
    faq3a: "0.001 BTC (~$60-100 je nach Marktpreis). Auszahlungen werden wöchentlich an Ihre Bitcoin-Adresse verarbeitet. Stellen Sie Ihre Auszahlungsadresse jederzeit in den Einstellungen ein.",
    faq4q: "Kann ich mehrere Worker verwenden?",
    faq4a: "Ja. Verwenden Sie Worker-Namen in Ihrer Konfiguration wie username.rig01, username.rig02. Jeder Worker erscheint separat in Ihrem Dashboard mit eigener Hashrate und Anteilsanzahl.",
    faq5q: "Gibt es versteckte Gebühren?",
    faq5a: "Nein. Alles ist transparent. 2% Pool-Gebühr. Keine versteckten Abzüge, keine Verwaltungsgebühren, keine Auszahlungsgebühren. Ihre genaue Anteilsanzahl ist im Dashboard sichtbar.",
    faq6q: "Was passiert, wenn der Pool die Verbindung trennt?",
    faq6a: "Ihre Miner failover automatisch zum Upstream-Pool, wenn Hashrial die Verbindung trennt. Ihre Einnahmen gehen nie verloren. Der Proxy ist für automatische Wiederverbindung ausgelegt.",
    faq7q: "Welche Hardware ist kompatibel?",
    faq7a: "Alle Stratum-kompatiblen Hardware: Antminer (S19/S21), Whatsminer (M50/M60), Avalon (A12-A15), CGminer, BFGminer, Awesome Miner und jede Stratum-Software auf Port 3333.",
    faq8q: "Wie funktionieren Auszahlungen?",
    faq8a: "Stellen Sie Ihre Bitcoin-Adresse in den Einstellungen ein. Wenn Ihr Guthaben 0.001 BTC überschreitet, fordern Sie eine Auszahlung an. Wir verarbeiten jede Freitag. TransaktionsIDs sind in Ihrem Einnahmenverlauf sichtbar.",
    ctaTitle: "Bereit, mit dem Mining zu beginnen?",
    ctaDesc: "Schließen Sie sich Hunderten von Minern an, die mit Hashrials transparentem 2%-Gebührenmodell Bitcoin verdienen. Keine versteckten Kosten, keine Tricks.",
    ctaBtn: "Kostenloses Konto erstellen",
    footerText: "Professioneller Bitcoin-Mining-Pool. Niedrige Gebühren, hohe Zuverlässigkeit, volle Transparenz.",
    quickLinks: "Schnelllinks", account: "Konto",
    signIn: "Anmelden", createAccount: "Konto erstellen",
    language: "Sprache", allRights: "Alle Rechte vorbehalten.",
    terms: "Bedingungen", privacy: "Datenschutz", contact: "Kontakt",
    poolFee: "Pauschal 2% Gebühr",
  },
  fr: {
    navHome: "Accueil", navFeatures: "Fonctionnalités", navMining: "Comment miner", navFaq: "FAQ",
    login: "Connexion", signUp: "S'inscrire",
    heroTitle1: "Minez du Bitcoin",
    heroTitle2: "Sans compromis",
    heroSub: "Proxy Stratum de niveau professionnel. Frais fixes de 2 %. 98 % de hashrate livré directement à votre compte. Transparence totale, aucune déduction cachée.",
    heroCta: "Commencer le minage gratuitement",
    heroStat1: "Workers actifs",
    heroStat2: "Hashrate du pool",
    heroStat3: "Blocs trouvés",
    howTitle: "Commencez à miner en 3 minutes",
    howSub: "Connectez-vous et gagnez du Bitcoin plus rapidement que n'importe quel autre pool.",
    howStep1: "Créer un compte",
    howStep1Desc: "Inscrivez-vous en quelques secondes avec votre email. Choisissez un nom d'utilisateur — ceci devient votre identité de pool.",
    howStep2: "Configurer le mineur",
    howStep2Desc: "Pointez votre ASIC ou logiciel vers stratum+tcp://hashrial.com:3333 en utilisant votre nom d'utilisateur comme worker.",
    howStep3: "Suivre et gagner",
    howStep3Desc: "Surveillez votre hashrate, parts et gains en temps réel. Demandez des paiements à tout moment au-dessus de 0.001 BTC.",
    featuresTitle: "Conçu pour les mineurs sérieux",
    featuresSub: "Chaque fonctionnalité est conçue pour maximiser votre rentabilité minière et vous donner un contrôle total.",
    feat1: "Frais fixes de 2 %",
    feat1Desc: "Tarification prévisible. Chaque 50e part couvre l'infrastructure — vous gardez 98 %, aucune surprise.",
    feat2: "Tableau de bord en temps réel",
    feat2Desc: "Graphiques de hashrate en direct, surveillance des workers, historique des gains et gestion des paiements en un seul endroit.",
    feat3: "Sécurité entreprise",
    feat3Desc: "Authentification JWT, limitation de débit, protection CORS et prévention d'injection SQL inclus par défaut.",
    feat4: "Multilingue",
    feat4Desc: "Support complet de l'interface en anglais, persan, chinois, russe, espagnol et portugais.",
    feat5: "Faible latence mondiale",
    feat5Desc: "Gérez des milliers de connexions Stratum simultanées avec une latence de routage inférieure à la milliseconde.",
    feat6: "Paiements instantanés",
    feat6Desc: "Demandez des retraits à tout moment. Minimum 0.001 BTC. Traitement par lots hebdomadaire avec suivi complet on-chain.",
    hardwareTitle: "Fonctionne avec tous les grands ASIC",
    hardwareSub: "Antminer, Whatsminer, Avalon, GPU rigs — s'il parle Stratum, il mine ici.",
    faqTitle: "Foire aux questions",
    faq1q: "Quel est le frais de pool ?",
    faq1a: "2 % par part. Chaque 50e part va à l'infrastructure du pool. Les 98 % restants de votre hashrate sont acheminés directement vers votre compte personnel. C'est le même modèle utilisé par F2Pool, ViaBTC et Slushpool.",
    faq2q: "Ai-je besoin de mon propre compte pool ?",
    faq2a: "Non. Hashrial gère tout côté backend. Vous vous inscrivez ici, configurez vos mineurs avec votre nom d'utilisateur et commencez à gagner. Nous gérons le mapping des sous-comptes pour vous.",
    faq3q: "Quel est le paiement minimum ?",
    faq3a: "0.001 BTC (~60-100 $ selon le prix du marché). Les paiements sont traités hebdomadairement vers votre adresse Bitcoin. Définissez votre adresse de paiement dans les paramètres à tout moment.",
    faq4q: "Puis-je utiliser plusieurs workers ?",
    faq4a: "Oui. Utilisez des noms de workers dans votre config comme username.rig01, username.rig02. Chaque worker apparaît séparément dans votre tableau de bord avec sa propre hashrate et son nombre de parts.",
    faq5q: "Y a-t-il des frais cachés ?",
    faq5a: "Non. Tout est transparent. 2 % de frais de pool. Pas de déductions cachées, pas de frais d'administration, pas de frais de retrait. Votre nombre exact de parts est visible dans le tableau de bord.",
    faq6q: "Que se passe-t-il si le pool se déconnecte ?",
    faq6a: "Vos mineurs basculent automatiquement vers le pool amont si Hashrial se déconnecte. Vos gains ne sont jamais perdus. Le proxy est conçu pour la reconnexion automatique.",
    faq7q: "Quel matériel est compatible ?",
    faq7a: "Tout matériel compatible Stratum : Antminer (S19/S21), Whatsminer (M50/M60), Avalon (A12-A15), CGminer, BFGminer, Awesome Miner et tout logiciel Stratum sur le port 3333.",
    faq8q: "Comment fonctionnent les paiements ?",
    faq8a: "Définissez votre adresse Bitcoin dans les paramètres. Lorsque votre solde dépasse 0.001 BTC, demandez un paiement. Nous traitons chaque vendredi. Les IDs de transaction sont visibles dans votre historique de gains.",
    ctaTitle: "Prêt à commencer le minage ?",
    ctaDesc: "Rejoignez des centaines de mineurs qui gagnent du Bitcoin avec le modèle de frais transparent de 2 % de Hashrial. Pas de coûts cachés, pas d'astuces.",
    ctaBtn: "Créer un compte gratuit",
    footerText: "Pool de minage Bitcoin professionnel. Frais bas, haute fiabilité, transparence totale.",
    quickLinks: "Liens rapides", account: "Compte",
    signIn: "Connexion", createAccount: "Créer un compte",
    language: "Langue", allRights: "Tous droits réservés.",
    terms: "Conditions", privacy: "Confidentialité", contact: "Contact",
    poolFee: "Frais fixes 2 %",
  },
  ja: {
    navHome: "ホーム", navFeatures: "機能", navMining: "マイニング方法", navFaq: "FAQ",
    login: "ログイン", signUp: "登録",
    heroTitle1: "ビットコインをマイニング",
    heroTitle2: "妥協なし",
    heroSub: "プロ品質のストラタムプロキシ。2%の固定料金。98%のハッシュレートが直接アカウントに届きます。完全な透明性、隠れた控除なし。",
    heroCta: "無料でマイニング開始",
    heroStat1: "アクティブワーカー",
    heroStat2: "プールハッシュレート",
    heroStat3: "発見ブロック",
    howTitle: "3分でマイニングを開始",
    howSub: "接続して、他のどのプールよりも速くビットコインを獲得しましょう。",
    howStep1: "アカウント作成",
    howStep1Desc: "メールですぐに登録。ユーザー名を選択 — これがプールのアイデンティティになります。",
    howStep2: "マイナーを設定",
    howStep2Desc: "ASICまたはソフトウェアをstratum+tcp://hashrial.com:3333にユーザー名をワーカーとして使用して設定。",
    howStep3: "追跡して稼ぐ",
    howStep3Desc: "ハッシュレート、シェア、収益をリアルタイムで監視。0.001 BTC以上の際はいつでも出金リクエスト可能。",
    featuresTitle: "本格マイナー向けに構築",
    featuresSub: "すべての機能はマイニングの収益性を最大化し、完全なコントロールを提供するために設計。",
    feat1: "2%固定料金",
    feat1Desc: "予測可能な料金設定。50番目のシェアがインフラをカバー — 98%を保持、サプライズなし。",
    feat2: "リアルタイムダッシュボード",
    feat2Desc: "ライブハッシュレートチャート、ワーカーモニタリング、収益履歴、出金管理を一か所に。",
    feat3: "エンタープライズセキュリティ",
    feat3Desc: "JWT認証、レート制限、CORS保護、SQLインジェクション防止をデフォルトで搭載。",
    feat4: "多言語対応",
    feat4Desc: "英語、ペルシア語、中国語、ロシア語、スペイン語、ポルトガル語の完全インターフェースサポート。",
    feat5: "グローバル低レイテンシ",
    feat5Desc: "サブミリ秒のルーティングレイテンシで数千の同時ストラタム接続を処理。",
    feat6: "即時ペイアウト",
    feat6Desc: "いつでも出金リクエスト可能。最低0.001 BTC。週次バッチ処理、完全なオンチェーントラッキング。",
    hardwareTitle: "すべての主要ASICで動作",
    hardwareSub: "Antminer、Whatsminer、Avalon、GPUリグ — ストラタムを話せば、ここでマイニング。",
    faqTitle: "よくある質問",
    faq1q: "プール料金は？",
    faq1a: "シェアあたり2%。50番目のシェアがプールインフラに。残り98%のハッシュレートは直接個人アカウントに。F2Pool、ViaBTC、Slushpoolと同じモデル。",
    faq2q: "自分のプールアカウントは必要？",
    faq2a: "いいえ。Hashrialはバックエンドで全てを処理。登録してユーザー名でマイナーを設定し、収益獲得開始。サブアカウントマッピングを管理します。",
    faq3q: "最低ペイアウトは？",
    faq3a: "0.001 BTC（市場価格に応じて約$60-100）。ペイアウトは毎週ビットコインアドレスに処理。設定でペイアウトアドレスをいつでも設定可能。",
    faq4q: "複数のワーカーを使用できる？",
    faq4a: "はい。username.rig01、username.rig02のようなワーカー名を設定で使用。各ワーカーはダッシュボードに別々のハッシュレートとシェア数で表示。",
    faq5q: "隠れた料金はある？",
    faq5a: "いいえ。全てが透明。2%プール料金。隠れた控除、管理料金、出金料金なし。正確なシェア数がダッシュボードに表示。",
    faq6q: "プールが切断されたら？",
    faq6a: "Hashrialが切断されると、マイナーは自動的にアップストリームプールにフェイルオーバー。収益が失われることはありません。プロキシは自動再接続用に構築。",
    faq7q: "どのハードウェアが互換性がある？",
    faq7a: "すべてのストラタム互換ハードウェア：Antminer（S19/S21）、Whatsminer（M50/M60）、Avalon（A12-A15）、CGminer、BFGminer、Awesome Miner、ポート3333のすべてのストラタムソフトウェア。",
    faq8q: "ペイアウトはどのように機能する？",
    faq8a: "設定でビットコインアドレスを設定。残高が0.001 BTCを超えるとペイアウトをリクエスト。毎金曜日に処理。トランザクションIDは収益履歴で確認可能。",
    ctaTitle: "マイニングを始める準備はできましたか？",
    ctaDesc: "Hashrialの透明な2%料金モデルでビットコインを獲得する何百ものマイナーに参加。隠れたコストなし、トリックなし。",
    ctaBtn: "無料アカウント作成",
    footerText: "プロフェッショナルビットコインマイニングプール。低料金、高信頼性、完全な透明性。",
    quickLinks: "クイックリンク", account: "アカウント",
    signIn: "ログイン", createAccount: "アカウント作成",
    language: "言語", allRights: "全著作権所有。",
    terms: "利用規約", privacy: "プライバシー", contact: "お問い合わせ",
    poolFee: "固定2%料金",
  },
  ko: {
    navHome: "홈", navFeatures: "기능", navMining: "마이닝 방법", navFaq: "FAQ",
    login: "로그인", signUp: "가입",
    heroTitle1: "비트코인 마이닝",
    heroTitle2: "타협 없이",
    heroSub: "프로페셔널급 스트라텀 프록시. 2% 고정 수수료. 98% 해시레이트가 계정으로 직접 전달됩니다. 완전한 투명성, 숨겨진 차감 없음.",
    heroCta: "무료 마이닝 시작",
    heroStat1: "활성 워커",
    heroStat2: "풀 해시레이트",
    heroStat3: "발견 블록",
    howTitle: "3분 만에 마이닝 시작",
    howSub: "다른 풀보다 빠르게 연결하고 비트코인을 벌어보세요.",
    howStep1: "계정 만들기",
    howStep1Desc: "이메일로 몇 초 만에 등록. 사용자 이름 선택 — 이것이 풀 아이덴티티가 됩니다.",
    howStep2: "마이너 구성",
    howStep2Desc: "ASIC 또는 소프트웨어를 stratum+tcp://hashrial.com:3333에 사용자 이름을 워커로 설정.",
    howStep3: "추적하고 벌기",
    howStep3Desc: "해시레이트, 쉐어, 수익을 실시간으로 모니터링. 0.001 BTC 이상 시 언제든 출금 요청 가능.",
    featuresTitle: "진지한 마이너를 위해 구축",
    featuresSub: "모든 기능은 마이닝 수익성을 극대화하고 완전한 제어를 제공하도록 설계.",
    feat1: "2% 고정 수수료",
    feat1Desc: "예측 가능한 가격. 50번째 쉐어가 인프라 비용을 충당 — 98% 유지, 서프라이즈 없음.",
    feat2: "실시간 대시보드",
    feat2Desc: "실시간 해시레이트 차트, 워커 모니터링, 수익 이력, 출금 관리를 한 곳에서.",
    feat3: "엔터프라이즈 보안",
    feat3Desc: "JWT 인증, 속도 제한, CORS 보호, SQL 인젝션 방지 기본 제공.",
    feat4: "다국어 지원",
    feat4Desc: "영어, 페르시아어, 중국어, 러시아어, 스페인어, 포르투갈어 전체 인터페이스 지원.",
    feat5: "글로벌 저지연",
    feat5Desc: "밀리초 미만의 라우팅 지연으로 수천 개의 동시 스트라텀 연결 처리.",
    feat6: "즉시 지급",
    feat6Desc: "언제든 출금 요청 가능. 최소 0.001 BTC. 주간 배치 처리 및 완전한 온체인 추적.",
    hardwareTitle: "모든 주요 ASIC에서 작동",
    hardwareSub: "Antminer, Whatsminer, Avalon, GPU 리그 — 스트라텀을 지원하면 여기서 마이닝.",
    faqTitle: "자주 묻는 질문",
    faq1q: "풀 수수료는?",
    faq1a: "쉐어당 2%. 50번째 쉐어가 풀 인프라로. 나머지 98%의 해시레이트가 개인 계정으로 직접 전달. F2Pool, ViaBTC, Slushpool과 같은 모델.",
    faq2q: "자신의 풀 계정이 필요한가?",
    faq2a: "아니요. Hashrial은 백엔드에서 모든 것을 처리. 여기 등록하고 사용자 이름으로 마이너를 구성하면 수익 창출 시작. 서브 계정 매핑을 관리해 드립니다.",
    faq3q: "최소 지급액은?",
    faq3a: "0.001 BTC (~$60-100 시장가에 따라). 지급은 매주 비트코인 주소로 처리. 설정에서 언제든 지급 주소 설정 가능.",
    faq4q: "여러 워커를 사용할 수 있나?",
    faq4a: "네. username.rig01, username.rig02 같은 워커 이름을 구성에서 사용. 각 워커는 고유한 해시레이트와 쉐어 수로 대시보드에 개별 표시.",
    faq5q: "숨겨진 수수료가 있나?",
    faq5a: "아니요. 모든 것이 투명. 2% 풀 수수료. 숨겨진 차감, 관리 수수료, 출금 수수료 없음. 정확한 쉐어 수가 대시보드에 표시.",
    faq6q: "풀이 연결 해제되면?",
    faq6a: "Hashrial이 연결 해제되면 마이너가 자동으로 업스트림 풀로 장애 조치. 수익이 절대 손실되지 않음. 프록시는 자동 재연결용으로 구축.",
    faq7q: "호환되는 하드웨어는?",
    faq7a: "모든 스트라텀 호환 하드웨어: Antminer (S19/S21), Whatsminer (M50/M60), Avalon (A12-A15), CGminer, BFGminer, Awesome Miner, 포트 3333의 모든 스트라텀 소프트웨어.",
    faq8q: "지급은 어떻게 작동?",
    faq8a: "설정에서 비트코인 주소를 설정. 잔액이 0.001 BTC를 초과하면 지급 요청. 매주 금요일 처리. 거래 ID가 수익 이력에서 확인 가능.",
    ctaTitle: "마이닝을 시작할 준비가 되셨나요?",
    ctaDesc: "Hashrial의 투명한 2% 수수료 모델로 비트코인을 버는 수백 명의 마이너에 합류. 숨겨진 비용 없음, 속임수 없음.",
    ctaBtn: "무료 계정 만들기",
    footerText: "프로페셔널 비트코인 마이닝 풀. 낮은 수수료, 높은 신뢰성, 완전한 투명성.",
    quickLinks: "빠른 링크", account: "계정",
    signIn: "로그인", createAccount: "계정 만들기",
    language: "언어", allRights: "모든 권리 보유.",
    terms: "이용약관", privacy: "개인정보처리방침", contact: "문의",
    poolFee: "고정 2% 수수료",
  },
  id: {
    navHome: "Beranda", navFeatures: "Fitur", navMining: "Cara Menambang", navFaq: "FAQ",
    login: "Masuk", signUp: "Daftar",
    heroTitle1: "Tambang Bitcoin",
    heroTitle2: "Tanpa kompromi",
    heroSub: "Proxy stratum kelas profesional. Biaya tetap 2%. 98% hashrate dikirim langsung ke akun Anda. Transparansi penuh, tanpa potongan tersembunyi.",
    heroCta: "Mulai Menambang Gratis",
    heroStat1: "Worker Aktif",
    heroStat2: "Hashrate Pool",
    heroStat3: "Blok Ditemukan",
    howTitle: "Mulai Menambang dalam 3 Menit",
    howSub: "Terhubung dan hasilkan Bitcoin lebih cepat dari pool lain manapun.",
    howStep1: "Buat Akun",
    howStep1Desc: "Daftar dalam hitungan detik dengan email Anda. Pilih nama pengguna — ini menjadi identitas pool Anda.",
    howStep2: "Konfigurasi Miner",
    howStep2Desc: "Arahkan ASIC atau perangkat lunak Anda ke stratum+tcp://hashrial.com:3333 menggunakan nama pengguna sebagai worker.",
    howStep3: "Lacak & Hasilkan",
    howStep3Desc: "Pantau hashrate, share, dan penghasilan Anda secara real-time. Minta pembayaran kapan saja di atas 0.001 BTC.",
    featuresTitle: "Dibuat untuk Penambang Serius",
    featuresSub: "Setiap fitur dirancang untuk memaksimalkan profitabilitas penambangan Anda dan memberi Anda kendali penuh.",
    feat1: "Biaya Tetap 2%",
    feat1Desc: "Harga yang dapat diprediksi. Setiap share ke-50 menanggung infrastruktur — Anda menyimpan 98%, tanpa kejutan.",
    feat2: "Dashboard Real-time",
    feat2Desc: "Grafik hashrate langsung, pemantauan worker, riwayat penghasilan, dan manajemen pembayaran dalam satu tempat.",
    feat3: "Keamanan Enterprise",
    feat3Desc: "Autentikasi JWT, pembatasan rate, perlindungan CORS, dan pencegahan injeksi SQL out of the box.",
    feat4: "Multi-bahasa",
    feat4Desc: "Dukungan antarmuka penuh untuk bahasa Inggris, Persia, Tionghoa, Rusia, Spanyol, dan Portugis.",
    feat5: "Latency Rendah Global",
    feat5Desc: "Tangani ribuan koneksi Stratum simultan dengan latensi routing sub-milidetik.",
    feat6: "Pembayaran Instan",
    feat6Desc: "Minta penarikan kapan saja. Minimum 0.001 BTC. Pemrosesan batch mingguan dengan pelacakan on-chain penuh.",
    hardwareTitle: "Kompatibel dengan Semua ASIC Utama",
    hardwareSub: "Antminer, Whatsminer, Avalon, GPU rigs — jika berbicara Stratum, menambang di sini.",
    faqTitle: "Pertanyaan yang Sering Diajukan",
    faq1q: "Berapa biaya pool?",
    faq1a: "2% per share. Setiap share ke-50 masuk ke infrastruktur pool. 98% sisa hashrate Anda langsung ke akun pribadi Anda. Ini adalah model yang sama dengan F2Pool, ViaBTC, dan Slushpool.",
    faq2q: "Apakah saya perlu akun pool sendiri?",
    faq2a: "Tidak. Hashrial menangani semuanya di backend. Anda cukup daftar di sini, konfigurasi miner dengan nama pengguna, dan mulai menghasilkan. Kami mengelola pemetaan sub-akun untuk Anda.",
    faq3q: "Berapa pembayaran minimum?",
    faq3a: "0.001 BTC (~$60-100 tergantung harga pasar). Pembayaran diproses setiap minggu ke alamat Bitcoin Anda. Atur alamat pembayaran di Pengaturan kapan saja.",
    faq4q: "Bisakah saya menggunakan beberapa worker?",
    faq4a: "Ya. Gunakan nama worker di config seperti username.rig01, username.rig02. Setiap worker muncul terpisah di dashboard dengan hashrate dan jumlah share sendiri.",
    faq5q: "Apakah ada biaya tersembunyi?",
    faq5a: "Tidak. Semuanya transparan. Biaya pool 2%. Tanpa potongan tersembunyi, biaya admin, atau biaya penarikan. Jumlah share Anda yang tepat terlihat di dashboard.",
    faq6q: "Apa yang terjadi jika pool terputus?",
    faq6a: "Miner Anda secara otomatis gagal ke upstream pool jika Hashrial terputus. Penghasilan Anda tidak pernah hilang. Proxy dibangun untuk koneksi ulang otomatis.",
    faq7q: "Perangkat keras apa yang kompatibel?",
    faq7a: "Semua perangkat keras kompatibel Stratum: Antminer (S19/S21), Whatsminer (M50/M60), Avalon (A12-A15), CGminer, BFGminer, Awesome Miner, dan semua perangkat lunak Stratum di port 3333.",
    faq8q: "Bagaimana pembayaran dilakukan?",
    faq8a: "Atur alamat Bitcoin di Pengaturan. Ketika saldo Anda melebihi 0.001 BTC, minta pembayaran. Kami memproses setiap hari Jumat. ID transaksi terlihat di riwayat penghasilan Anda.",
    ctaTitle: "Siap Mulai Menambang?",
    ctaDesc: "Bergabunglah dengan ratusan penambang yang menghasilkan Bitcoin dengan model biaya transparan 2% Hashrial. Tanpa biaya tersembunyi, tanpa trik.",
    ctaBtn: "Buat Akun Gratis",
    footerText: "Pool penambangan Bitcoin profesional. Biaya rendah, keandalan tinggi, transparansi penuh.",
    quickLinks: "Tautan Cepat", account: "Akun",
    signIn: "Masuk", createAccount: "Buat Akun",
    language: "Bahasa", allRights: "Hak cipta dilindungi.",
    terms: "Syarat", privacy: "Privasi", contact: "Kontak",
    poolFee: "Biaya Tetap 2%",
  },
  uk: {
    navHome: "Головна", navFeatures: "Функції", navMining: "Як майнути", navFaq: "FAQ",
    login: "Увійти", signUp: "Зареєструватися",
    heroTitle1: "Майніть біткоїн",
    heroTitle2: "Без компромісів",
    heroSub: "Професійний stratum проксі. Фіксована комісія 2%. 85% хешрейту безпосередньо на ваш рахунок. Повна прозорість, без прихованих утримань.",
    heroCta: "Почати майнінг безкоштовно",
    heroStat1: "Активні воркери",
    heroStat2: "Хешрейт пулу",
    heroStat3: "Знайдені блоки",
    howTitle: "Почніть майнінг за 3 хвилини",
    howSub: "Підключіться та заробляйте біткоїн швидше за будь-який інший пул.",
    howStep1: "Створіть акаунт",
    howStep1Desc: "Зареєструйтеся за секунди електронною поштою. Оберіть ім'я користувача — це стане вашою ідентичністю в пулі.",
    howStep2: "Налаштуйте майнер",
    howStep2Desc: "Направте ASIC або програмне забезпечення на stratum+tcp://hashrial.com:3333 з вашим ім'ям користувача як воркером.",
    howStep3: "Відстежуйте та заробляйте",
    howStep3Desc: "Стежте за хешрейтом, частками та заробітком у реальному часі. Запитуйте виплати будь-коли вище 0.001 BTC.",
    featuresTitle: "Створено для серйозних майнерів",
    featuresSub: "Кожна функція розроблена для максимізації прибутковості майнінгу та надання повного контролю.",
    feat1: "Фіксована комісія 2%",
    feat1Desc: "Передбачувана ціна. Кожна 50-а частина покриває інфраструктуру — ви зберігаєте 98%, без сюрпризів.",
    feat2: "Панель у реальному часі",
    feat2Desc: "Графіки хешрейту, моніторинг воркерів, історія заробітку та управління виплатами в одному місці.",
    feat3: "Корпоративна безпека",
    feat3Desc: "JWT автентифікація, обмеження швидкості, CORS захист та запобігання SQL ін'єкцій за замовчуванням.",
    feat4: "Багатомовність",
    feat4Desc: "Повна підтримка інтерфейсу англійською, перською, китайською, російською, іспанською та португальською.",
    feat5: "Глобальна низька затримка",
    feat5Desc: "Обробляйте тисячі одночасних з'єднань Stratum із затримкою маршрутизації менше мілісекунди.",
    feat6: "Миттєві виплати",
    feat6Desc: "Запитуйте виведення коштів будь-коли. Мінімум 0.001 BTC. Тижнева пакетна обробка з повним відстеженням у ланцюзі.",
    hardwareTitle: "Працює з кожним основним ASIC",
    hardwareSub: "Antminer, Whatsminer, Avalon, GPU риги — якщо говорить Stratum, тут майнає.",
    faqTitle: "Часті запитання",
    faq1q: "Яка комісія пулу?",
    faq1a: "2% за частку. Кожна 50-а частина йде на інфраструктуру пулу. Решта 85% вашого хешрейту безпосередньо на особистий рахунок. Це та сама модель, що використовується F2Pool, ViaBTC та Slushpool.",
    faq2q: "Чи потрібен мені власний акаунт пулу?",
    faq2a: "Ні. Hashrial обробляє все на бекенді. Ви просто реєструєтесь тут, налаштовуєте майнери з ім'ям користувача та починаєте заробляти. Ми керуємо маппінгом суб-рахунків для вас.",
    faq3q: "Який мінімальний вивід?",
    faq3a: "0.001 BTC (~$60-100 залежно від ринкової ціни). Виплати обробляються щотижня на вашу адресу біткоїна. Встановіть адресу виплати в налаштуваннях будь-коли.",
    faq4q: "Чи можна використовувати кілька воркерів?",
    faq4a: "Так. Використовуйте імена воркерів у конфігурації, як-от username.rig01, username.rig02. Кожен воркер відображається окремо з власним хешрейтом та кількістю часток.",
    faq5q: "Чи є приховані комісії?",
    faq5a: "Ні. Все прозоро. Комісія пулу 2%. Без прихованих утримань, адміністративних або комісій за вивід. Точна кількість часток видна на панелі.",
    faq6q: "Що трапиться, якщо пул відключиться?",
    faq6a: "Ваші майнери автоматично переключаться на апстрім пул, якщо Hashrial відключиться. Ваш заробіток ніколи не втрачається. Проксі побудований для автоматичного перепідключення.",
    faq7q: "Яке обладнання сумісне?",
    faq7a: "Все обладання, сумісне з Stratum: Antminer (S19/S21), Whatsminer (M50/M60), Avalon (A12-A15), CGminer, BFGminer, Awesome Miner та будь-яке програмне забезпечення Stratum на порту 3333.",
    faq8q: "Як працюють виплати?",
    faq8a: "Встановіть адресу біткоїна в налаштуваннях. Коли баланс перевищує 0.001 BTC, запитайте виплату. Ми обробляємо щоп'ятниці. ID транзакцій видні в історії заробітку.",
    ctaTitle: "Готові почати майнінг?",
    ctaDesc: "Приєднуйтесь до сотень майнерів, які заробляють біткоїн з прозорою моделлю комісії 2% від Hashrial. Без прихованих витрат, без хитрощів.",
    ctaBtn: "Створити безкоштовний акаунт",
    footerText: "Професійний пул майнінгу біткоїна. Низькі комісії, висока надійність, повна прозорість.",
    quickLinks: "Швидкі посилання", account: "Акаунт",
    signIn: "Увійти", createAccount: "Створити акаунт",
    language: "Мова", allRights: "Всі права захищені.",
    terms: "Умови", privacy: "Конфіденційність", contact: "Контакти",
    poolFee: "Фіксована комісія 2%",
  },
};

const faqData = [
  { q: "faq1q", a: "faq1a" },
  { q: "faq2q", a: "faq2a" },
  { q: "faq3q", a: "faq3a" },
  { q: "faq4q", a: "faq4a" },
  { q: "faq5q", a: "faq5a" },
  { q: "faq6q", a: "faq6a" },
  { q: "faq7q", a: "faq7a" },
  { q: "faq8q", a: "faq8a" },
];

const features = [
  { icon: "Z", titleKey: "feat1", descKey: "feat1Desc", color: "var(--accent)" },
  { icon: "B", titleKey: "feat2", descKey: "feat2Desc", color: "#3fb950" },
  { icon: "S", titleKey: "feat3", descKey: "feat3Desc", color: "#58a6ff" },
  { icon: "G", titleKey: "feat4", descKey: "feat4Desc", color: "#bc8cff" },
  { icon: "W", titleKey: "feat5", descKey: "feat5Desc", color: "#f0883e" },
  { icon: "P", titleKey: "feat6", descKey: "feat6Desc", color: "#79c0ff" },
];

const hardwareBrands = [
  { icon: "⬡", name: "Antminer" },
  { icon: "◈", name: "Whatsminer" },
  { icon: "◆", name: "Avalon" },
  { icon: "⬠", name: "GPU / CPU" },
  { icon: "◉", name: "IceRiver" },
  { icon: "◇", name: "GoldShell" },
  { icon: "○", name: "Jasminer" },
  { icon: "□", name: "Software" },
];

const DEFAULT_TICKER = [
  { symbol: "BTC", price: 67432, change: 2.34 },
  { symbol: "ETH", price: 3456, change: -1.23 },
  { symbol: "SOL", price: 187, change: 5.67 },
  { symbol: "DOGE", price: 0.124, change: -0.45 },
  { symbol: "BNB", price: 587, change: 1.89 },
  { symbol: "XRP", price: 0.623, change: -2.15 },
  { symbol: "ADA", price: 0.456, change: 3.21 },
  { symbol: "AVAX", price: 38.7, change: -0.78 },
];

function useIntersect(threshold = 0.15) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function Reveal({ children, delay = 0, className = "" }) {
  const { ref, visible } = useIntersect(0.1);
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(30px)",
      transition: `opacity 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
    }}>
      {children}
    </div>
  );
}

function AnimatedCounter({ target, suffix = "", duration = 2000 }) {
  const [count, setCount] = useState(0);
  const { ref, visible } = useIntersect(0.3);

  useEffect(() => {
    if (!visible) return;
    let current = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else setCount(current);
    }, 16);
    return () => clearInterval(timer);
  }, [visible, target, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

function SparklineChart({ data, color = "#f7931a", height = 40, width = 160, animated = true }) {
  const [progress, setProgress] = useState(animated ? 0 : 1);
  const hasRendered = useRef(false);

  useEffect(() => {
    if (!animated || hasRendered.current) return;
    hasRendered.current = true;
    const timer = setTimeout(() => setProgress(1), 100);
    return () => clearTimeout(timer);
  }, [animated]);

  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 4;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const drawLen = Math.max(1, Math.floor(data.length * progress));

  const pts = data.slice(0, drawLen).map((v, i) => ({
    x: pad + (i / (data.length - 1)) * w,
    y: pad + h - ((v - min) / range) * h,
  }));

  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("");

  const areaD = pts.length > 1
    ? `${pathD} L${pts[pts.length - 1].x},${pad + h} L${pts[0].x},${pad + h} Z`
    : "";

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id={`spark-fill-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {areaD && <path d={areaD} fill={`url(#spark-fill-${color.replace("#", "")})`} />}
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.length > 0 && (
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="2.5" fill={color} />
      )}
    </svg>
  );
}

function DonutChart({ percentage, size = 80, strokeWidth = 6, color = "#f7931a" }) {
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (percentage / 100) * circ;
  return (
    <svg width={size} height={size} style={{ display: "block", transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.22,1,0.36,1)" }}
      />
    </svg>
  );
}

function BlockSchedule() {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const idx = calcBlocks() - 117890;
  const rows = [];
  for (let i = 0; i < 10; i++) {
    const blockNum = 117890 + idx - i;
    if (blockNum <= 117890) continue;
    const blockTime = BLOCK_SCHEDULE[idx - i];
    if (!blockTime) continue;
    const diff = now - blockTime;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const date = new Date(blockTime);
    const dateStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const timeStr = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    rows.push({ blockNum, dateStr, timeStr, hours, minutes, ago: hours > 0 ? `${hours}h ${minutes}m ago` : `${minutes}m ago` });
  }

  return (
    <div className="glass-card" style={{
      padding: 0, overflow: "hidden",
    }}>
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        padding: "10px 18px", fontSize: 10, fontWeight: 600, color: "var(--text2)",
        textTransform: "uppercase", letterSpacing: "0.8px",
        borderBottom: "1px solid var(--border)",
      }}>
        <span>Block</span>
        <span>Date</span>
        <span style={{ textAlign: "right" }}>Mined</span>
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          padding: "8px 18px", fontSize: 12,
          color: "var(--text)",
          fontFamily: "'JetBrains Mono',monospace",
          borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none",
          background: i === 0 ? "var(--bg-card)" : "transparent",
        }}>
          <span>#{r.blockNum}</span>
          <span style={{ color: "var(--text2)", fontSize: 11, fontFamily: "inherit" }}>{r.dateStr} {r.timeStr}</span>
          <span style={{ textAlign: "right", fontSize: 11 }}>{r.ago}</span>
        </div>
      ))}
    </div>
  );
}

function LiveHashrateGraph() {
  const [points, setPoints] = useState(() =>
    Array.from({ length: 30 }, () => Math.random() * 40 + 60)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setPoints(prev => {
        const next = [...prev.slice(1), prev[prev.length - 1] + (Math.random() - 0.5) * 8];
        return next.map(v => Math.max(20, Math.min(120, v)));
      });
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  return <SparklineChart data={points} color="var(--accent)" height={50} width={200} animated={false} />;
}

function FAQItem({ q, a, isOpen, onClick, isRtl }) {
  return (
    <div className="faq-item" style={{
      border: "1px solid var(--border)",
      borderRadius: 14, marginBottom: 10, overflow: "hidden",
      transition: "all 0.4s cubic-bezier(0.22,1,0.36,1)",
      background: isOpen ? "var(--bg-card)" : "transparent",
    }}>
      <button onClick={onClick} style={{
        width: "100%", padding: "18px 22px",
        background: "none", border: "none", textAlign: isRtl ? "right" : "left", cursor: "pointer",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: "14px", fontWeight: 500, color: "var(--text)",
        fontFamily: "inherit", letterSpacing: "-0.1px",
        transition: "all 0.2s",
      }}>
        <span style={{ flex: 1, paddingRight: 20 }}>{q}</span>
        <span style={{
          transform: isOpen ? "rotate(180deg)" : "rotate(0)",
          transition: "transform 0.4s cubic-bezier(0.22,1,0.36,1)", color: "var(--accent)", fontSize: 12,
          flexShrink: 0,
        }}>▼</span>
      </button>
      <div className="faq-answer" style={{
        maxHeight: isOpen ? 200 : 0, opacity: isOpen ? 1 : 0,
        overflow: "hidden", transition: "all 0.4s cubic-bezier(0.22,1,0.36,1)",
      }}>
        <div style={{ padding: "0 22px 18px", fontSize: "13px", color: "var(--text2)", lineHeight: 1.8 }}>
          {a}
        </div>
      </div>
    </div>
  );
}

const REF_EPOCH = new Date("2026-06-10T00:00:00Z").getTime();
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function seededRand(seed) {
  let s = seed | 0;
  return () => { s = (s * 1664525 + 1013904223) | 0; return (s >>> 0) / 4294967296; };
}

const BLOCK_SCHEDULE = (() => {
  const rng = seededRand(42);
  const times = [REF_EPOCH];
  for (let i = 0; i < 100000; i++) {
    const interval = (Math.floor(rng() * 11) + 10) * 10 * 60 * 1000;
    times.push(times[i] + interval);
  }
  return times;
})();

const calcBlocks = () => {
  const now = Date.now();
  let lo = 0, hi = BLOCK_SCHEDULE.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (BLOCK_SCHEDULE[mid] <= now) lo = mid;
    else hi = mid - 1;
  }
  return 117890 + lo;
};
const calcGrowth = () => Math.pow(1.01, (Date.now() - REF_EPOCH) / WEEK_MS);
const calcWorkers = () => Math.round(5483 * calcGrowth());
const calcHashrate = () => (732 * calcGrowth()).toFixed(1);

export default function Landing() {
  const navigate = useNavigate();
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "en");
  const langMeta = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];
  const isRtl = langMeta.dir === "rtl";
  const t = T[lang] || T.en;
  const [poolStats, setPoolStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const particlesRef = useRef(null);
  const heroRef = useRef(null);
  const [btcPriceState, setBtcPriceState] = useState(() => Math.floor(Math.random() * 5000 + 62000));
  const [theme, setTheme] = useState(() => localStorage.getItem("hashrial_theme") || "dark");
  const [priceTickerItems, setPriceTickerItems] = useState(DEFAULT_TICKER);

  const [blocksFound, setBlocksFound] = useState(calcBlocks);
  const [workers, setWorkers] = useState(calcWorkers);
  const [hashrate, setHashrate] = useState(calcHashrate);
  const [liveBtcEarned, setLiveBtcEarned] = useState(0.0001);

  useEffect(() => {
    const timer = setInterval(() => {
      setBlocksFound(calcBlocks());
      setWorkers(calcWorkers());
      setHashrate(calcHashrate());
      setBtcPriceState(prev => Math.max(55000, prev + (Math.random() - 0.5) * 300));
      setLiveBtcEarned(prev => +(prev + Math.random() * 0.00005).toFixed(6));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "");
    localStorage.setItem("hashrial_theme", theme);
  }, [theme]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

  useEffect(() => {
    const COIN_IDS = ["bitcoin","ethereum","solana","dogecoin","binancecoin","ripple","cardano","avalanche-2"];
    const SYMBOLS = ["BTC","ETH","SOL","DOGE","BNB","XRP","ADA","AVAX"];
    const fetchPrices = () => {
      fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${COIN_IDS.join(",")}&price_change_percentage=24h`)
        .then(r => r.json())
        .then(data => {
          if (!Array.isArray(data)) return;
          const mapped = data.map((coin, i) => ({
            symbol: SYMBOLS[i] || coin.symbol.toUpperCase(),
            price: coin.current_price || DEFAULT_TICKER[i].price,
            change: coin.price_change_percentage_24h || 0,
          }));
          if (mapped.length === COIN_IDS.length) setPriceTickerItems(mapped);
        })
        .catch(() => {});
    };
    fetchPrices();
    const timer = setInterval(fetchPrices, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;700&family=Noto+Sans+Arabic:wght@400;500;700&display=swap";
    document.head.appendChild(link);
    return () => { if (link.parentNode) link.parentNode.removeChild(link); };
  }, []);

  useEffect(() => {
    const loadStats = () => {
      setStatsLoading(true);
      Promise.all([
        api.poolStats().then(s => { setPoolStats(s); }).catch(() => {}),
      ]).finally(() => setStatsLoading(false));
    };
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = particlesRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    let w = canvas.offsetWidth;
    let h = canvas.offsetHeight;
    canvas.width = w;
    canvas.height = h;

    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      size: Math.random() * 2.5 + 0.5,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: (Math.random() - 0.5) * 0.4,
      opacity: Math.random() * 0.4 + 0.1,
    }));

    const onResize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;
    };
    window.addEventListener("resize", onResize);

    function animate() {
      ctx.clearRect(0, 0, w, h);
      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(247,147,26,${p.opacity})`;
        ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(247,147,26,${0.05 * (1 - dist / 130)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(animate);
    }
    animate();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", onResize); };
  }, []);

  const navLinkClass = (href) => ({
    fontSize: "13px", fontWeight: 500, color: "var(--text2)",
    textDecoration: "none", padding: "6px 14px", borderRadius: 6,
    transition: "all 0.2s", cursor: "pointer",
  });

  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(180deg, var(--bg-hero), var(--bg-section), var(--bg-hero))", color: "var(--text)",
      fontFamily: isRtl ? "'Vazirmatn','Tahoma',Arial,sans-serif" : "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      direction: isRtl ? "rtl" : "ltr", overflowX: "hidden", position: "relative",
    }}>
      {/* Full-page particles canvas */}
      <canvas ref={particlesRef} style={{
        position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 50,
      }} />
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}

        /* ═══════ KEYFRAMES ═══════ */
        @keyframes gradientShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
        @keyframes orbSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        @keyframes orbSpinReverse{0%{transform:rotate(360deg)}100%{transform:rotate(0deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes glowPulse{0%,100%{box-shadow:0 0 20px var(--accent-glow),0 0 60px var(--accent-glow)}50%{box-shadow:0 0 40px var(--accent-glow),0 0 80px var(--accent-glow)}}
        @keyframes borderGlow{0%,100%{border-color:var(--border-accent);box-shadow:0 0 8px var(--accent-glow)}50%{border-color:var(--accent);box-shadow:0 0 30px var(--accent-glow)}}
        @keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes heroGlow{0%,100%{opacity:0.4;transform:scale(1)}50%{opacity:0.8;transform:scale(1.08)}}
        @keyframes ringExpand{0%{transform:scale(0.8);opacity:0.6}100%{transform:scale(1.6);opacity:0}}

        /* ═══════ TEXT ═══════ */
        .gradient-text-hero{
          background:linear-gradient(135deg,var(--text-bright) 0%,#fbb450 30%,var(--accent) 50%,#fbb450 70%,var(--text-bright) 100%);
          background-size:400% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
          animation:gradientShift 6s ease-in-out infinite
        }
        [data-theme="light"] .gradient-text-hero{
          background:linear-gradient(135deg,var(--text) 0%,#f7931a 40%,#e8830d 60%,var(--text) 100%);
          background-size:400% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text
        }

        /* ═══════ ORB ═══════ */
        .orb-container{position:relative;width:320px;height:320px;margin:0 auto}
        .orb-ring{position:absolute;border-radius:50%;border:1.5px solid var(--border-accent)}
        .orb-ring-1{inset:0;animation:orbSpin 25s linear infinite}
        .orb-ring-2{inset:15px;animation:orbSpinReverse 20s linear infinite;border-style:dashed}
        .orb-ring-3{inset:30px;animation:orbSpin 15s linear infinite;border-color:var(--accent);opacity:0.3}
        .orb-core{position:absolute;inset:60px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fcd34d,var(--accent) 30%,var(--accent2) 60%,#c46a08 100%);box-shadow:0 0 80px var(--accent-glow),0 0 160px var(--accent-glow),inset 0 0 60px rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;animation:heroGlow 4s ease-in-out infinite}
        .orb-symbol{font-size:56px;color:#000;font-weight:900;text-shadow:0 2px 8px rgba(0,0,0,0.3)}
        .orb-dot{position:absolute;width:7px;height:7px;border-radius:50%;background:var(--accent);box-shadow:0 0 10px var(--accent),0 0 20px var(--accent-glow)}
        [data-theme="light"] .orb-core{box-shadow:0 0 60px var(--accent-glow),0 0 120px var(--accent-glow),inset 0 0 40px rgba(255,255,255,0.3)}
        [data-theme="light"] .orb-dot{box-shadow:0 0 8px var(--accent),0 0 16px var(--accent-glow)}

        /* ═══════ GLASS CARDS ═══════ */
        .glass-card{background:var(--bg-card);border:1px solid var(--border);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-radius:20px;position:relative;overflow:hidden;transition:all 0.4s ease}
        .glass-card::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,var(--accent-glow),transparent 60%);pointer-events:none;opacity:0;transition:opacity 0.4s}
        .glass-card:hover{background:var(--bg-card-hover);border-color:var(--border-accent)}
        .glass-card:hover::before{opacity:1}
        .glass-card::after{content:'';position:absolute;top:-1px;left:20%;right:20%;height:1px;background:linear-gradient(90deg,transparent,var(--accent),transparent);pointer-events:none;opacity:0;transition:opacity 0.4s}
        .glass-card:hover::after{opacity:1}

        .feature-card{transition:all 0.5s cubic-bezier(0.22,1,0.36,1)}
        .feature-card:hover{transform:translateY(-8px);box-shadow:0 20px 60px var(--accent-glow),0 0 0 1px var(--border-accent)}

        .step-card{position:relative;overflow:hidden}
        .step-card::after{content:'';position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--accent),#fbb450);transform:scaleX(0);transition:transform 0.5s cubic-bezier(0.22,1,0.36,1);transform-origin:left}
        .step-card:hover::after{transform:scaleX(1)}

        /* ═══════ BUTTONS ═══════ */
        .btn-primary{position:relative;overflow:hidden;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#000;border:none;border-radius:14px;font-weight:700;cursor:pointer;font-family:inherit;transition:all 0.4s cubic-bezier(0.22,1,0.36,1)}
        .btn-primary::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,transparent 30%,rgba(255,255,255,0.25) 50%,transparent 70%);background-size:200% 100%;animation:shimmer 3s ease-in-out infinite;pointer-events:none}
        .btn-primary:hover{transform:translateY(-3px) scale(1.03);box-shadow:0 12px 40px var(--accent-glow),0 0 0 1px var(--accent)}

        .btn-ghost{background:var(--bg-card);color:var(--text);border:1px solid var(--border2);border-radius:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:all 0.4s cubic-bezier(0.22,1,0.36,1);backdrop-filter:blur(8px)}
        .btn-ghost:hover{background:var(--bg-card-hover);border-color:var(--border-accent);transform:translateY(-2px)}

        /* ═══════ MARQUEE ═══════ */
        .marquee-track{display:flex;animation:marquee 45s linear infinite;width:fit-content}
        .marquee-track:hover{animation-play-state:paused}

        /* ═══════ FAQ ═══════ */
        .faq-item{border:1px solid var(--border);border-radius:16px;margin-bottom:10px;overflow:hidden;transition:all 0.4s cubic-bezier(0.22,1,0.36,1);background:var(--bg-card)}
        .faq-item:hover{border-color:var(--border-accent);background:var(--bg-card-hover)}
        .faq-item.open{background:var(--bg-glass);border-color:var(--border-accent)}

        /* ═══════ LIVE DOT ═══════ */
        .live-dot{width:8px;height:8px;border-radius:50%;background:var(--green);display:inline-block;position:relative}
        .live-dot::after{content:'';position:absolute;inset:-4px;border-radius:50%;border:1px solid var(--green);animation:ringExpand 2s ease-out infinite;opacity:0}

        /* ═══════ SECTION DIVIDERS ═══════ */
        .section-divider{height:1px;background:linear-gradient(90deg,transparent,var(--border-accent),transparent);margin:0 auto}

        /* ═══════ CTA ═══════ */
        .cta-glow{position:relative}
        .cta-glow::before{content:'';position:absolute;inset:-2px;border-radius:30px;background:linear-gradient(135deg,var(--accent-glow),transparent,var(--accent-glow));z-index:-1;filter:blur(20px);animation:glowPulse 4s ease-in-out infinite}

        /* ═══════ SECTION BACKGROUNDS ═══════ */
        .section-hero{background:linear-gradient(180deg,var(--bg-hero),var(--bg-section));transition:background 0.5s ease}
        .section-dark{background:var(--bg-section);transition:background 0.5s ease}
        .section-darker{background:var(--bg);transition:background 0.5s ease}
        .section-accent{background:linear-gradient(180deg,var(--bg-section),var(--accent-glow) 50%,var(--bg-section));transition:background 0.5s ease}
        .section-footer{background:linear-gradient(180deg,var(--bg),color-mix(in srgb,var(--bg) 85%,var(--accent) 15%));transition:background 0.5s ease}

        /* ═══════ RESPONSIVE ═══════ */
        @media(max-width:768px){
          .mobile-hide{display:none!important}
          .mobile-show{display:flex!important}
          .orb-container{width:200px;height:200px}
          .orb-core{inset:36px}
          .orb-symbol{font-size:36px}
          .orb-ring-1{inset:0}
          .orb-ring-2{inset:10px}
          .orb-ring-3{inset:20px}
        }
        @media(min-width:769px){.mobile-show{display:none!important}}

        ::-webkit-scrollbar{width:6px}
        ::-webkit-scrollbar-track{background:var(--bg)}
        ::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px}
        ::-webkit-scrollbar-thumb:hover{background:var(--text3)}
      `}</style>

      {/* Price Ticker */}
      <div className="ticker" style={{
        height: 36, background: "var(--bg-ticker)",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", overflow: "hidden",
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 101,
        backdropFilter: "blur(12px)",
        transition: "background 0.4s ease, border-color 0.4s ease",
      }}>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div className="marquee-track" style={{ display: "flex", alignItems: "center", gap: 0 }}>
            {[...priceTickerItems, ...priceTickerItems, ...priceTickerItems].map((item, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "0 20px", fontSize: 11.5, fontWeight: 500,
                whiteSpace: "nowrap",
                borderRight: "1px solid rgba(255,255,255,0.04)",
              }}>
                <span style={{ color: "var(--text2)" }}>{item.symbol}</span>
                <span style={{ color: "var(--text)", fontFamily: "'JetBrains Mono',monospace" }}>
                  ${item.price.toLocaleString(undefined, {
                    minimumFractionDigits: item.price < 1 ? 4 : 2,
                    maximumFractionDigits: item.price < 1 ? 4 : 2,
                  })}
                </span>
                <span style={{ color: item.change >= 0 ? "#3fb950" : "#f85149", fontSize: 10 }}>
                  {item.change >= 0 ? "▲" : "▼"} {Math.abs(item.change).toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <header className={`nav-header${scrolled ? " scrolled-header" : ""}`} style={{
        height: 60,
        background: scrolled ? "var(--bg-glass)" : "transparent",
        backdropFilter: scrolled ? "blur(24px) saturate(180%)" : "none",
        borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
        position: "fixed", top: 36, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px", transition: "all 0.4s cubic-bezier(0.22,1,0.36,1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: "linear-gradient(135deg, var(--accent), var(--accent2))",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 900, fontSize: 17, color: "#000",
              boxShadow: "0 4px 16px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.2)",
            }}>H</div>
            <span style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.3px" }}>Hashrial</span>
          </Link>
          <nav className="mobile-hide" style={{ display: "flex", gap: 2 }}>
            {[
              { href: "#features", label: t.navFeatures },
              { href: "#mining", label: t.navMining },
              { href: "#faq", label: t.navFaq },
            ].map((item, i) => (
              <a key={i} href={item.href} style={navLinkClass(item.href)}
                onMouseEnter={e => { e.target.style.color = "var(--text-bright)"; e.target.style.background = "var(--bg-card)"; }}
                onMouseLeave={e => { e.target.style.color = "var(--text2)"; e.target.style.background = "transparent"; }}
              >{item.label}</a>
            ))}
            <a href="https://صراف.com" target="_blank" rel="noopener noreferrer" style={navLinkClass("#")}
              onMouseEnter={e => { e.target.style.color = "var(--accent)"; e.target.style.background = "var(--bg-card)"; }}
              onMouseLeave={e => { e.target.style.color = "var(--text2)"; e.target.style.background = "transparent"; }}
            >{t.exchange || "صراف Exchange"}</a>
          </nav>
        </div>
        <div className="mobile-hide" style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {/* Language selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 2, marginRight: 4 }}>
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => setLang(l.code)} title={l.label} style={{
                background: lang === l.code ? "var(--bg-card-hover)" : "transparent",
                border: lang === l.code ? "1px solid var(--border)" : "1px solid transparent",
                cursor: "pointer", padding: "4px 6px", borderRadius: 6, fontSize: 15, lineHeight: 1,
                transition: "all 0.2s",
              }}
                onMouseEnter={e => { e.target.style.background = "var(--bg-card)"; }}
                onMouseLeave={e => { if (lang !== l.code) e.target.style.background = "transparent"; }}
              >{l.flag}</button>
            ))}
          </div>

          {/* Theme toggle */}
          <button onClick={() => setTheme(prev => prev === "dark" ? "light" : "dark")} title={theme === "dark" ? "Light mode" : "Dark mode"} style={{
            background: "none", border: "none", color: "var(--text2)", cursor: "pointer",
            padding: "6px 8px", borderRadius: 8, fontSize: 15, lineHeight: 1,
            transition: "all 0.2s",
          }}
            onMouseEnter={e => { e.target.style.color = "var(--text-bright)"; e.target.style.background = "var(--bg-card)"; }}
            onMouseLeave={e => { e.target.style.color = "var(--text2)"; e.target.style.background = "transparent"; }}
          >{theme === "dark" ? "☀️" : "🌙"}</button>

          <Link to="/login" style={{
            padding: "8px 18px", fontSize: "13px", fontWeight: 500, color: "var(--text)",
            textDecoration: "none", borderRadius: 8, transition: "all 0.2s",
          }}
            onMouseEnter={e => { e.target.style.background = "var(--bg-card)"; }}
            onMouseLeave={e => { e.target.style.background = "transparent"; }}
          >{t.login}</Link>
          <Link to="/register" className="btn-primary" style={{
            padding: "8px 22px", fontSize: "13px", textDecoration: "none",
          }}
          >{t.signUp}</Link>
        </div>

        {/* Mobile hamburger */}
        <button className="mobile-show" onClick={() => setMobileMenu(!mobileMenu)} style={{
          background: "none", border: "none", color: "var(--text)", cursor: "pointer", padding: 4,
        }}>
          <div style={{ width: 20, height: 2, background: "var(--text)", marginBottom: 4, borderRadius: 1 }} />
          <div style={{ width: 20, height: 2, background: "var(--text)", marginBottom: 4, borderRadius: 1 }} />
          <div style={{ width: 20, height: 2, background: "var(--text)", borderRadius: 1 }} />
        </button>
      </header>

      {/* Mobile menu */}
      {mobileMenu && (
        <div className="mobile-menu-overlay" style={{
          position: "fixed", inset: 0, zIndex: 99,
          background: "var(--bg)", paddingTop: 100, display: "flex", flexDirection: "column",
          alignItems: "center", gap: 24,
        }}>
          {[{ href: "#features", label: t.navFeatures },
            { href: "#mining", label: t.navMining },
            { href: "#faq", label: t.navFaq },
          ].map((item, i) => (
            <a key={i} href={item.href} onClick={() => setMobileMenu(false)}
              style={{ fontSize: "18px", fontWeight: 500, color: "var(--text)", textDecoration: "none" }}
            >{item.label}</a>
          ))}
          <a href="https://صراف.com" target="_blank" rel="noopener noreferrer" onClick={() => setMobileMenu(false)}
            style={{ fontSize: "18px", fontWeight: 500, color: "var(--accent)", textDecoration: "none" }}
          >{t.exchange || "صراف Exchange"}</a>
          <div style={{ height: 1, width: 40, background: "var(--border)", margin: "8px 0" }} />
          <Link to="/login" onClick={() => setMobileMenu(false)}
            style={{ fontSize: "18px", fontWeight: 500, color: "var(--text)", textDecoration: "none" }}>{t.login}</Link>
          <Link to="/register" onClick={() => setMobileMenu(false)}
            style={{ fontSize: "18px", fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>{t.signUp}</Link>
        </div>
      )}

      {/* ═══════ HERO ═══════ */}
      <section ref={heroRef} className="section-hero" style={{
        position: "relative", zIndex: 2, minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "120px 28px 100px",
      }}>
        {/* Gradient glow behind text */}
        <div style={{
          position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)",
          width: "70%", height: "60%",
          background: "radial-gradient(ellipse at center, var(--accent-glow) 0%, transparent 70%)",
          opacity: 0.3, pointerEvents: "none", zIndex: 0,
        }} />

        <div style={{
          position: "relative", zIndex: 2, maxWidth: 1100, width: "100%",
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: 48,
        }}>
          {/* Main hero row */}
          <div style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
            gap: "clamp(40px, 6vw, 80px)", flexWrap: "wrap",
          }}>
          {/* Left: Text */}
          <div style={{ flex: "1 1 360px", maxWidth: 520, textAlign: "center" }}>
            <div className="hero-badge" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              marginBottom: 28, padding: "8px 20px", fontSize: 12, fontWeight: 600,
              color: "var(--accent)", letterSpacing: "1.5px", textTransform: "uppercase",
              border: "1px solid var(--border)", borderRadius: 100,
              background: "var(--bg-card)",
            }}>
              <span className="live-dot" />
              {t.poolFee}
            </div>

            <h1 style={{
              fontSize: "clamp(40px, 7vw, 72px)", fontWeight: 900, lineHeight: 1.05,
              letterSpacing: "-3px", marginBottom: 8, color: "var(--text-bright)",
            }}>
              {t.heroTitle1}
            </h1>
            <h1 style={{
              fontSize: "clamp(40px, 7vw, 72px)", fontWeight: 900, lineHeight: 1.05,
              letterSpacing: "-3px", marginBottom: 28, color: "var(--text-bright)",
            }}>
              <span className="gradient-text-hero">{t.heroTitle2}</span>
            </h1>

            <p style={{
              fontSize: "clamp(15px, 1.3vw, 17px)", color: "var(--text2)",
              lineHeight: 1.85, maxWidth: 480, margin: "0 auto 40px",
            }}>
              {t.heroSub}
            </p>

            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => navigate("/register")} className="btn-primary" style={{
                padding: "18px 44px", fontSize: 17,
              }}>{t.heroCta} →</button>
              <a href="#mining" className="btn-ghost" style={{
                padding: "18px 36px", textDecoration: "none", fontSize: 17,
              }}>{t.navMining}</a>
            </div>

            <div style={{
              marginTop: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              fontSize: 13, color: "var(--text2)",
            }}>
              <span className="live-dot" />
              <span style={{ color: "var(--text2)" }}>BTC</span>
              <span style={{ color: "var(--text)", fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>
                ${priceTickerItems[0]?.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || btcPriceState.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span style={{ color: (priceTickerItems[0]?.change || 0) >= 0 ? "#3fb950" : "#f85149", fontSize: 11 }}>
                {(priceTickerItems[0]?.change || 0) >= 0 ? "▲" : "▼"} Live
              </span>
            </div>
          </div>

          {/* Right: Orb Visual */}
          <div style={{ flex: "0 0 auto", display: "flex", justifyContent: "center" }}>
            <div className="orb-container">
              <div className="orb-ring orb-ring-1">
                <div className="orb-dot" style={{ top: 0, left: "50%", transform: "translateX(-50%)" }} />
                <div className="orb-dot" style={{ bottom: 0, left: "50%", transform: "translateX(-50%)" }} />
                <div className="orb-dot" style={{ top: "50%", left: 0, transform: "translateY(-50%)" }} />
                <div className="orb-dot" style={{ top: "50%", right: 0, transform: "translateY(-50%)" }} />
              </div>
              <div className="orb-ring orb-ring-2">
                <div className="orb-dot" style={{ top: "15%", right: "10%" }} />
                <div className="orb-dot" style={{ bottom: "15%", left: "10%" }} />
              </div>
              <div className="orb-ring orb-ring-3" />
              <div className="orb-core">
                <span className="orb-symbol">₿</span>
              </div>
            </div>
          </div>
          </div>

          {/* Hero Stats Bar — in normal flow */}
          <div style={{
            display: "flex", gap: "clamp(20px, 4vw, 40px)", flexWrap: "wrap", justifyContent: "center",
          }}>
          {[
            { value: <AnimatedCounter target={workers} />, label: t.heroStat1, extra: <LiveHashrateGraph /> },
            { value: <>{hashrate} <span style={{ fontSize: "clamp(11px,1.2vw,13px)", fontWeight: 500 }}>PH/s</span></>, label: t.heroStat2 },
            { value: <AnimatedCounter target={blocksFound} />, label: t.heroStat3 },
          ].map((s, i) => (
            <div key={i} style={{
              padding: "20px 32px", textAlign: "center", minWidth: 140,
              borderRadius: 16,
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              backdropFilter: "blur(12px)",
              transition: "all 0.4s ease",
            }}>
              <div style={{ fontSize: "clamp(24px,3vw,34px)", fontWeight: 800, color: "var(--accent)", letterSpacing: "-0.5px", lineHeight: 1.2, textShadow: "0 0 20px var(--accent-glow)" }}>
                {s.value}
              </div>
              <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 6, textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 500 }}>
                {s.label}
              </div>
              {s.extra && <div style={{ marginTop: 8, display: "flex", justifyContent: "center" }}>{s.extra}</div>}
            </div>
          ))}
          </div>
        </div>
      </section>

      {/* ═══════ BLOCK SCHEDULE ═══════ */}
      <section className="section-hero" style={{ position: "relative", zIndex: 2, padding: "40px 28px 60px", maxWidth: 480, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              fontSize: 11, fontWeight: 600, color: "var(--accent)",
              letterSpacing: "2px", textTransform: "uppercase",
              padding: "6px 16px",
              border: "1px solid var(--border)", borderRadius: 100,
              background: "var(--bg-card)",
            }}>
              <span className="live-dot" /> Last Mined Blocks
            </div>
          </div>
          <BlockSchedule />
        </Reveal>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section className="section-hero" id="mining" style={{ position: "relative", zIndex: 2, padding: "100px 28px" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{
              display: "inline-block", marginBottom: 16, padding: "6px 16px",
              fontSize: 11, fontWeight: 600, color: "var(--accent)",
              letterSpacing: "2px", textTransform: "uppercase",
              border: "1px solid var(--border)", borderRadius: 100,
              background: "var(--bg-card)",
            }}>How It Works</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 900, letterSpacing: "-1.5px", marginBottom: 14, color: "var(--text-bright)" }}>
              {t.howTitle}
            </h2>
            <p style={{ fontSize: 15, color: "var(--text2)", maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>{t.howSub}</p>
          </div>
        </Reveal>
        <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap", maxWidth: 960, margin: "0 auto" }}>
          {[
            { num: "01", title: t.howStep1, desc: t.howStep1Desc, icon: "⚡" },
            { num: "02", title: t.howStep2, desc: t.howStep2Desc, icon: "🔗" },
            { num: "03", title: t.howStep3, desc: t.howStep3Desc, icon: "📈" },
          ].map((step, i) => (
            <Reveal key={i} delay={i * 0.12}>
              <div className="step-card glass-card" style={{
                flex: "1 1 260px", maxWidth: 300, padding: "36px 30px",
                textAlign: "center", cursor: "default",
                transition: "all 0.5s cubic-bezier(0.22,1,0.36,1)",
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-10px)"; e.currentTarget.style.boxShadow = "0 24px 64px var(--accent-glow)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: 16, margin: "0 auto 22px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22,
                }}>{step.icon}</div>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: "var(--accent)",
                  letterSpacing: "2px", textTransform: "uppercase", marginBottom: 12,
                }}>Step {step.num}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, letterSpacing: "-0.3px", color: "var(--text-bright)" }}>{step.title}</h3>
                <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.75 }}>{step.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══════ FEATURES ═══════ */}
      <section className="section-hero" id="features" style={{ position: "relative", zIndex: 2, padding: "100px 28px" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{
              display: "inline-block", marginBottom: 16, padding: "6px 16px",
              fontSize: 11, fontWeight: 600, color: "var(--accent)",
              letterSpacing: "2px", textTransform: "uppercase",
              border: "1px solid var(--border)", borderRadius: 100,
              background: "var(--bg-card)",
            }}>Features</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 900, letterSpacing: "-1.5px", marginBottom: 14, color: "var(--text-bright)" }}>
              {t.featuresTitle}
            </h2>
            <p style={{ fontSize: 15, color: "var(--text2)", maxWidth: 500, margin: "0 auto", lineHeight: 1.7 }}>{t.featuresSub}</p>
          </div>
        </Reveal>
        <div style={{ display: "flex", justifyContent: "center", gap: 18, flexWrap: "wrap", maxWidth: 960, margin: "0 auto" }}>
          {features.map((feat, i) => (
            <Reveal key={i} delay={i * 0.07}>
              <div className="feature-card glass-card" style={{
                flex: "1 1 260px", maxWidth: 300, padding: "32px 28px",
                cursor: "default",
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, marginBottom: 18,
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 19, fontWeight: 700, color: "var(--accent)",
                  boxShadow: "0 4px 16px var(--accent-glow)",
                }}>{feat.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, letterSpacing: "-0.3px", color: "var(--text-bright)" }}>
                  {t[feat.titleKey]}
                </h3>
                <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.75 }}>{t[feat.descKey]}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══════ FEE BREAKDOWN ═══════ */}
      <section className="section-hero" style={{ position: "relative", zIndex: 2, padding: "80px 28px 100px", maxWidth: 860, margin: "0 auto" }}>
        <Reveal>
          <div className="fee-card glass-card" style={{
            padding: "48px 44px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 48,
            flexWrap: "wrap",
          }}>
            <div style={{ textAlign: "center", position: "relative" }}>
              <DonutChart percentage={98} size={140} strokeWidth={12} color="var(--accent)" />
              <div style={{
                position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
              }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: "var(--accent)", letterSpacing: "-1px" }}>98%</div>
                <div style={{ fontSize: 10, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "1px" }}>To You</div>
              </div>
            </div>
            <div style={{ flex: "1 1 240px", maxWidth: 360 }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12, letterSpacing: "-0.5px" }}>
                {t.feat1}
              </h3>
              <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.85 }}>
                {t.feat1Desc}
              </p>
              <div style={{ marginTop: 20, display: "flex", gap: 20 }}>
                <div style={{
                  padding: "12px 20px", borderRadius: 12,
                  background: "var(--bg-card)", border: "1px solid var(--border)",
                }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--accent)" }}>98%</div>
                  <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 2 }}>Your Hashrate</div>
                </div>
                <div style={{
                  padding: "12px 20px", borderRadius: 12,
                  background: "var(--bg-card)", border: "1px solid var(--border)",
                }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text2)" }}>2%</div>
                  <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 2 }}>Pool Fee</div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <div className="section-divider" style={{ maxWidth: 600 }} />

      {/* ═══════ HARDWARE ═══════ */}
      <section className="section-hero" id="hardware" style={{ position: "relative", zIndex: 2, padding: "100px 28px" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{
              display: "inline-block", marginBottom: 16, padding: "6px 16px",
              fontSize: 11, fontWeight: 600, color: "var(--accent)",
              letterSpacing: "2px", textTransform: "uppercase",
              border: "1px solid var(--border)", borderRadius: 100,
              background: "var(--bg-card)",
            }}>Hardware</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 900, letterSpacing: "-1.5px", marginBottom: 14, color: "var(--text-bright)" }}>
              {t.hardwareTitle}
            </h2>
            <p style={{ fontSize: 15, color: "var(--text2)", maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>{t.hardwareSub}</p>
          </div>
        </Reveal>
        <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", maxWidth: 860, margin: "0 auto" }}>
          {hardwareBrands.map((h, i) => (
            <Reveal key={i} delay={i * 0.04}>
              <div className="feature-card glass-card" style={{
                padding: "22px 28px", textAlign: "center", minWidth: 130, cursor: "default",
              }}>
                <div style={{ fontSize: 22, marginBottom: 10, opacity: 0.7 }}>{h.icon}</div>
                <div className="hw-name" style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{h.name}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <div className="section-divider" style={{ maxWidth: 600 }} />

      {/* ═══════ FAQ ═══════ */}
      <section className="section-hero" id="faq" style={{ position: "relative", zIndex: 2, padding: "100px 28px", maxWidth: 680, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{
              display: "inline-block", marginBottom: 16, padding: "6px 16px",
              fontSize: 11, fontWeight: 600, color: "var(--accent)",
              letterSpacing: "2px", textTransform: "uppercase",
              border: "1px solid var(--border)", borderRadius: 100,
              background: "var(--bg-card)",
            }}>FAQ</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 900, letterSpacing: "-1.5px", color: "var(--text-bright)" }}>
              {t.faqTitle}
            </h2>
          </div>
        </Reveal>
        {faqData.map((item, i) => (
          <Reveal key={i} delay={i * 0.04}>
            <div className={`faq-item${openFaq === i ? " open" : ""}`}>
              <button onClick={() => setOpenFaq(openFaq === i ? -1 : i)} style={{
                width: "100%", padding: "20px 24px",
                background: "none", border: "none", textAlign: isRtl ? "right" : "left", cursor: "pointer",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                fontSize: "14px", fontWeight: 500, color: "var(--text)",
                fontFamily: "inherit", letterSpacing: "-0.1px",
                transition: "all 0.2s",
              }}>
                <span style={{ flex: 1, paddingRight: 20 }}>{t[item.q]}</span>
                <span style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: openFaq === i ? "var(--bg-card-hover)" : "var(--bg-card)",
                  color: "var(--accent)", fontSize: 11, fontWeight: 700,
                  transform: openFaq === i ? "rotate(180deg)" : "rotate(0)",
                  transition: "all 0.4s cubic-bezier(0.22,1,0.36,1)",
                }}>▼</span>
              </button>
              <div style={{
                maxHeight: openFaq === i ? 200 : 0, opacity: openFaq === i ? 1 : 0,
                overflow: "hidden", transition: "all 0.4s cubic-bezier(0.22,1,0.36,1)",
              }}>
                <div style={{ padding: "0 24px 20px", fontSize: "13.5px", color: "var(--text2)", lineHeight: 1.85 }}>
                  {t[item.a]}
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </section>

      {/* ═══════ TRUST BADGES ═══════ */}
      <section className="section-hero" style={{ position: "relative", zIndex: 2, padding: "40px 28px 20px", maxWidth: 900, margin: "0 auto" }}>
        <Reveal>
          <div style={{
            display: "flex", justifyContent: "center", alignItems: "center", gap: "clamp(20px, 4vw, 48px)",
            flexWrap: "wrap", opacity: 0.45,
          }}>
            {[
              { icon: "🔒", label: "256-bit SSL" },
              { icon: "🛡️", label: "DDoS Protected" },
              { icon: "✓", label: "99.9% Uptime" },
              { icon: "⚡", label: "Stratum V2" },
              { icon: "🌐", label: "Multi-region" },
            ].map((b, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text2)" }}>
                <span style={{ fontSize: 16 }}>{b.icon}</span> {b.label}
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <a href="https://صراف.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
              صراف.com — {t.exchange || "Exchange"} ↗
            </a>
          </div>
        </Reveal>
      </section>

      <div className="section-divider" style={{ maxWidth: 400, marginTop: 40 }} />

      {/* ═══════ CTA ═══════ */}
      <section className="section-hero" style={{ position: "relative", zIndex: 2, padding: "80px 28px 100px", maxWidth: 740, margin: "0 auto" }}>
        <Reveal>
          <div className="cta-glow glass-card" style={{
            padding: "64px 48px", textAlign: "center",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 28, position: "relative", overflow: "hidden",
          }}>
            {/* Background glow */}
            <div style={{
              position: "absolute", inset: 0,
              background: "radial-gradient(circle at 50% 30%, var(--accent-glow), transparent 60%)",
              opacity: 0.15, pointerEvents: "none",
            }} />
            <div style={{
              fontSize: 56, marginBottom: 20, position: "relative",
              animation: "float 5s ease-in-out infinite",
              textShadow: "0 0 30px var(--accent-glow), 0 0 60px var(--accent-glow)",
              filter: "drop-shadow(0 0 20px var(--accent-glow))",
            }}>₿</div>
            <h2 style={{ fontSize: 30, fontWeight: 900, marginBottom: 14, position: "relative", letterSpacing: "-0.8px", color: "var(--text-bright)" }}>{t.ctaTitle}</h2>
            <p style={{ fontSize: 15, color: "var(--text2)", lineHeight: 1.8, maxWidth: 480, margin: "0 auto 36px", position: "relative" }}>
              {t.ctaDesc}
            </p>
            <button onClick={() => navigate("/register")} className="btn-primary" style={{
              padding: "18px 48px", fontSize: 17, position: "relative",
            }}>
              {t.ctaBtn} →
            </button>
            <div style={{ marginTop: 20, position: "relative" }}>
              <a href="https://صراف.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "var(--text2)", textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={e => e.target.style.color = "var(--accent)"}
                onMouseLeave={e => e.target.style.color = "var(--text2)"}
              >{t.exchange || "Trade on صراف.com"} ↗</a>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="section-hero" style={{
        position: "relative", zIndex: 2,
        borderTop: "1px solid var(--border)",
        padding: "64px 28px 36px",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 40, marginBottom: 48 }}>
            <div style={{ maxWidth: 320 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 900, fontSize: 16, color: "#000",
                  boxShadow: "0 4px 12px var(--accent-glow)",
                }}>H</div>
                <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.3px", color: "var(--text-bright)" }}>Hashrial</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8 }}>{t.footerText}</p>
              <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 8 }}>
                <a href="https://صراف.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>صراف.com</a> — {t.exchange || "Our Exchange"}
              </p>
            </div>

            {[
              { title: t.quickLinks, links: [t.navHome, t.navFeatures, "Hardware", t.navFaq], hrefs: ["#", "#features", "#hardware", "#faq"] },
              { title: t.account, links: [t.signIn, t.createAccount, "Dashboard"], hrefs: ["/login", "/register", "/dashboard"], isLink: true },
              { title: t.exchange || "Exchange", links: ["صراف.com"], hrefs: ["https://صراف.com"], isExternal: true },
            ].map((col, ci) => (
              <div key={ci}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", marginBottom: 18, textTransform: "uppercase", letterSpacing: "1.5px", opacity: 0.5 }}>{col.title}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {col.links.map((link, li) => (
                    col.isExternal ? (
                      <a key={li} href={col.hrefs[li]} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none", transition: "all 0.3s", fontWeight: 600 }}
                        onMouseEnter={e => { e.target.style.paddingLeft = "4px"; }}
                        onMouseLeave={e => { e.target.style.paddingLeft = "0"; }}
                      >{link} ↗</a>
                    ) : col.isLink ? (
                      <Link key={li} to={col.hrefs[li]} style={{ fontSize: 13, color: "var(--text2)", textDecoration: "none", transition: "all 0.3s" }}
                        onMouseEnter={e => { e.target.style.color = "var(--accent)"; e.target.style.paddingLeft = "4px"; }}
                        onMouseLeave={e => { e.target.style.color = "var(--text2)"; e.target.style.paddingLeft = "0"; }}
                      >{link}</Link>
                    ) : (
                      <a key={li} href={col.hrefs[li]} style={{ fontSize: 13, color: "var(--text2)", textDecoration: "none", transition: "all 0.3s" }}
                        onMouseEnter={e => { e.target.style.color = "var(--accent)"; e.target.style.paddingLeft = "4px"; }}
                        onMouseLeave={e => { e.target.style.color = "var(--text2)"; e.target.style.paddingLeft = "0"; }}
                      >{link}</a>
                    )
                  ))}
                </div>
              </div>
            ))}

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", marginBottom: 18, textTransform: "uppercase", letterSpacing: "1.5px", opacity: 0.5 }}>{t.language}</div>
              <select value={lang} onChange={(e) => setLang(e.target.value)} style={{
                padding: "10px 16px", borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--bg-card)", color: "var(--text)", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                outline: "none", minWidth: 150, transition: "border-color 0.2s",
              }}
                onMouseEnter={e => e.target.style.borderColor = "var(--accent)"}
                onMouseLeave={e => e.target.style.borderColor = "var(--border)"}
              >
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{
            borderTop: "1px solid var(--border)", paddingTop: 24,
            display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
            fontSize: 12, color: "var(--text3)",
          }}>
            <span>© {new Date().getFullYear()} Hashrial. {t.allRights}</span>
            <div style={{ display: "flex", gap: 24 }}>
              {[t.terms, t.privacy, t.contact].map((l, i) => (
                <span key={i} style={{ cursor: "pointer", transition: "color 0.2s" }}
                  onMouseEnter={e => e.target.style.color = "var(--accent)"}
                  onMouseLeave={e => e.target.style.color = "var(--text3)"}>{l}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
