import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧", dir: "ltr" },
  { code: "fa", label: "فارسی", flag: "🇮🇷", dir: "rtl" },
  { code: "zh", label: "中文", flag: "🇨🇳", dir: "ltr" },
  { code: "ru", label: "Русский", flag: "🇷🇺", dir: "ltr" },
  { code: "es", label: "Español", flag: "🇪🇸", dir: "ltr" },
  { code: "pt", label: "Português", flag: "🇵🇹", dir: "ltr" },
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
    feat4Desc: "Full interface support for English, Persian, Chinese, Russian, Spanish, and Portuguese.",
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
  { icon: "Z", titleKey: "feat1", descKey: "feat1Desc", color: "#f7931a" },
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

const priceTickerItems = [
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

  return <SparklineChart data={points} color="#f7931a" height={50} width={200} animated={false} />;
}

function FAQItem({ q, a, isOpen, onClick, isRtl }) {
  return (
    <div className="faq-item" style={{
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 14, marginBottom: 10, overflow: "hidden",
      transition: "all 0.4s cubic-bezier(0.22,1,0.36,1)",
      background: isOpen ? "linear-gradient(135deg, rgba(247,147,26,0.04), rgba(247,147,26,0.01))" : "transparent",
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
          transition: "transform 0.4s cubic-bezier(0.22,1,0.36,1)", color: "#f7931a", fontSize: 12,
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
  const [blocksFound, setBlocksFound] = useState(117890);
  const [btcPriceState, setBtcPriceState] = useState(() => Math.floor(Math.random() * 5000 + 62000));
  const [theme, setTheme] = useState(() => localStorage.getItem("hashrial_theme") || "dark");

  useEffect(() => {
    const timer = setInterval(() => {
      setBtcPriceState(prev => Math.max(55000, prev + (Math.random() - 0.5) * 300));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "");
    localStorage.setItem("hashrial_theme", theme);
  }, [theme]);

  useEffect(() => {
    let timeout;
    const scheduleNext = () => {
      const minutes = Math.floor(Math.random() * 11) + 10;
      const ms = minutes * 10 * 60 * 1000;
      timeout = setTimeout(() => {
        setBlocksFound(prev => prev + 1);
        scheduleNext();
      }, ms);
    };
    scheduleNext();
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

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

    const particles = Array.from({ length: 50 }, () => ({
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
      minHeight: "100vh", background: "var(--bg)", color: "var(--text)",
      fontFamily: isRtl ? "'Vazirmatn','Tahoma',Arial,sans-serif" : "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      direction: isRtl ? "rtl" : "ltr", overflowX: "hidden",
    }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box}
        html{scroll-behavior:smooth}
        @keyframes float {
          0%,100%{transform:translateY(0)}
          50%{transform:translateY(-12px)}
        }
        @keyframes floatReverse {
          0%,100%{transform:translateY(0)}
          50%{transform:translateY(12px)}
        }
        @keyframes fadeUp {
          from{opacity:0;transform:translateY(24px)}
          to{opacity:1;transform:translateY(0)}
        }
        @keyframes gradientShift {
          0%{background-position:0% 50%}
          50%{background-position:100% 50%}
          100%{background-position:0% 50%}
        }
        @keyframes glowPulse {
          0%,100%{box-shadow:0 0 20px rgba(247,147,26,0.15),0 0 40px rgba(247,147,26,0.05)}
          50%{box-shadow:0 0 30px rgba(247,147,26,0.3),0 0 60px rgba(247,147,26,0.1)}
        }
        @keyframes marquee {
          0%{transform:translateX(0)}
          100%{transform:translateX(-50%)}
        }
        @keyframes shimmer {
          0%{background-position:-200% 0}
          100%{background-position:200% 0}
        }
        @keyframes rotateIn {
          from{opacity:0;transform:rotate(-3deg) scale(0.95)}
          to{opacity:1;transform:rotate(0) scale(1)}
        }
        @keyframes scalePulse {
          0%,100%{transform:scale(1)}
          50%{transform:scale(1.05)}
        }
        @keyframes pulse {
          0%,100%{opacity:1}
          50%{opacity:0.35}
        }
        .gradient-text{background:linear-gradient(135deg,#f7931a,#fbb450,#f7931a);background-size:300% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:gradientShift 4s ease-in-out infinite}
        .glow-pulse{animation:glowPulse 3s ease-in-out infinite}
        .card-hover{transition:all 0.4s cubic-bezier(0.22,1,0.36,1);cursor:default}
        .card-hover:hover{transform:translateY(-6px) scale(1.02);box-shadow:0 16px 48px rgba(247,147,26,0.12);border-color:rgba(247,147,26,0.25)!important}
        .marquee-track{display:flex;animation:marquee 40s linear infinite;width:fit-content}
        .marquee-track:hover{animation-play-state:paused}
        .glass{background:rgba(13,17,23,0.6);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px)}
        @media(max-width:768px){
          .mobile-hide{display:none!important}
          .mobile-show{display:flex!important}
        }
        @media(min-width:769px){
          .mobile-show{display:none!important}
        }
        ::-webkit-scrollbar{width:6px}
        ::-webkit-scrollbar-track{background:#06090e}
        ::-webkit-scrollbar-thumb{background:rgba(247,147,26,0.2);border-radius:3px}
        ::-webkit-scrollbar-thumb:hover{background:rgba(247,147,26,0.4)}

        [data-theme="light"] .glass{background:rgba(255,255,255,0.8)!important;border-color:var(--border)!important}
        [data-theme="light"] .ticker{background:linear-gradient(90deg,var(--bg2),var(--bg))!important}
        [data-theme="light"] .nav-header{background:rgba(246,248,250,0.95)!important;border-color:var(--border)!important}
        [data-theme="light"] .card-dark{background:linear-gradient(135deg,rgba(255,255,255,0.9),rgba(255,255,255,0.7))!important;border-color:var(--border)!important}
        [data-theme="light"] .card-dark h3,[data-theme="light"] .card-dark .feat-icon{color:var(--text)!important}
        [data-theme="light"] .card-dark p{color:var(--text2)!important}
        [data-theme="light"] .card-dark .num-badge{background:linear-gradient(135deg,rgba(247,147,26,0.15),rgba(247,147,26,0.05))!important;border-color:rgba(247,147,26,0.1)!important;color:#f7931a!important}
        [data-theme="light"] .faq-item{border-color:var(--border)!important;background:rgba(255,255,255,0.5)!important}
        [data-theme="light"] .features-section{background:var(--bg)!important}
        [data-theme="light"] .faq-item button span:first-child{color:var(--text)!important}
        [data-theme="light"] .faq-item .faq-answer{color:var(--text2)!important}
        [data-theme="light"] .fee-card{background:linear-gradient(135deg,rgba(255,255,255,0.9),rgba(255,255,255,0.7))!important;border-color:var(--border)!important}
        [data-theme="light"] .fee-card h3{color:var(--text)!important}
        [data-theme="light"] .fee-card p{color:var(--text2)!important}
        [data-theme="light"] .cta-box{background:linear-gradient(135deg,rgba(247,147,26,0.06),rgba(255,255,255,0.8))!important;border-color:var(--border)!important}
        [data-theme="light"] .cta-box h2{color:var(--text)!important}
        [data-theme="light"] .cta-box p{color:var(--text2)!important}
        [data-theme="light"] .footer-section{background:linear-gradient(180deg,var(--bg2),var(--bg))!important;border-color:var(--border)!important}
        [data-theme="light"] .footer-section p{color:var(--text2)!important}
        [data-theme="light"] .section-title{color:var(--text)!important}
        [data-theme="light"] .section-sub{color:var(--text2)!important}
        [data-theme="light"] .hero-sub{color:var(--text2)!important}
        [data-theme="light"] .stat-label{color:var(--text2)!important}
        [data-theme="light"] .hw-card{background:rgba(255,255,255,0.5)!important;border-color:var(--border)!important}
        [data-theme="light"] .hw-card .hw-name{color:var(--text)!important}
        [data-theme="light"] .mobile-menu-overlay{background:rgba(246,248,250,0.98)!important}
        [data-theme="light"] .mobile-menu-overlay a{color:var(--text)!important}
        [data-theme="light"] .scrolled-header{background:rgba(246,248,250,0.95)!important;border-color:var(--border)!important}
        [data-theme="light"] .btc-live{color:var(--text)!important}
        [data-theme="light"] ::-webkit-scrollbar-track{background:var(--bg)!important}
      `}</style>

      {/* Price Ticker */}
      <div className="ticker" style={{
        height: 36, background: "linear-gradient(90deg,#0a0e14,#0f141e)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        display: "flex", alignItems: "center", overflow: "hidden",
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 101,
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
        height: 56,
        background: scrolled ? "rgba(6,9,14,0.95)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
        position: "fixed", top: 36, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 28px", transition: "all 0.3s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: "linear-gradient(135deg,#f7931a,#e8830d)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 15, color: "#000",
              boxShadow: "0 2px 8px rgba(247,147,26,0.3)",
            }}>H</div>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.3px" }}>Hashrial</span>
          </Link>
          <nav className="mobile-hide" style={{ display: "flex", gap: 2 }}>
            {[
              { href: "#features", label: t.navFeatures },
              { href: "#mining", label: t.navMining },
              { href: "#faq", label: t.navFaq },
            ].map((item, i) => (
              <a key={i} href={item.href} style={navLinkClass(item.href)}
                onMouseEnter={e => { e.target.style.color = "#e6edf3"; e.target.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { e.target.style.color = "#8b949e"; e.target.style.background = "transparent"; }}
              >{item.label}</a>
            ))}
          </nav>
        </div>
        <div className="mobile-hide" style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {/* Language selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 2, marginRight: 4 }}>
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => setLang(l.code)} title={l.label} style={{
                background: lang === l.code ? "rgba(247,147,26,0.12)" : "transparent",
                border: lang === l.code ? "1px solid rgba(247,147,26,0.2)" : "1px solid transparent",
                cursor: "pointer", padding: "4px 6px", borderRadius: 6, fontSize: 15, lineHeight: 1,
                transition: "all 0.2s",
              }}
                onMouseEnter={e => { e.target.style.background = "rgba(255,255,255,0.06)"; }}
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
            onMouseEnter={e => { e.target.style.color = "#e6edf3"; e.target.style.background = "rgba(255,255,255,0.06)"; }}
            onMouseLeave={e => { e.target.style.color = "#8b949e"; e.target.style.background = "transparent"; }}
          >{theme === "dark" ? "☀️" : "🌙"}</button>

          <Link to="/login" style={{
            padding: "8px 18px", fontSize: "13px", fontWeight: 500, color: "var(--text)",
            textDecoration: "none", borderRadius: 8, transition: "all 0.2s",
          }}
            onMouseEnter={e => { e.target.style.background = "rgba(255,255,255,0.06)"; }}
            onMouseLeave={e => { e.target.style.background = "transparent"; }}
          >{t.login}</Link>
          <Link to="/register" style={{
            padding: "8px 18px", fontSize: "13px", fontWeight: 600, color: "#000",
            background: "linear-gradient(135deg,#f7931a,#e8830d)", textDecoration: "none",
            borderRadius: 8, transition: "all 0.2s",
          }}
            onMouseEnter={e => { e.target.style.opacity = "0.9"; e.target.style.transform = "scale(1.03)"; }}
            onMouseLeave={e => { e.target.style.opacity = "1"; e.target.style.transform = "scale(1)"; }}
          >{t.signUp}</Link>
        </div>

        {/* Mobile hamburger */}
        <button className="mobile-show" onClick={() => setMobileMenu(!mobileMenu)} style={{
          background: "none", border: "none", color: "var(--text)", cursor: "pointer", padding: 4,
        }}>
          <div style={{ width: 20, height: 2, background: "#e6edf3", marginBottom: 4, borderRadius: 1 }} />
          <div style={{ width: 20, height: 2, background: "#e6edf3", marginBottom: 4, borderRadius: 1 }} />
          <div style={{ width: 20, height: 2, background: "#e6edf3", borderRadius: 1 }} />
        </button>
      </header>

      {/* Mobile menu */}
      {mobileMenu && (
        <div className="mobile-menu-overlay" style={{
          position: "fixed", inset: 0, zIndex: 99,
          background: "rgba(6,9,14,0.98)", paddingTop: 100, display: "flex", flexDirection: "column",
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
          <div style={{ height: 1, width: 40, background: "rgba(255,255,255,0.1)", margin: "8px 0" }} />
          <Link to="/login" onClick={() => setMobileMenu(false)}
            style={{ fontSize: "18px", fontWeight: 500, color: "var(--text)", textDecoration: "none" }}>{t.login}</Link>
          <Link to="/register" onClick={() => setMobileMenu(false)}
            style={{ fontSize: "18px", fontWeight: 700, color: "#f7931a", textDecoration: "none" }}>{t.signUp}</Link>
        </div>
      )}

      {/* ═══════ HERO ═══════ */}
      <section ref={heroRef} style={{
        position: "relative", minHeight: "90vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "120px 28px 80px", overflow: "hidden",
      }}>
        {/* Particles canvas */}
        <canvas ref={particlesRef} style={{
          position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none",
        }} />

        {/* Gradient overlays */}
        <div style={{
          position: "absolute", top: "-30%", left: "50%", transform: "translateX(-50%)",
          width: "80%", paddingBottom: "80%",
          background: "radial-gradient(circle at center, rgba(247,147,26,0.06) 0%, transparent 60%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: "-10%", right: "-10%",
          width: "40%", paddingBottom: "40%",
          background: "radial-gradient(circle, rgba(247,147,26,0.03), transparent)",
          pointerEvents: "none", borderRadius: "50%",
        }} />

        <div style={{
          position: "relative", zIndex: 1, textAlign: "center", maxWidth: 700,
        }}>
          <Reveal delay={0}>
            <div style={{
              display: "inline-block", marginBottom: 24,
              padding: "6px 16px", fontSize: 11, fontWeight: 600, color: "#f7931a",
              letterSpacing: "2px", textTransform: "uppercase",
              border: "1px solid rgba(247,147,26,0.15)", borderRadius: 100,
              background: "rgba(247,147,26,0.06)",
            }}>
              {t.poolFee}
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <h1 style={{
              fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 900, lineHeight: 1.1,
              letterSpacing: "-2px", marginBottom: 8,
            }}>
              {t.heroTitle1}
            </h1>
            <h1 style={{
              fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 900, lineHeight: 1.1,
              letterSpacing: "-2px", marginBottom: 24,
            }}>
              <span className="gradient-text">{t.heroTitle2}</span>
            </h1>
          </Reveal>

          <Reveal delay={0.2}>
            <p style={{
              fontSize: "clamp(14px, 1.3vw, 16px)", color: "var(--text2)",
              lineHeight: 1.8, maxWidth: 520, margin: "0 auto 36px",
            }}>
              {t.heroSub}
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => navigate("/register")} className="glow-pulse" style={{
                padding: "16px 40px",
                background: "linear-gradient(135deg,#f7931a,#e8830d)",
                color: "#000", border: "none", borderRadius: 12,
                fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.3s cubic-bezier(0.22,1,0.36,1)",
              }}
                onMouseEnter={e => { e.target.style.transform = "translateY(-2px) scale(1.03)"; e.target.style.boxShadow = "0 12px 36px rgba(247,147,26,0.35)"; }}
                onMouseLeave={e => { e.target.style.transform = "translateY(0) scale(1)"; e.target.style.boxShadow = "none"; }}
              >
                {t.heroCta} →
              </button>
              <a href="#mining" style={{
                padding: "16px 32px", color: "var(--text)", textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12,
                fontSize: 16, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.3s",
              }}
                onMouseEnter={e => { e.target.style.borderColor = "rgba(247,147,26,0.3)"; e.target.style.background = "rgba(247,147,26,0.04)"; }}
                onMouseLeave={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.background = "transparent"; }}
              >{t.navMining}</a>
            </div>
          </Reveal>

          {/* Live BTC Price */}
          <Reveal delay={0.35}>
            <div className="btc-live" style={{
              marginTop: 28, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontSize: 12, color: "var(--text2)",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3fb950", display: "inline-block", animation: "pulse 2s ease-in-out infinite" }} />
              <span>BTC</span>
              <span style={{ color: "var(--text)", fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>
                ${btcPriceState.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span style={{ color: btcPriceState >= 62000 ? "#3fb950" : "#f85149", fontSize: 11 }}>
                {btcPriceState >= 62000 ? "▲" : "▼"} Live
              </span>
            </div>
          </Reveal>

          {/* Hero stats */}
          <Reveal delay={0.4}>
            <div style={{
              display: "flex", justifyContent: "center", gap: "clamp(24px, 5vw, 60px)",
              marginTop: 60, flexWrap: "wrap", alignItems: "center",
            }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 800, color: "#f7931a", letterSpacing: "-0.5px" }}>
                  {statsLoading ? <AnimatedCounter target={5483} /> : <AnimatedCounter target={poolStats?.activeWorkers || 5483} />}
                </div>
                <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 6, textTransform: "uppercase", letterSpacing: "1px" }}>{t.heroStat1}</div>
                <div style={{ marginTop: 8, display: "flex", justifyContent: "center" }}>
                  <LiveHashrateGraph />
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 800, color: "#f7931a", letterSpacing: "-0.5px" }}>
                  {statsLoading ? "732" : (poolStats?.poolHashrate ? `${(poolStats.poolHashrate).toLocaleString()} TH/s` : "732")} <span style={{ fontSize: "clamp(12px, 1.5vw, 14px)", fontWeight: 500 }}>PH/s</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 6, textTransform: "uppercase", letterSpacing: "1px" }}>{t.heroStat2}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 800, color: "#f7931a", letterSpacing: "-0.5px" }}>
                  <AnimatedCounter target={blocksFound} />
                </div>
                <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 6, textTransform: "uppercase", letterSpacing: "1px" }}>{t.heroStat3}</div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section className="how-section" id="mining" style={{ padding: "80px 28px" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 style={{ fontSize: "clamp(26px, 3.5vw, 36px)", fontWeight: 800, letterSpacing: "-1px", marginBottom: 12 }}>
              {t.howTitle}
            </h2>
            <p style={{ fontSize: 14, color: "var(--text2)", maxWidth: 460, margin: "0 auto" }}>{t.howSub}</p>
          </div>
        </Reveal>
        <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap", maxWidth: 900, margin: "0 auto" }}>
          {[
            { num: "01", title: t.howStep1, desc: t.howStep1Desc },
            { num: "02", title: t.howStep2, desc: t.howStep2Desc },
            { num: "03", title: t.howStep3, desc: t.howStep3Desc },
          ].map((step, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <div className="card-hover card-dark" style={{
                flex: "1 1 240px", maxWidth: 280,
                border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16,
                padding: "32px 28px", background: "linear-gradient(135deg, rgba(13,17,23,0.6), rgba(13,17,23,0.3))",
                textAlign: "center",
              }}>
                <div className="num-badge" style={{
                  width: 48, height: 48, borderRadius: 14, margin: "0 auto 20px",
                  background: "linear-gradient(135deg, rgba(247,147,26,0.15), rgba(247,147,26,0.05))",
                  border: "1px solid rgba(247,147,26,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, fontWeight: 700, color: "#f7931a",
                }}>{step.num}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>{step.title}</h3>
                <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7 }}>{step.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══════ FEATURES ═══════ */}
      <section className="features-section" id="features" style={{ padding: "80px 28px", background: "linear-gradient(180deg, #06090e, #080b12)" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <h2 style={{ fontSize: "clamp(26px, 3.5vw, 36px)", fontWeight: 800, letterSpacing: "-1px", marginBottom: 12 }}>
              {t.featuresTitle}
            </h2>
            <p style={{ fontSize: 14, color: "var(--text2)", maxWidth: 480, margin: "0 auto" }}>{t.featuresSub}</p>
          </div>
        </Reveal>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap", maxWidth: 920, margin: "0 auto" }}>
          {features.map((feat, i) => (
            <Reveal key={i} delay={i * 0.06}>
              <div className="card-hover card-dark" style={{
                flex: "1 1 240px", maxWidth: 280,
                border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16,
                padding: "28px 24px",
                background: "linear-gradient(135deg, rgba(13,17,23,0.5), rgba(13,17,23,0.2))",
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: `linear-gradient(135deg, ${feat.color}22, ${feat.color}08)`,
                  border: `1px solid ${feat.color}22`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 17, fontWeight: 700, color: feat.color, marginBottom: 16,
                }}>{feat.icon}</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.2px" }}>
                  {t[feat.titleKey]}
                </h3>
                <p style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.7 }}>{t[feat.descKey]}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══════ FEE BREAKDOWN ═══════ */}
      <section style={{ padding: "60px 28px 80px", maxWidth: 800, margin: "0 auto" }}>
        <Reveal>
          <div className="card-dark fee-card" style={{
            border: "1px solid rgba(255,255,255,0.05)", borderRadius: 20,
            padding: "40px 36px",
            background: "linear-gradient(135deg, rgba(13,17,23,0.5), rgba(13,17,23,0.2))",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 40,
            flexWrap: "wrap",
          }}>
            <div style={{ textAlign: "center" }}>
              <DonutChart percentage={98} size={120} strokeWidth={10} color="#f7931a" />
              <div style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: "#f7931a" }}>98% To You</div>
            </div>
            <div style={{ flex: "1 1 200px", maxWidth: 320 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, letterSpacing: "-0.5px" }}>
                {t.feat1}
              </h3>
              <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8 }}>
                {t.feat1Desc}
              </p>
              <div style={{ marginTop: 16, display: "flex", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#f7931a" }}>98%</div>
                  <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 2 }}>Your Hashrate</div>
                </div>
                <div style={{ width: 1, background: "rgba(255,255,255,0.06)" }} />
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text2)" }}>2%</div>
                  <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 2 }}>Pool Fee</div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ═══════ HARDWARE ═══════ */}
      <section className="hardware-section" id="hardware" style={{ padding: "80px 28px" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: "clamp(26px, 3.5vw, 36px)", fontWeight: 800, letterSpacing: "-1px", marginBottom: 12 }}>
              {t.hardwareTitle}
            </h2>
            <p style={{ fontSize: 14, color: "var(--text2)", maxWidth: 480, margin: "0 auto" }}>{t.hardwareSub}</p>
          </div>
        </Reveal>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", maxWidth: 800, margin: "0 auto" }}>
          {hardwareBrands.map((h, i) => (
            <Reveal key={i} delay={i * 0.04}>
              <div className="card-hover hw-card" style={{
                padding: "20px 24px",
                border: "1px solid rgba(255,255,255,0.04)", borderRadius: 12,
                background: "linear-gradient(135deg, rgba(13,17,23,0.4), rgba(13,17,23,0.1))",
                textAlign: "center", minWidth: 120,
              }}>
                <div style={{ fontSize: 18, marginBottom: 8, opacity: 0.6 }}>{h.icon}</div>
                <div className="hw-name" style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{h.name}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══════ FAQ ═══════ */}
      <section className="faq-section" id="faq" style={{ padding: "80px 28px", maxWidth: 640, margin: "0 auto" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontSize: "clamp(26px, 3.5vw, 36px)", fontWeight: 800, letterSpacing: "-1px" }}>
              {t.faqTitle}
            </h2>
          </div>
        </Reveal>
        {faqData.map((item, i) => (
          <Reveal key={i} delay={i * 0.04}>
            <FAQItem
              q={t[item.q]}
              a={t[item.a]}
              isOpen={openFaq === i}
              onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
              isRtl={isRtl}
            />
          </Reveal>
        ))}
      </section>

      {/* ═══════ CTA ═══════ */}
      <section className="cta-section" style={{ padding: "60px 28px 100px", maxWidth: 700, margin: "0 auto" }}>
        <Reveal>
          <div className="card-dark cta-box" style={{
            border: "1px solid rgba(247,147,26,0.1)", borderRadius: 28,
            padding: "56px 40px", textAlign: "center",
            background: "linear-gradient(135deg, rgba(247,147,26,0.06), rgba(247,147,26,0.01), rgba(13,17,23,0.6))",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: "-40%", left: "50%", transform: "translateX(-50%)",
              width: 500, height: 500,
              background: "radial-gradient(circle at center, rgba(247,147,26,0.08) 0%, transparent 60%)",
              pointerEvents: "none",
            }} />
            <div style={{ fontSize: 48, marginBottom: 16, position: "relative", animation: "float 5s ease-in-out infinite" }}>₿</div>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, position: "relative", letterSpacing: "-0.8px" }}>{t.ctaTitle}</h2>
            <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.8, maxWidth: 480, margin: "0 auto 32px", position: "relative" }}>
              {t.ctaDesc}
            </p>
            <button onClick={() => navigate("/register")} className="glow-pulse" style={{
              padding: "16px 40px",
              background: "linear-gradient(135deg,#f7931a,#e8830d)",
              color: "#000", border: "none", borderRadius: 14,
              fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.3s cubic-bezier(0.22,1,0.36,1)",
            }}
              onMouseEnter={e => { e.target.style.transform = "translateY(-2px) scale(1.02)"; e.target.style.boxShadow = "0 8px 30px rgba(247,147,26,0.35)"; }}
              onMouseLeave={e => { e.target.style.transform = "translateY(0) scale(1)"; e.target.style.boxShadow = "none"; }}
            >
              {t.ctaBtn} →
            </button>
          </div>
        </Reveal>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="footer-section" style={{
        borderTop: "1px solid rgba(255,255,255,0.04)",
        padding: "56px 28px 32px",
        background: "linear-gradient(180deg, #06090e, #080b12)",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 40, marginBottom: 40 }}>
            <div style={{ maxWidth: 320 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: "linear-gradient(135deg,#f7931a,#e8830d)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 15, color: "#000",
                  boxShadow: "0 2px 8px rgba(247,147,26,0.2)",
                }}>H</div>
                <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.3px" }}>Hashrial</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.8 }}>{t.footerText}</p>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", marginBottom: 16, textTransform: "uppercase", letterSpacing: "1px", opacity: 0.6 }}>{t.quickLinks}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[t.navHome, t.navFeatures, "Hardware", t.navFaq].map((link, i) => (
                  <a key={i} href={i === 0 ? "#" : `#${i === 1 ? "features" : i === 2 ? "hardware" : "faq"}`} style={{
                    fontSize: 13, color: "var(--text2)", textDecoration: "none", transition: "all 0.2s",
                  }}
                    onMouseEnter={e => { e.target.style.color = "#f7931a"; e.target.style.paddingLeft = "4px"; }}
                    onMouseLeave={e => { e.target.style.color = "#8b949e"; e.target.style.paddingLeft = "0"; }}
                  >{link}</a>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", marginBottom: 16, textTransform: "uppercase", letterSpacing: "1px", opacity: 0.6 }}>{t.account}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Link to="/login" style={{ fontSize: 13, color: "var(--text2)", textDecoration: "none", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.target.style.color = "#f7931a"; e.target.style.paddingLeft = "4px"; }}
                  onMouseLeave={e => { e.target.style.color = "#8b949e"; e.target.style.paddingLeft = "0"; }}
                >{t.signIn}</Link>
                <Link to="/register" style={{ fontSize: 13, color: "var(--text2)", textDecoration: "none", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.target.style.color = "#f7931a"; e.target.style.paddingLeft = "4px"; }}
                  onMouseLeave={e => { e.target.style.color = "#8b949e"; e.target.style.paddingLeft = "0"; }}
                >{t.createAccount}</Link>
                <Link to="/dashboard" style={{ fontSize: 13, color: "var(--text2)", textDecoration: "none", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.target.style.color = "#f7931a"; e.target.style.paddingLeft = "4px"; }}
                  onMouseLeave={e => { e.target.style.color = "#8b949e"; e.target.style.paddingLeft = "0"; }}
                >Dashboard</Link>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", marginBottom: 16, textTransform: "uppercase", letterSpacing: "1px", opacity: 0.6 }}>{t.language}</div>
              <select value={lang} onChange={(e) => setLang(e.target.value)} style={{
                padding: "8px 14px", borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)", color: "var(--text)", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                outline: "none", minWidth: 140,
              }}>
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{
            borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 20,
            display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
            fontSize: 12, color: "#484f58",
          }}>
            <span>© {new Date().getFullYear()} Hashrial. {t.allRights}</span>
            <div style={{ display: "flex", gap: 20 }}>
              <span style={{ cursor: "pointer", transition: "color 0.2s" }}
                onMouseEnter={e => e.target.style.color = "#8b949e"}
                onMouseLeave={e => e.target.style.color = "#484f58"}>{t.terms}</span>
              <span style={{ cursor: "pointer", transition: "color 0.2s" }}
                onMouseEnter={e => e.target.style.color = "#8b949e"}
                onMouseLeave={e => e.target.style.color = "#484f58"}>{t.privacy}</span>
              <span style={{ cursor: "pointer", transition: "color 0.2s" }}
                onMouseEnter={e => e.target.style.color = "#8b949e"}
                onMouseLeave={e => e.target.style.color = "#484f58"}>{t.contact}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
