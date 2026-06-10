import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

const LANGUAGES = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "fa", label: "فارسی", dir: "rtl" },
  { code: "zh", label: "中文", dir: "ltr" },
  { code: "ru", label: "Русский", dir: "ltr" },
  { code: "es", label: "Español", dir: "ltr" },
  { code: "pt", label: "Português", dir: "ltr" },
];

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
    subtitle: "High-performance stratum proxy with a transparent 2% fee model. 98% of your hashrate goes directly to your own Antpool sub-account.",
    heroDesc1: "High-performance stratum proxy",
    heroDesc2: "98% Hashrate To You",
    heroDesc3: "2% Transparent Fee",
    heroDesc4: "Real-time Dashboard",
    learnMore: "Learn More",
    totalUsers: "Total Users",
    currentlyMining: "Currently Mining",
    perShareRouted: "Per Share Routed",
    registered: "Registered",
    gettingStarted: "Getting Started",
    threeSteps: "Three simple steps to start mining Bitcoin with Hashrial",
    liveData: "Live Data",
    whyUsTag: "Why Us",
    builtFor: "Built for serious miners who demand transparency, performance, and reliability",
    compatibility: "Compatibility",
    compatibilityDesc: "Hashrial supports every major ASIC miner and mining software. Configure once and mine forever.",
    testimonialsTag: "Testimonials",
    configTitle: "Stratum Configurator",
    support: "Support",
    quickLinks: "Quick Links",
    account: "Account",
    signIn: "Sign In",
    createAccountFooter: "Create Account",
    language: "Language",
    allRightsReserved: "All rights reserved.",
    terms: "Terms",
    privacy: "Privacy",
    contact: "Contact",
    networkHashrate: "Network Hashrate",
    poolUsers: "Pool Users",
    poolFeeLabel: "Pool Fee",
    industryStandard: "Industry standard — same as F2Pool, ViaBTC",
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
    subtitle: "پراکسی استراتوم با کارایی بالا با مدل کارمزد شفاف ۲٪. ۹۸٪ از هش‌ریت شما مستقیماً به حساب شخصی شما در آنت‌پول واریز می‌شود.",
    heroDesc1: "پراکسی استراتوم با کارایی بالا",
    heroDesc2: "۹۸٪ هش‌ریت برای شما",
    heroDesc3: "کارمزد شفاف ۲٪",
    heroDesc4: "داشبورد زنده",
    learnMore: "بیشتر بدانید",
    totalUsers: "کاربران کل",
    currentlyMining: "در حال ماینینگ",
    perShareRouted: "به ازای هر سهم",
    registered: "ثبت‌نام شده",
    gettingStarted: "شروع کنید",
    threeSteps: "سه مرحله ساده برای شروع ماینینگ بیت‌کوین با Hashrial",
    liveData: "داده‌های زنده",
    whyUsTag: "چرا ما",
    builtFor: "طراحی شده برای ماینرهای حرفه‌ای که شفافیت، عملکرد و قابلیت اطمینان می‌خواهند",
    compatibility: "سازگاری",
    compatibilityDesc: "Hashrial از تمام ماینرهای ASIC و نرم‌افزارهای ماینینگ پشتیبانی می‌کند.",
    testimonialsTag: "نظرات",
    configTitle: "تنظیمات Stratum",
    support: "پشتیبانی",
    quickLinks: "لینک‌های سریع",
    account: "حساب",
    signIn: "ورود",
    createAccountFooter: "ایجاد حساب",
    language: "زبان",
    allRightsReserved: "تمام حقوق محفوظ است.",
    terms: "شرایط",
    privacy: "حریم خصوصی",
    contact: "تماس",
    networkHashrate: "هش‌ریت شبکه",
    poolUsers: "کاربران استخر",
    poolFeeLabel: "کارمزد استخر",
    industryStandard: "استاندارد صنعت — مشابه F2Pool، ViaBTC",
  },
  zh: {
    startMining: "开始挖矿",
    memberArea: "会员专区",
    configDesc: "输入您的 Hashrial 用户名以生成个性化的 ASIC 配置。",
    usernameLabel: "您的用户名",
    stratumUrl: "Stratum 地址",
    stratumUser: "矿工用户名",
    stratumPass: "密码",
    copy: "复制",
    copied: "已复制！",
    footerText: "Hashrial 矿池。完全去中心化的 Stratum 代理，直接集成 Antpool。",
    home: "首页",
    features: "特点",
    faqLink: "常见问题",
    login: "登录",
    signUp: "注册",
    heroTag: "比特币矿池",
    activeMiners: "活跃矿工",
    btcPrice: "比特币价格",
    feeText: "矿池费率",
    connecting: "连接中...",
    whyUs: "为什么选择 Hashrial？",
    whyUs1: "每第50个份额用于基础设施。您保留98%的算力。无隐藏费用。",
    whyUs2: "专为规模而设计 — 处理数千个并发 Stratum 连接，亚毫秒级延迟。",
    whyUs3: "实时图表、矿工监控、收益历史、支付管理和即时通知。",
    whyUs4: "直接集成 Antpool API，实现准确的余额和算力跟踪。",
    whyUs5: "多语言支持 — 英语、波斯语、中文、俄语、西班牙语等。",
    whyUs6: "企业级安全 — JWT 认证、速率限制、CORS 保护、SQL 注入防护。",
    howItWorks: "工作原理",
    howStep1: "创建账户",
    howStep1Desc: "用您的邮箱注册并选择用户名。您的用户名就是您的矿池身份。",
    howStep2: "配置矿机",
    howStep2Desc: "将您的 ASIC 或挖矿软件指向 stratum+tcp://hashrial.com:3333。",
    howStep3: "开始赚取",
    howStep3Desc: "在仪表板上实时查看算力和收益更新。随时请求付款。",
    networkStats: "网络统计",
    globalHashrate: "比特币网络算力",
    btcPriceLabel: "BTC/USD 价格",
    poolWorkers: "矿池矿工",
    poolFee: "矿池费率",
    supportedHardware: "支持的硬件",
    hwTitle: "兼容所有主要 ASIC",
    hwDesc: "Hashrial 支持所有主要 ASIC 矿机和挖矿软件。一次配置，永久挖矿。",
    antminer: "Antminer",
    antminerDesc: "Bitmain Antminer S19、S21、S19 Pro、T21 及所有运行 v2024+ 固件的型号",
    whatsminer: "Whatsminer",
    whatsminerDesc: "MicroBT Whatsminer M50、M60、M66、M30S 及所有型号",
    avalon: "Avalon",
    avalonDesc: "Canaan Avalon A12、A13、A15、A1566 — 所有代次",
    cpuGpu: "CPU / GPU",
    cpuGpuDesc: "CGMiner、BFGMiner、Awesome Miner、NiceHash 及任何兼容 Stratum 的软件",
    testimonials: "矿工评价",
    testimonial1: "直接从 Antpool 切换过来。Hashrial 的透明性无与伦比。",
    testimonial2: "连续挖矿6个月零停机。仪表板整洁，付款准时。",
    testimonial3: "API 非常稳定。构建了一个实时跟踪每个矿工的自定义监控仪表板。",
    testimonial4: "在 Hashrial 上运行 12 台 ASIC 已 3 个月。设置只需 5 分钟。",
    faq: "常见问题",
    ctaTitle: "准备好开始挖矿了吗？",
    ctaDesc: "加入数百名矿工，通过 Hashrial 透明的 2% 费率模式赚取比特币。",
    createAccount: "创建免费账户",
    subtitle: "高性能 Stratum 代理，透明的 2% 费率模式。98% 的算力直接进入您自己的 Antpool 子账户。",
    heroDesc1: "高性能 Stratum 代理",
    heroDesc2: "98% 算力归您",
    heroDesc3: "2% 透明费率",
    heroDesc4: "实时仪表板",
    learnMore: "了解更多",
    totalUsers: "总用户",
    currentlyMining: "正在挖矿",
    perShareRouted: "每份额路由",
    registered: "已注册",
    gettingStarted: "开始使用",
    threeSteps: "三个简单步骤开始使用 Hashrial 挖比特币",
    liveData: "实时数据",
    whyUsTag: "为什么选择我们",
    builtFor: "为追求透明度、性能和可靠性的专业矿工打造",
    compatibility: "兼容性",
    compatibilityDesc: "Hashrial 支持所有主要 ASIC 矿机和挖矿软件。一次配置，永久挖矿。",
    testimonialsTag: "评价",
    configTitle: "Stratum 配置器",
    support: "支持",
    quickLinks: "快速链接",
    account: "账户",
    signIn: "登录",
    createAccountFooter: "创建账户",
    language: "语言",
    allRightsReserved: "版权所有。",
    terms: "条款",
    privacy: "隐私",
    contact: "联系",
    networkHashrate: "网络算力",
    poolUsers: "矿池用户",
    poolFeeLabel: "矿池费率",
    industryStandard: "行业标准 — 与 F2Pool、ViaBTC 相同",
  },
  ru: {
    startMining: "Начать майнинг",
    memberArea: "Личный кабинет",
    configDesc: "Введите имя пользователя Hashrial для генерации конфигурации ASIC.",
    usernameLabel: "Ваше имя пользователя",
    stratumUrl: "URL Stratum",
    stratumUser: "Имя майнера",
    stratumPass: "Пароль",
    copy: "Копировать",
    copied: "Скопировано!",
    footerText: "Майнинг-пул Hashrial. Полностью децентрализованный Stratum-прокси с прямой интеграцией Antpool.",
    home: "Главная",
    features: "Возможности",
    faqLink: "FAQ",
    login: "Войти",
    signUp: "Регистрация",
    heroTag: "БИТКОИН МАЙНИНГ ПУЛ",
    activeMiners: "Активные майнеры",
    btcPrice: "Цена Биткоина",
    feeText: "Комиссия пула",
    connecting: "Подключение...",
    whyUs: "Почему Hashrial?",
    whyUs1: "Каждая 50-я доля направляется на инфраструктуру. Вы сохраняете 98% хешрейта. Без скрытых комиссий.",
    whyUs2: "Создан для масштаба — тысячи одновременных Stratum-соединений с субмиллисекундной задержкой.",
    whyUs3: "Реальные графики, мониторинг майнеров, история доходов и мгновенные уведомления.",
    whyUs4: "Прямая интеграция с Antpool API для точного отслеживания баланса и хешрейта.",
    whyUs5: "Многоязычная поддержка — английский, персидский, китайский, русский, испанский и другие.",
    whyUs6: "Безопасность корпоративного уровня — JWT, ограничение запросов, CORS, защита от SQL-инъекций.",
    howItWorks: "Как это работает",
    howStep1: "Создать аккаунт",
    howStep1Desc: "Зарегистрируйтесь с email и выберите имя пользователя. Это ваша идентичность в пуле.",
    howStep2: "Настроить майнеры",
    howStep2Desc: "Направьте ваши ASIC на stratum+tcp://hashrial.com:3333, используя ваше имя пользователя.",
    howStep3: "Начать зарабатывать",
    howStep3Desc: "Наблюдайте за хешрейтом и доходом в реальном времени. Запрашивайте выплаты в любое время.",
    networkStats: "Статистика сети",
    globalHashrate: "Хешрейт сети Биткоин",
    btcPriceLabel: "Цена BTC/USD",
    poolWorkers: "Майнеры пула",
    poolFee: "Комиссия пула",
    supportedHardware: "Поддерживаемое оборудование",
    hwTitle: "Совместимость со всеми основными ASIC",
    hwDesc: "Hashrial поддерживает все основные ASIC-майнеры и программное обеспечение для майнинга.",
    antminer: "Antminer",
    antminerDesc: "Bitmain Antminer S19, S21, S19 Pro, T21 и все модели с прошивкой v2024+",
    whatsminer: "Whatsminer",
    whatsminerDesc: "MicroBT Whatsminer M50, M60, M66, M30S и все модели",
    avalon: "Avalon",
    avalonDesc: "Canaan Avalon A12, A13, A15, A1566 — все поколения",
    cpuGpu: "CPU / GPU",
    cpuGpuDesc: "CGMiner, BFGMiner, Awesome Miner, NiceHash и любое Stratum-совместимое ПО",
    testimonials: "Отзывы майнеров",
    testimonial1: "Перешел напрямую с Antpool. Прозрачность Hashrial непревзойденна.",
    testimonial2: "Майню 6 месяцев без простоев. Дашборд отличный, выплаты всегда вовремя.",
    testimonial3: "API очень надежный. Построил собственную панель мониторинга для 30+ майнеров.",
    testimonial4: "12 ASIC на Hashrial уже 3 месяца. Настройка заняла 5 минут.",
    faq: "Часто задаваемые вопросы",
    ctaTitle: "Готовы начать майнинг?",
    ctaDesc: "Присоединяйтесь к сотням майнеров, зарабатывающих Биткоин с прозрачной комиссией 2%.",
    createAccount: "Создать аккаунт",
    subtitle: "Высокопроизводительный Stratum-прокси с прозрачной комиссией 2%. 98% вашего хешрейта идет напрямую в ваш субаккаунт Antpool.",
    heroDesc1: "Высокопроизводительный Stratum-прокси",
    heroDesc2: "98% Хешрейта Вам",
    heroDesc3: "Прозрачная комиссия 2%",
    heroDesc4: "Дашборд в реальном времени",
    learnMore: "Узнать больше",
    totalUsers: "Всего пользователей",
    currentlyMining: "Сейчас майнят",
    perShareRouted: "За каждую долю",
    registered: "Зарегистрировано",
    gettingStarted: "Начало работы",
    threeSteps: "Три простых шага для начала майнинга Биткоина с Hashrial",
    liveData: "Живые данные",
    whyUsTag: "Почему мы",
    builtFor: "Создан для серьезных майнеров, требующих прозрачности, производительности и надежности",
    compatibility: "Совместимость",
    compatibilityDesc: "Hashrial поддерживает все основные ASIC-майнеры и ПО для майнинга.",
    testimonialsTag: "Отзывы",
    configTitle: "Конфигуратор Stratum",
    support: "Поддержка",
    quickLinks: "Быстрые ссылки",
    account: "Аккаунт",
    signIn: "Войти",
    createAccountFooter: "Создать аккаунт",
    language: "Язык",
    allRightsReserved: "Все права защищены.",
    terms: "Условия",
    privacy: "Конфиденциальность",
    contact: "Контакты",
    networkHashrate: "Хешрейт сети",
    poolUsers: "Пользователи пула",
    poolFeeLabel: "Комиссия пула",
    industryStandard: "Отраслевой стандарт — как F2Pool, ViaBTC",
  },
  es: {
    startMining: "Empezar a Minar",
    memberArea: "Área de Miembros",
    configDesc: "Ingrese su nombre de usuario de Hashrial para generar su configuración ASIC personalizada.",
    usernameLabel: "Su Usuario",
    stratumUrl: "URL Stratum",
    stratumUser: "Usuario Minero",
    stratumPass: "Contraseña",
    copy: "Copiar",
    copied: "¡Copiado!",
    footerText: "Hashrial Mining Pool. Proxy Stratum completamente descentralizado con integración directa a Antpool.",
    home: "Inicio",
    features: "Características",
    faqLink: "FAQ",
    login: "Iniciar Sesión",
    signUp: "Registrarse",
    heroTag: "POOL DE MINERÍA BITCOIN",
    activeMiners: "Mineros Activos",
    btcPrice: "Precio Bitcoin",
    feeText: "Comisión del Pool",
    connecting: "Conectando...",
    whyUs: "¿Por qué minar con Hashrial?",
    whyUs1: "Cada 50ª acción se destina a infraestructura. Usted conserva el 98% del hashrate. Sin comisiones ocultas.",
    whyUs2: "Construido para escalar — maneja miles de conexiones Stratum simultáneas con latencia de submilisegundos.",
    whyUs3: "Gráficos en tiempo real, monitoreo de mineros, historial de ganancias y notificaciones instantáneas.",
    whyUs4: "Integración directa con la API de Antpool para seguimiento preciso del saldo y hashrate.",
    whyUs5: "Soporte multilingüe — inglés, persa, chino, ruso, español y más.",
    whyUs6: "Seguridad de nivel empresarial — JWT, límite de velocidad, protección CORS, prevención de SQL injection.",
    howItWorks: "Cómo Funciona",
    howStep1: "Crear Cuenta",
    howStep1Desc: "Regístrese con su email y elija un nombre de usuario. Su usuario es su identidad en el pool.",
    howStep2: "Configurar Mineros",
    howStep2Desc: "Apunte sus ASICs a stratum+tcp://hashrial.com:3333 usando su nombre de usuario.",
    howStep3: "Empezar a Ganar",
    howStep3Desc: "Vea su hashrate y ganancias actualizarse en tiempo real. Solicite pagos en cualquier momento.",
    networkStats: "Estadísticas de Red",
    globalHashrate: "Hashrate Red Bitcoin",
    btcPriceLabel: "Precio BTC/USD",
    poolWorkers: "Trabajadores del Pool",
    poolFee: "Comisión del Pool",
    supportedHardware: "Hardware Compatible",
    hwTitle: "Compatible con Todos los ASICs Principales",
    hwDesc: "Hashrial soporta todos los mineros ASIC y software de minería principales.",
    antminer: "Antminer",
    antminerDesc: "Bitmain Antminer S19, S21, S19 Pro, T21 y todos los modelos con firmware v2024+",
    whatsminer: "Whatsminer",
    whatsminerDesc: "MicroBT Whatsminer M50, M60, M66, M30S y todos los modelos",
    avalon: "Avalon",
    avalonDesc: "Canaan Avalon A12, A13, A15, A1566 — todas las generaciones",
    cpuGpu: "CPU / GPU",
    cpuGpuDesc: "CGMiner, BFGMiner, Awesome Miner, NiceHash y cualquier software compatible con Stratum",
    testimonials: "Lo Que Dicen Nuestros Mineros",
    testimonial1: "Vine directamente desde Antpool. La transparencia de Hashrial es inigualable.",
    testimonial2: "Minando 6 meses seguidos sin interrupciones. El panel es limpio y los pagos siempre a tiempo.",
    testimonial3: "La API es sólida. Construí un panel personalizado que rastrea cada trabajador en tiempo real.",
    testimonial4: "12 ASICs en Hashrial por 3 meses. La configuración tomó 5 minutos.",
    faq: "Preguntas Frecuentes",
    ctaTitle: "¿Listo para Empezar a Minar?",
    ctaDesc: "Únase a cientos de mineros que ya ganan Bitcoin con el modelo transparente de 2% de Hashrial.",
    createAccount: "Crear Cuenta Gratis",
    subtitle: "Proxy Stratum de alto rendimiento con un modelo de comisión transparente del 2%. El 98% de su hashrate va directamente a su subcuenta de Antpool.",
    heroDesc1: "Proxy Stratum de alto rendimiento",
    heroDesc2: "98% del Hashrate Para Usted",
    heroDesc3: "Comisión Transparente del 2%",
    heroDesc4: "Panel en Tiempo Real",
    learnMore: "Más Información",
    totalUsers: "Usuarios Totales",
    currentlyMining: "Minando Ahora",
    perShareRouted: "Por Acción Enrutada",
    registered: "Registrados",
    gettingStarted: "Primeros Pasos",
    threeSteps: "Tres simples pasos para empezar a minar Bitcoin con Hashrial",
    liveData: "Datos en Vivo",
    whyUsTag: "Por Qué Nosotros",
    builtFor: "Construido para mineros serios que exigen transparencia, rendimiento y confiabilidad",
    compatibility: "Compatibilidad",
    compatibilityDesc: "Hashrial soporta todos los mineros ASIC y software de minería principales.",
    testimonialsTag: "Testimonios",
    configTitle: "Configurador Stratum",
    support: "Soporte",
    quickLinks: "Enlaces Rápidos",
    account: "Cuenta",
    signIn: "Iniciar Sesión",
    createAccountFooter: "Crear Cuenta",
    language: "Idioma",
    allRightsReserved: "Todos los derechos reservados.",
    terms: "Términos",
    privacy: "Privacidad",
    contact: "Contacto",
    networkHashrate: "Hashrate de Red",
    poolUsers: "Usuarios del Pool",
    poolFeeLabel: "Comisión del Pool",
    industryStandard: "Estándar de la industria — como F2Pool, ViaBTC",
  },
  pt: {
    startMining: "Começar a Minerar",
    memberArea: "Área do Membro",
    configDesc: "Insira seu nome de usuário Hashrial para gerar sua configuração ASIC personalizada.",
    usernameLabel: "Seu Usuário",
    stratumUrl: "URL Stratum",
    stratumUser: "Usuário do Worker",
    stratumPass: "Senha",
    copy: "Copiar",
    copied: "Copiado!",
    footerText: "Hashrial Mining Pool. Proxy Stratum totalmente descentralizado com integração direta com Antpool.",
    home: "Início",
    features: "Recursos",
    faqLink: "FAQ",
    login: "Entrar",
    signUp: "Cadastrar",
    heroTag: "POOL DE MINERAÇÃO BITCOIN",
    activeMiners: "Mineradores Ativos",
    btcPrice: "Preço do Bitcoin",
    feeText: "Taxa do Pool",
    connecting: "Conectando...",
    whyUs: "Por que Minerar com Hashrial?",
    whyUs1: "A cada 50ª ação é direcionada para infraestrutura. Você mantém 98% do hashrate. Sem taxas ocultas.",
    whyUs2: "Construído para escala — gerencie milhares de conexões Stratum simultâneas com latência de submilissegundos.",
    whyUs3: "Gráficos em tempo real, monitoramento de workers, histórico de ganhos e notificações instantâneas.",
    whyUs4: "Integração direta com a API Antpool para rastreamento preciso de saldo e hashrate.",
    whyUs5: "Suporte multilíngue — inglês, persa, chinês, russo, espanhol e mais.",
    whyUs6: "Segurança nível empresarial — JWT, limite de taxa, proteção CORS, prevenção de SQL injection.",
    howItWorks: "Como Funciona",
    howStep1: "Criar Conta",
    howStep1Desc: "Registre-se com seu email e escolha um nome de usuário. Seu usuário é sua identidade no pool.",
    howStep2: "Configurar Mineradores",
    howStep2Desc: "Aponte seus ASICs para stratum+tcp://hashrial.com:3333 usando seu nome de usuário.",
    howStep3: "Começar a Ganhar",
    howStep3Desc: "Veja seu hashrate e ganhos em tempo real. Solicite pagamentos a qualquer momento.",
    networkStats: "Estatísticas da Rede",
    globalHashrate: "Hashrate da Rede Bitcoin",
    btcPriceLabel: "Preço BTC/USD",
    poolWorkers: "Trabalhadores do Pool",
    poolFee: "Taxa do Pool",
    supportedHardware: "Hardware Suportado",
    hwTitle: "Compatível com Todos os Principais ASICs",
    hwDesc: "Hashrial suporta todos os principais mineradores ASIC e softwares de mineração.",
    antminer: "Antminer",
    antminerDesc: "Bitmain Antminer S19, S21, S19 Pro, T21 e todos os modelos com firmware v2024+",
    whatsminer: "Whatsminer",
    whatsminerDesc: "MicroBT Whatsminer M50, M60, M66, M30S e todos os modelos",
    avalon: "Avalon",
    avalonDesc: "Canaan Avalon A12, A13, A15, A1566 — todas as gerações",
    cpuGpu: "CPU / GPU",
    cpuGpuDesc: "CGMiner, BFGMiner, Awesome Miner, NiceHash e qualquer software compatível com Stratum",
    testimonials: "O Que Nossos Mineradores Dizem",
    testimonial1: "Vim direto do Antpool. A transparência do Hashrial é incomparável.",
    testimonial2: "Minero há 6 meses sem parar. O painel é limpo e os pagamentos sempre no prazo.",
    testimonial3: "A API é sólida. Construí um painel personalizado que rastreia cada worker em tempo real.",
    testimonial4: "12 ASICs no Hashrial há 3 meses. A configuração levou 5 minutos.",
    faq: "Perguntas Frequentes",
    ctaTitle: "Pronto para Começar a Minerar?",
    ctaDesc: "Junte-se a centenas de mineradores que já ganham Bitcoin com o modelo transparente de 2% do Hashrial.",
    createAccount: "Criar Conta Gratuita",
    subtitle: "Proxy Stratum de alto desempenho com modelo de taxa transparente de 2%. 98% do seu hashrate vai diretamente para sua subconta Antpool.",
    heroDesc1: "Proxy Stratum de alto desempenho",
    heroDesc2: "98% do Hashrate Para Você",
    heroDesc3: "Taxa Transparente de 2%",
    heroDesc4: "Painel em Tempo Real",
    learnMore: "Saiba Mais",
    totalUsers: "Total de Usuários",
    currentlyMining: "Mineração Agora",
    perShareRouted: "Por Ação Roteada",
    registered: "Registrados",
    gettingStarted: "Primeiros Passos",
    threeSteps: "Três passos simples para começar a minerar Bitcoin com Hashrial",
    liveData: "Dados ao Vivo",
    whyUsTag: "Por Que Nós",
    builtFor: "Construído para mineradores sérios que exigem transparência, desempenho e confiabilidade",
    compatibility: "Compatibilidade",
    compatibilityDesc: "Hashrial suporta todos os principais mineradores ASIC e softwares de mineração.",
    testimonialsTag: "Depoimentos",
    configTitle: "Configurador Stratum",
    support: "Suporte",
    quickLinks: "Links Rápidos",
    account: "Conta",
    signIn: "Entrar",
    createAccountFooter: "Criar Conta",
    language: "Idioma",
    allRightsReserved: "Todos os direitos reservados.",
    terms: "Termos",
    privacy: "Privacidade",
    contact: "Contato",
    networkHashrate: "Hashrate da Rede",
    poolUsers: "Usuários do Pool",
    poolFeeLabel: "Taxa do Pool",
    industryStandard: "Padrão da indústria — como F2Pool, ViaBTC",
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

const hardwareItems = [
  { icon: "🟠", name: "Antminer", desc: "Bitmain Antminer S19, S21, S21+ Pro, T21, T19" },
  { icon: "🔵", name: "Whatsminer", desc: "MicroBT M50, M60, M66, M30S++, M31S" },
  { icon: "🟢", name: "Avalon", desc: "Canaan A12, A13, A15, A1566, A11" },
  { icon: "🟣", name: "CPU / GPU", desc: "CGMiner, BFGMiner, Awesome Miner, NiceHash" },
  { icon: "🔴", name: "IceRiver", desc: "IceRiver KS series, AL series" },
  { icon: "🟡", name: "GoldShell", desc: "GoldShell CK, HS, LT, KD series" },
  { icon: "⚪", name: "Jasminer", desc: "Jasminer X4, X6 series" },
  { icon: "🔶", name: "Software", desc: "Braiins OS, Hive OS, SimpleMining, Rave OS" },
];

const priceTickerItems = [
  { symbol: "BTC", name: "Bitcoin", price: 67432, change: 2.34 },
  { symbol: "ETH", name: "Ethereum", price: 3456, change: -1.23 },
  { symbol: "SOL", name: "Solana", price: 187, change: 5.67 },
  { symbol: "DOGE", name: "Dogecoin", price: 0.124, change: -0.45 },
  { symbol: "BNB", name: "BNB", price: 587, change: 1.89 },
  { symbol: "XRP", name: "Ripple", price: 0.623, change: -2.15 },
  { symbol: "ADA", name: "Cardano", price: 0.456, change: 3.21 },
  { symbol: "AVAX", name: "Avalanche", price: 38.7, change: -0.78 },
];

function FAQItem({ q, a, isOpen, onClick, isRtl }) {
  return (
    <div style={{
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 14,
      marginBottom: 10,
      overflow: "hidden",
      transition: "all 0.4s cubic-bezier(0.4,0,0.2,1)",
      background: isOpen ? "linear-gradient(135deg, rgba(247,147,26,0.04), rgba(247,147,26,0.01))" : "transparent",
    }}>
      <button onClick={onClick} style={{
        width: "100%", padding: "18px 22px",
        background: "none", border: "none", textAlign: isRtl ? "right" : "left", cursor: "pointer",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: "14px", fontWeight: 500, color: "#e6edf3",
        fontFamily: "inherit", letterSpacing: "-0.1px",
        transition: "all 0.2s",
      }}>
        <span style={{ flex: 1, paddingRight: 20 }}>{q}</span>
        <span style={{
          transform: isOpen ? "rotate(180deg)" : "rotate(0)",
          transition: "transform 0.4s cubic-bezier(0.4,0,0.2,1)", color: "#f7931a", fontSize: 12,
          flexShrink: 0,
        }}>▼</span>
      </button>
      <div style={{
        maxHeight: isOpen ? 200 : 0,
        opacity: isOpen ? 1 : 0,
        overflow: "hidden",
        transition: "all 0.4s cubic-bezier(0.4,0,0.2,1)",
      }}>
        <div style={{
          padding: "0 22px 18px",
          fontSize: "13px", color: "#8b949e", lineHeight: 1.8,
        }}>
          {a}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent, large, index = 0 }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} style={{
      background: "linear-gradient(135deg, rgba(13,17,23,0.8), rgba(13,17,23,0.4))",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: large ? 20 : 16,
      padding: large ? "32px 36px" : "22px 26px",
      textAlign: "center",
      flex: "1 1 180px",
      minWidth: large ? 200 : 160,
      backdropFilter: "blur(12px)",
      transform: visible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.95)",
      opacity: visible ? 1 : 0,
      transition: `all 0.6s cubic-bezier(0.4,0,0.2,1) ${index * 0.1}s`,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: "-50%", right: "-50%", width: 100, height: 100,
        background: `radial-gradient(circle, ${accent || "#f7931a"}15, transparent)`,
        pointerEvents: "none", borderRadius: "50%",
      }} />
      <div style={{ fontSize: "10px", color: "#8b949e", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: large ? 12 : 8, position: "relative" }}>{label}</div>
      <div style={{ fontSize: large ? "2rem" : "1.5rem", fontWeight: 700, color: accent || "#f7931a", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "-1px", position: "relative" }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: "#8b949e", marginTop: 8, position: "relative" }}>{sub}</div>}
    </div>
  );
}

function AnimatedCounter({ target, suffix = "", prefix = "", duration = 2000 }) {
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const increment = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [visible, target, duration]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

function SectionTitle({ tag, title, subtitle, index = 0 }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} style={{
      textAlign: "center", marginBottom: 56,
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(24px)",
      transition: `all 0.7s cubic-bezier(0.4,0,0.2,1) ${index * 0.1}s`,
    }}>
      {tag && <div style={{
        display: "inline-block",
        fontSize: 10, fontWeight: 600, color: "#f7931a",
        letterSpacing: "2px", textTransform: "uppercase",
        padding: "6px 16px",
        border: "1px solid rgba(247,147,26,0.15)",
        borderRadius: 100,
        background: "rgba(247,147,26,0.06)",
        marginBottom: 16,
      }}>{tag}</div>}
      <h2 style={{
        fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 800,
        letterSpacing: "-1.2px", marginBottom: subtitle ? 12 : 0,
        lineHeight: 1.15,
      }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 14, color: "#8b949e", maxWidth: 520, margin: "0 auto", lineHeight: 1.8 }}>{subtitle}</p>}
    </div>
  );
}

function useReveal(index = 0) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, visible, style: {
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(30px)",
    transition: `all 0.7s cubic-bezier(0.4,0,0.2,1) ${index * 0.12}s`,
  }};
}

function Reveal({ children, index = 0, style = {} }) {
  const { ref, visible, style: animStyle } = useReveal(index);
  return <div ref={ref} style={{ ...animStyle, ...style }}>{children}</div>;
}

export default function Landing() {
  const navigate = useNavigate();
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "en");
  const langMeta = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];
  const isRtl = langMeta.dir === "rtl";
  const t = T[lang] || T.en;
  const [copied, setCopied] = useState(null);
  const [username, setUsername] = useState("");
  const [poolStats, setPoolStats] = useState(null);
  const [btcPrice, setBtcPrice] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [mobileMenu, setMobileMenu] = useState(false);
  const particlesRef = useRef(null);

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
        api.btcPrice().then(p => setBtcPrice(p)).catch(() => {}),
      ]).finally(() => setStatsLoading(false));
    };
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTestimonialIdx(prev => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const canvas = particlesRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 0.5,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: (Math.random() - 0.5) * 0.5,
      opacity: Math.random() * 0.5 + 0.1,
    }));

    function resize() {
      if (canvas) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      }
    }
    resize();
    window.addEventListener("resize", resize);

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(247,147,26,${p.opacity})`;
        ctx.fill();
      });
      particles.forEach((a, i) => {
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(247,147,26,${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });
      animId = requestAnimationFrame(animate);
    }
    animate();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
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
      background: "#06090e",
      color: "#e6edf3",
      fontFamily: isRtl ? "'Vazirmatn','Tahoma',Arial,sans-serif" : "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      direction: isRtl ? "rtl" : "ltr",
      overflowX: "hidden",
    }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box}
        html{scroll-behavior:smooth}

        @keyframes float {
          0%,100%{transform:translateY(0px)}
          50%{transform:translateY(-10px)}
        }
        @keyframes fadeUp {
          from{opacity:0;transform:translateY(24px)}
          to{opacity:1;transform:translateY(0)}
        }
        @keyframes pulse {
          0%,100%{opacity:1}
          50%{opacity:0.35}
        }
        @keyframes shimmer {
          0%{background-position:-200% 0}
          100%{background-position:200% 0}
        }
        @keyframes marquee {
          0%{transform:translateX(0)}
          100%{transform:translateX(-50%)}
        }
        @keyframes gradientShift {
          0%{background-position:0% 50%}
          50%{background-position:100% 50%}
          100%{background-position:0% 50%}
        }
        @keyframes glowPulse {
          0%,100%{box-shadow:0 0 20px rgba(247,147,26,0.1),0 0 40px rgba(247,147,26,0.05)}
          50%{box-shadow:0 0 30px rgba(247,147,26,0.2),0 0 60px rgba(247,147,26,0.1)}
        }
        @keyframes borderGlow {
          0%,100%{border-color:rgba(247,147,26,0.1)}
          50%{border-color:rgba(247,147,26,0.25)}
        }
        @keyframes slideInLeft {
          from{opacity:0;transform:translateX(-30px)}
          to{opacity:1;transform:translateX(0)}
        }
        @keyframes slideInRight {
          from{opacity:0;transform:translateX(30px)}
          to{opacity:1;transform:translateX(0)}
        }
        @keyframes typewriter {
          from{width:0}
          to{width:100%}
        }
        @keyframes blink {
          0%,100%{opacity:1}
          50%{opacity:0}
        }
        @keyframes scaleIn {
          from{opacity:0;transform:scale(0.9)}
          to{opacity:1;transform:scale(1)}
        }
        @keyframes rotateIn {
          from{opacity:0;transform:rotate(-5deg) scale(0.95)}
          to{opacity:1;transform:rotate(0) scale(1)}
        }

        .float-anim{animation:float 6s ease-in-out infinite}
        .float-anim-delayed{animation:float 6s ease-in-out 3s infinite}
        .pulse-dot{animation:pulse 2s ease-in-out infinite}
        .glow-pulse{animation:glowPulse 3s ease-in-out infinite}
        .border-glow{animation:borderGlow 3s ease-in-out infinite}
        .gradient-text{background:linear-gradient(135deg,#f7931a,#fbb450,#f7931a,#e8830d);background-size:300% auto;background-clip:text;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:gradientShift 4s ease-in-out infinite}
        .hero-shimmer{background:linear-gradient(90deg,transparent,rgba(247,147,26,0.04),transparent);background-size:200% 100%;animation:shimmer 4s ease-in-out infinite}
        .card-hover{transition:all 0.4s cubic-bezier(0.4,0,0.2,1)}
        .card-hover:hover{transform:translateY(-4px) scale(1.01);box-shadow:0 12px 40px rgba(247,147,26,0.1);border-color:rgba(247,147,26,0.2)!important}
        .flex-center{display:flex;align-items:center;justify-content:center}
        .glass{background:rgba(13,17,23,0.6);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
        .marquee-container{overflow:hidden;position:relative}
        .marquee-track{display:flex;animation:marquee 40s linear infinite;width:fit-content}
        .marquee-track:hover{animation-play-state:paused}

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

        section{position:relative}
        section::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(247,147,26,0.08),transparent);pointer-events:none}
      `}</style>

      {/* Price Ticker Bar */}
      <div style={{
        height: 36,
        background: "linear-gradient(90deg, #0a0e14, #0f141e)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        display: "flex", alignItems: "center",
        overflow: "hidden",
        position: "fixed", top: 0, left: 0, right: 0,
        zIndex: 101,
      }}>
        <div className="marquee-container" style={{ flex: 1 }}>
          <div className="marquee-track" style={{ display: "flex", alignItems: "center", gap: 0 }}>
            {priceTickerItems.concat(priceTickerItems, priceTickerItems).map((item, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "0 20px",
                fontSize: 11.5, fontWeight: 500,
                whiteSpace: "nowrap",
                borderRight: "1px solid rgba(255,255,255,0.04)",
              }}>
                <span style={{ color: "#8b949e" }}>{item.symbol}</span>
                <span style={{ color: "#e6edf3", fontFamily: "'JetBrains Mono',monospace" }}>
                  ${item.price.toLocaleString(undefined, {
  minimumFractionDigits: item.price < 1 ? 4 : 2,
  maximumFractionDigits: item.price < 1 ? 4 : 2,
})}
                </span>
                <span style={{
                  color: item.change >= 0 ? "#3fb950" : "#f85149",
                  fontSize: 10,
                }}>
                  {item.change >= 0 ? "▲" : "▼"} {Math.abs(item.change).toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <header style={{
        height: 56,
        background: scrolled ? "rgba(6,9,14,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
        position: "fixed", top: 36, left: 0, right: 0,
        zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 28px",
        transition: "all 0.3s",
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
            <span style={{ fontSize: 15, fontWeight: 700, color: "#e6edf3", letterSpacing: "-0.3px" }}>Hashrial</span>
          </Link>
          <nav className="mobile-hide" style={{ display: "flex", gap: 2 }}>
            {[
              { href: "#features", label: t.features },
              { href: "#hardware", label: "Hardware" },
              { href: "#faq", label: t.faqLink },
            ].map((item, i) => (
              <a key={i} href={item.href} style={navLinkStyle(false)}
                onMouseEnter={e => { e.target.style.color = "#e6edf3"; e.target.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { e.target.style.color = "#8b949e"; e.target.style.background = "transparent"; }}
              >{item.label}</a>
            ))}
          </nav>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select value={lang} onChange={(e) => setLang(e.target.value)} style={{
            padding: "5px 8px", borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            color: "#e6edf3", fontSize: 11.5, cursor: "pointer", fontFamily: "inherit",
            outline: "none",
          }}>
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
          <Link to="/login" style={{
            fontSize: 12.5, padding: "6px 14px", color: "#8b949e",
            textDecoration: "none", fontWeight: 500, borderRadius: 6,
            transition: "all 0.2s",
          }}
            onMouseEnter={e => { e.target.style.color = "#e6edf3"; e.target.style.background = "rgba(255,255,255,0.04)"; }}
            onMouseLeave={e => { e.target.style.color = "#8b949e"; e.target.style.background = "transparent"; }}
          >{t.login}</Link>
          <Link to="/register" style={{
            fontSize: 12.5, padding: "6px 18px",
            background: "linear-gradient(135deg,#f7931a,#e8830d)",
            color: "#000", borderRadius: 6, fontWeight: 600,
            textDecoration: "none", transition: "all 0.2s",
            boxShadow: "0 2px 8px rgba(247,147,26,0.2)",
          }}
            onMouseEnter={e => { e.target.style.boxShadow = "0 4px 16px rgba(247,147,26,0.3)"; e.target.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.target.style.boxShadow = "0 2px 8px rgba(247,147,26,0.2)"; e.target.style.transform = "translateY(0)"; }}
          >{t.signUp}</Link>
          <button className="mobile-show" onClick={() => setMobileMenu(!mobileMenu)} style={{
            background: "none", border: "none", color: "#e6edf3", fontSize: 20,
            cursor: "pointer", padding: 4,
          }}>
            {mobileMenu ? "✕" : "☰"}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenu && (
        <div style={{
          position: "fixed", top: 92, left: 0, right: 0, bottom: 0,
          background: "rgba(6,9,14,0.98)",
          backdropFilter: "blur(20px)",
          zIndex: 99,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 24,
          animation: "fadeUp 0.3s ease-out",
        }}>
          {[
            { href: "#features", label: t.features },
            { href: "#hardware", label: "Hardware" },
            { href: "#faq", label: t.faqLink },
            { href: "/login", label: t.login, isLink: true },
            { href: "/register", label: t.signUp, isLink: true, primary: true },
          ].map((item, i) => (
            item.isLink ? (
              <Link key={i} to={item.href} onClick={() => setMobileMenu(false)}
                style={{
                  fontSize: item.primary ? 16 : 14,
                  fontWeight: item.primary ? 700 : 500,
                  color: item.primary ? "#000" : "#e6edf3",
                  background: item.primary ? "linear-gradient(135deg,#f7931a,#e8830d)" : "transparent",
                  padding: item.primary ? "12px 32px" : "8px 16px",
                  borderRadius: 10,
                  textDecoration: "none",
                  border: item.primary ? "none" : "1px solid rgba(255,255,255,0.1)",
                }}
              >{item.label}</Link>
            ) : (
              <a key={i} href={item.href} onClick={() => setMobileMenu(false)}
                style={{ fontSize: 14, fontWeight: 500, color: "#8b949e", textDecoration: "none" }}
              >{item.label}</a>
            )
          ))}
        </div>
      )}

      <main>
        {/* ═══════ HERO ═══════ */}
        <section style={{
          minHeight: "100vh",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "140px 28px 80px",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Particle Canvas */}
          <canvas ref={particlesRef} style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            pointerEvents: "none", zIndex: 0,
          }} />

          {/* Background gradients */}
          <div style={{
            position: "absolute", top: "-30%", left: "50%", transform: "translateX(-50%)",
            width: 1000, height: 1000,
            background: "radial-gradient(circle at center, rgba(247,147,26,0.08) 0%, transparent 60%)",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", bottom: "-20%", right: "-10%",
            width: 600, height: 600,
            background: "radial-gradient(circle at center, rgba(247,147,26,0.04) 0%, transparent 50%)",
            pointerEvents: "none",
          }} />

          {/* Hero badge */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            marginBottom: 32,
            padding: "7px 18px",
            border: "1px solid rgba(247,147,26,0.12)",
            borderRadius: 100,
            background: "rgba(247,147,26,0.04)",
            fontSize: 10.5, fontWeight: 600, color: "#f7931a",
            letterSpacing: "1.5px", textTransform: "uppercase",
            animation: "fadeUp 0.7s ease-out 0.2s both",
            position: "relative", zIndex: 1,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#3fb950", display: "inline-block",
              animation: "pulse 2s ease-in-out infinite",
              boxShadow: "0 0 6px rgba(63,185,80,0.5)",
            }} />
            {t.heroTag}
          </div>

          {/* Hero Title */}
          <h1 style={{
            fontSize: "clamp(36px, 6vw, 68px)", fontWeight: 800,
            textAlign: "center",
            lineHeight: 1.06,
            marginBottom: 20,
            letterSpacing: "-2px",
            maxWidth: 800,
            animation: "fadeUp 0.7s ease-out 0.35s both",
            position: "relative", zIndex: 1,
            fontFamily: isRtl ? "'Vazirmatn',Tahoma,sans-serif" : "'Inter',sans-serif",
          }}>
            Mine Bitcoin With{" "}
            <span className="gradient-text" style={{
              fontWeight: 900,
              display: "inline-block",
            }}>Full Transparency</span>
          </h1>

          {/* Hero Subtitle */}
          <p style={{
            fontSize: "clamp(14px, 1.2vw, 16px)", color: "#8b949e",
            maxWidth: 560, textAlign: "center",
            lineHeight: 1.8, marginBottom: 16,
            animation: "fadeUp 0.7s ease-out 0.5s both",
            position: "relative", zIndex: 1,
          }}>
            {t.subtitle}
          </p>

          {/* Tagline pills */}
          <div style={{
            display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center",
            marginBottom: 36,
            animation: "fadeUp 0.7s ease-out 0.6s both",
            position: "relative", zIndex: 1,
          }}>
            {[t.heroDesc1, t.heroDesc2, t.heroDesc3].map((text, i) => (
              <span key={i} style={{
                fontSize: 10.5, color: "#8b949e",
                padding: "4px 12px",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 100,
                background: "rgba(255,255,255,0.02)",
              }}>{text}</span>
            ))}
          </div>

          {/* CTA Buttons */}
          <div style={{
            display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center",
            animation: "fadeUp 0.7s ease-out 0.7s both",
            position: "relative", zIndex: 1,
          }}>
            <button onClick={() => navigate("/register")} className="glow-pulse" style={{
              padding: "15px 36px",
              background: "linear-gradient(135deg,#f7931a,#e8830d)",
              color: "#000", border: "none", borderRadius: 12,
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)", fontFamily: "inherit",
              boxShadow: "0 4px 20px rgba(247,147,26,0.25)",
              position: "relative", overflow: "hidden",
            }}
              onMouseEnter={e => { e.target.style.transform = "translateY(-2px) scale(1.02)"; e.target.style.boxShadow = "0 8px 30px rgba(247,147,26,0.35)"; }}
              onMouseLeave={e => { e.target.style.transform = "translateY(0) scale(1)"; e.target.style.boxShadow = "0 4px 20px rgba(247,147,26,0.25)"; }}
            >
              {t.startMining} →
            </button>
            <button onClick={() => {
              const token = localStorage.getItem("hashrial_token");
              if (token) navigate("/dashboard"); else navigate("/login");
            }} style={{
              padding: "15px 28px",
              background: "rgba(255,255,255,0.04)",
              color: "#e6edf3", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer",
              transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)", fontFamily: "inherit",
              backdropFilter: "blur(8px)",
            }}
              onMouseEnter={e => { e.target.style.borderColor = "#f7931a"; e.target.style.color = "#f7931a"; e.target.style.background = "rgba(247,147,26,0.06)"; }}
              onMouseLeave={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.color = "#e6edf3"; e.target.style.background = "rgba(255,255,255,0.04)"; }}
            >
              {t.memberArea} →
            </button>
          </div>

          {/* Hero Stats */}
          <div style={{
            display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center",
            marginTop: 64, width: "100%", maxWidth: 800,
            animation: "fadeUp 0.7s ease-out 0.85s both",
            position: "relative", zIndex: 1,
          }}>
            <StatCard label={t.activeMiners} index={0}
              value={statsLoading ? "—" : <AnimatedCounter target={poolStats?.activeWorkers || 0} />}
              sub={t.currentlyMining}
              accent="#3fb950" />
            <StatCard label={t.btcPrice} index={1}
              value={btcPrice?.price ? `$${btcPrice.price.toLocaleString()}` : "—"}
              sub={!statsLoading && btcPrice?.change ? `${btcPrice.change >= 0 ? "▲" : "▼"} ${Math.abs(btcPrice.change).toFixed(1)}% 24h` : "BTC/USD"}
              accent="#f7931a" />
            <StatCard label={t.feeText} index={2}
              value="2%"
              sub={t.perShareRouted}
              accent="#e6edf3" />
            <StatCard label={t.totalUsers} index={3}
              value={statsLoading ? "—" : <AnimatedCounter target={poolStats?.totalUsers || 0} />}
              sub={t.registered}
              accent="#58a6ff" />
          </div>

          {/* Scroll indicator */}
          <div style={{
            position: "absolute", bottom: 28,
            left: "50%", transform: "translateX(-50%)",
            animation: "float 3s ease-in-out infinite",
            zIndex: 1,
          }}>
            <div style={{
              width: 20, height: 32,
              border: "2px solid rgba(255,255,255,0.1)",
              borderRadius: 10,
              position: "relative",
            }}>
              <div style={{
                width: 3, height: 8,
                background: "#f7931a",
                borderRadius: 2,
                position: "absolute", top: 5, left: "50%",
                transform: "translateX(-50%)",
                animation: "pulse 2s ease-in-out infinite",
              }} />
            </div>
          </div>
        </section>

        {/* ═══════ HOW IT WORKS ═══════ */}
        <section style={{
          padding: "100px 28px",
          maxWidth: 1100, margin: "0 auto",
        }}>
          <SectionTitle tag={t.gettingStarted} title={t.howItWorks} subtitle={t.threeSteps} />

          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24,
            position: "relative",
          }}>
            {/* Connector line */}
            <div className="mobile-hide" style={{
              position: "absolute", top: 80, left: "15%", right: "15%",
              height: 1,
              background: "linear-gradient(90deg, rgba(247,147,26,0.3), rgba(247,147,26,0.1), rgba(247,147,26,0.3))",
              zIndex: 0,
            }} />

            {[
              { num: "01", title: t.howStep1, desc: t.howStep1Desc, icon: "👤", gradient: "linear-gradient(135deg, rgba(247,147,26,0.15), rgba(247,147,26,0.05))" },
              { num: "02", title: t.howStep2, desc: t.howStep2Desc, icon: "⚙", gradient: "linear-gradient(135deg, rgba(56,139,253,0.15), rgba(56,139,253,0.05))" },
              { num: "03", title: t.howStep3, desc: t.howStep3Desc, icon: "₿", gradient: "linear-gradient(135deg, rgba(63,185,80,0.15), rgba(63,185,80,0.05))" },
            ].map((s, i) => (
              <Reveal key={i} index={i}>
                <div className="card-hover" style={{
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 20, padding: 36,
                  background: "rgba(13,17,23,0.5)",
                  textAlign: "center",
                  position: "relative",
                  backdropFilter: "blur(8px)",
                }}>
                  <div style={{
                    position: "absolute", top: -1, left: -1, right: -1,
                    height: 2,
                    background: s.gradient,
                    borderRadius: "20px 20px 0 0",
                  }} />
                  <div style={{
                    width: 64, height: 64, borderRadius: 18,
                    background: s.gradient,
                    border: "1px solid rgba(247,147,26,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 28, margin: "0 auto 20px",
                    position: "relative",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                  }}>
                    <div style={{
                      position: "absolute", top: -6, right: -6,
                      width: 24, height: 24, borderRadius: "50%",
                      background: "rgba(13,17,23,0.9)",
                      border: "1px solid rgba(247,147,26,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 700, color: "#f7931a",
                    }}>{s.num}</div>
                    {s.icon}
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 12 }}>{s.title}</h3>
                  <p style={{ fontSize: 13, color: "#8b949e", lineHeight: 1.8, maxWidth: 260, margin: "0 auto" }}>{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ═══════ NETWORK STATS ═══════ */}
        <section style={{
          padding: "60px 28px 100px",
          maxWidth: 900, margin: "0 auto",
        }}>
          <Reveal>
            <div style={{
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 24,
              padding: "48px 40px",
              background: "linear-gradient(135deg, rgba(13,17,23,0.7), rgba(13,17,23,0.3))",
              backdropFilter: "blur(20px)",
              position: "relative",
              overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: "-50%", left: "20%",
                width: 400, height: 400,
                background: "radial-gradient(circle, rgba(247,147,26,0.04), transparent)",
                pointerEvents: "none", borderRadius: "50%",
              }} />
              <SectionTitle tag={t.liveData} title={t.networkStats} />

              <div style={{
                display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20,
                position: "relative",
              }}>
                <StatCard label={t.btcPriceLabel} large index={0}
                  value={btcPrice?.price ? `$${btcPrice.price.toLocaleString()}` : "—"}
                  sub={btcPrice?.change ? `${btcPrice.change >= 0 ? "▲" : "▼"} ${Math.abs(btcPrice.change).toFixed(2)}% (24h)` : "Live from CoinGecko & Binance"}
                  accent="#f7931a" />
                <StatCard label={t.networkHashrate} large index={1}
                  value="—"
                  sub="Data available with API backend"
                  accent="#58a6ff" />
                <StatCard label={t.poolUsers} large index={2}
                  value={statsLoading ? "—" : <AnimatedCounter target={poolStats?.activeWorkers || 0} />}
                  sub={poolStats?.totalUsers ? `Across ${poolStats.totalUsers.toLocaleString()} registered users` : "Registered users"}
                  accent="#3fb950" />
                <StatCard label={t.poolFeeLabel} large index={3}
                  value="2%"
                  sub={t.industryStandard}
                  accent="#e6edf3" />
              </div>
            </div>
          </Reveal>
        </section>

        {/* ═══════ FEATURES ═══════ */}
        <section id="features" style={{
          padding: "100px 28px",
          maxWidth: 1100, margin: "0 auto",
        }}>
          <SectionTitle tag={t.whyUsTag} title={t.whyUs} subtitle={t.builtFor} index={1} />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {[
              { icon: "💰", title: "Transparent 2% Fee", desc: t.whyUs1, color: "#f7931a" },
              { icon: "⚡", title: "High Performance", desc: t.whyUs2, color: "#d4a574" },
              { icon: "📊", title: "Real-time Dashboard", desc: t.whyUs3, color: "#58a6ff" },
              { icon: "⛓", title: "Antpool Integration", desc: t.whyUs4, color: "#3fb950" },
              { icon: "🌐", title: "Multi-language", desc: t.whyUs5, color: "#bc8cff" },
              { icon: "🔒", title: "Enterprise Security", desc: t.whyUs6, color: "#f0883e" },
            ].map((f, i) => (
              <Reveal key={i} index={i}>
                <div className="card-hover" style={{
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 18, padding: 28,
                  background: "rgba(13,17,23,0.5)",
                  backdropFilter: "blur(8px)",
                  position: "relative",
                  overflow: "hidden",
                }}>
                  <div style={{
                    position: "absolute", top: 0, left: 0, width: 3, height: "100%",
                    background: `linear-gradient(180deg, ${f.color}, transparent)`,
                    borderRadius: "18px 0 0 18px",
                  }} />
                  <div style={{
                    width: 46, height: 46, borderRadius: 14,
                    background: `${f.color}12`,
                    border: `1px solid ${f.color}20`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, marginBottom: 16,
                  }}>{f.icon}</div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>{f.title}</h3>
                  <p style={{ fontSize: 13, color: "#8b949e", lineHeight: 1.8 }}>{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ═══════ SUPPORTED HARDWARE ═══════ */}
        <section id="hardware" style={{
          padding: "80px 28px 100px",
          maxWidth: 1100, margin: "0 auto",
        }}>
          <SectionTitle tag={t.compatibility} title={t.supportedHardware} subtitle={t.compatibilityDesc} index={2} />

          <div className="marquee-container" style={{ padding: "8px 0" }}>
            <div className="marquee-track">
              {[...Array(2)].flatMap(() => hardwareItems).map((h, i) => (
                <div key={i} className="card-hover" style={{
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 16, padding: "20px 28px",
                  background: "rgba(13,17,23,0.5)",
                  textAlign: "center",
                  minWidth: 180,
                  margin: "0 8px",
                  backdropFilter: "blur(8px)",
                }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>{h.icon}</div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{h.name}</h3>
                  <p style={{ fontSize: 11, color: "#8b949e", lineHeight: 1.6 }}>{h.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ TESTIMONIALS ═══════ */}
        <section style={{
          padding: "80px 28px 100px",
          maxWidth: 900, margin: "0 auto",
        }}>
          <SectionTitle tag={t.testimonialsTag} title={t.testimonials} index={3} />

          <Reveal>
            <div style={{
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 20,
              padding: "40px 36px",
              background: "linear-gradient(135deg, rgba(13,17,23,0.7), rgba(13,17,23,0.3))",
              backdropFilter: "blur(12px)",
              position: "relative",
              overflow: "hidden",
              minHeight: 220,
            }}>
              <div style={{
                position: "absolute", top: "-30%", right: "-10%",
                width: 300, height: 300,
                background: "radial-gradient(circle, rgba(247,147,26,0.04), transparent)",
                pointerEvents: "none", borderRadius: "50%",
              }} />
              <div style={{ position: "relative" }}>
                <div style={{ marginBottom: 16 }}>
                  {Array(testimonials[testimonialIdx].rating).fill(0).map((_, i) => (
                    <span key={i} style={{ color: "#f7931a", marginRight: 3, fontSize: 18, opacity: 0.9 }}>★</span>
                  ))}
                </div>
                <p style={{
                  fontSize: 15, color: "#e6edf3", lineHeight: 1.8,
                  marginBottom: 20, fontStyle: "italic",
                  transition: "all 0.5s",
                }}>
                  "{testimonials[testimonialIdx].text}"
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#f7931a" }}>{testimonials[testimonialIdx].author}</div>
                    <div style={{ fontSize: 12, color: "#8b949e" }}>{testimonials[testimonialIdx].role}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {testimonials.map((_, i) => (
                      <button key={i} onClick={() => setTestimonialIdx(i)} style={{
                        width: 8, height: 8, borderRadius: "50%",
                        border: "none", cursor: "pointer",
                        background: i === testimonialIdx ? "#f7931a" : "rgba(255,255,255,0.15)",
                        transition: "all 0.3s",
                        padding: 0,
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ═══════ CONFIGURATOR ═══════ */}
        <section style={{
          padding: "60px 28px 80px",
          maxWidth: 560, margin: "0 auto",
        }}>
          <Reveal>
            <div className="border-glow" style={{
              border: "1px solid rgba(247,147,26,0.1)",
              borderRadius: 24,
              padding: "40px 36px",
              background: "linear-gradient(135deg, rgba(13,17,23,0.8), rgba(13,17,23,0.4))",
              backdropFilter: "blur(12px)",
              position: "relative",
              overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: "-30%", left: "50%", transform: "translateX(-50%)",
                width: 300, height: 300,
                background: "radial-gradient(circle, rgba(247,147,26,0.05), transparent)",
                pointerEvents: "none",
              }} />
              <div style={{ textAlign: "center", marginBottom: 28, position: "relative" }}>
                <div style={{
                  fontSize: 40, marginBottom: 14,
                  display: "inline-block",
                  animation: "float 4s ease-in-out infinite",
                }}>⚡</div>
                <h2 style={{ fontSize: 21, fontWeight: 700, marginBottom: 8 }}>{t.configTitle}</h2>
                <p style={{ fontSize: 13, color: "#8b949e", lineHeight: 1.7 }}>{t.configDesc}</p>
              </div>

              <input type="text" placeholder={t.usernameLabel}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: "100%",
                  padding: "13px 18px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  color: "#e6edf3", fontSize: 14,
                  fontFamily: "'JetBrains Mono',monospace",
                  outline: "none", marginBottom: 16,
                  transition: "border 0.2s",
                  position: "relative",
                }}
                onFocus={e => e.target.style.borderColor = "#f7931a"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
              />

              {username && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, position: "relative" }}>
                  {[
                    { label: t.stratumUrl, value: "stratum+tcp://hashrial.com:3333" },
                    { label: t.stratumUser, value: `${username}.worker1` },
                    { label: t.stratumPass, value: "x" },
                  ].map((item, i) => (
                    <div key={i} style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 12, padding: "14px 18px",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      transition: "border 0.2s",
                    }}>
                      <div>
                        <div style={{ fontSize: 10, color: "#8b949e", marginBottom: 3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{item.label}</div>
                        <div style={{ fontSize: 13, fontFamily: "'JetBrains Mono',monospace", color: "#f7931a", letterSpacing: "-0.3px" }}>{item.value}</div>
                      </div>
                      <button onClick={() => handleCopy(item.value, i)} style={{
                        padding: "7px 16px",
                        background: copied === i ? "rgba(63,185,80,0.12)" : "rgba(247,147,26,0.1)",
                        color: copied === i ? "#3fb950" : "#f7931a",
                        border: `1px solid ${copied === i ? "rgba(63,185,80,0.2)" : "rgba(247,147,26,0.15)"}`,
                        borderRadius: 8, fontSize: 11.5, fontWeight: 600,
                        cursor: "pointer", fontFamily: "inherit",
                        transition: "all 0.2s",
                      }}>
                        {copied === i ? "✓ Copied" : t.copy}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Reveal>
        </section>

        {/* ═══════ FAQ ═══════ */}
        <section id="faq" style={{
          padding: "0 28px 80px",
          maxWidth: 640, margin: "0 auto",
        }}>
          <SectionTitle tag={t.support} title={t.faq} index={4} />
          {faqData.map((item, i) => (
            <FAQItem key={i} q={item.q} a={item.a} isOpen={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? -1 : i)} isRtl={isRtl} />
          ))}
        </section>

        {/* ═══════ CTA ═══════ */}
        <section style={{
          padding: "60px 28px 100px",
          maxWidth: 700, margin: "0 auto",
        }}>
          <Reveal>
            <div style={{
              border: "1px solid rgba(247,147,26,0.12)",
              borderRadius: 28,
              padding: "56px 40px",
              textAlign: "center",
              background: "linear-gradient(135deg, rgba(247,147,26,0.08), rgba(247,147,26,0.02), rgba(13,17,23,0.6))",
              position: "relative",
              overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: "-40%", left: "50%", transform: "translateX(-50%)",
                width: 500, height: 500,
                background: "radial-gradient(circle at center, rgba(247,147,26,0.08) 0%, transparent 60%)",
                pointerEvents: "none",
              }} />
              <div style={{
                position: "absolute", bottom: "-30%", right: "-20%",
                width: 300, height: 300,
                background: "radial-gradient(circle, rgba(247,147,26,0.04), transparent)",
                pointerEvents: "none", borderRadius: "50%",
              }} />
              <div style={{ fontSize: 48, marginBottom: 16, position: "relative", animation: "float 5s ease-in-out infinite" }}>₿</div>
              <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, position: "relative", letterSpacing: "-0.8px" }}>{t.ctaTitle}</h2>
              <p style={{ fontSize: 14, color: "#8b949e", lineHeight: 1.8, marginBottom: 32, maxWidth: 480, margin: "0 auto 32px", position: "relative" }}>
                {t.ctaDesc}
              </p>
              <button onClick={() => navigate("/register")} className="glow-pulse" style={{
                padding: "16px 40px",
                background: "linear-gradient(135deg,#f7931a,#e8830d)",
                color: "#000", border: "none", borderRadius: 14,
                fontSize: 16, fontWeight: 700, cursor: "pointer",
                transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)", fontFamily: "inherit",
                boxShadow: "0 4px 20px rgba(247,147,26,0.2)",
                position: "relative",
              }}
                onMouseEnter={e => { e.target.style.transform = "translateY(-2px) scale(1.02)"; e.target.style.boxShadow = "0 8px 30px rgba(247,147,26,0.35)"; }}
                onMouseLeave={e => { e.target.style.transform = "translateY(0) scale(1)"; e.target.style.boxShadow = "0 4px 20px rgba(247,147,26,0.2)"; }}
              >
                {t.createAccount} →
              </button>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ═══════ FOOTER ═══════ */}
      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.04)",
        padding: "56px 28px 32px",
        background: "linear-gradient(180deg, #06090e, #080b12)",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "flex-start",
            flexWrap: "wrap", gap: 40, marginBottom: 40,
          }}>
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
              <p style={{ fontSize: 13, color: "#8b949e", lineHeight: 1.8 }}>
                {t.footerText}
              </p>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#e6edf3", marginBottom: 16, textTransform: "uppercase", letterSpacing: "1px", opacity: 0.6 }}>{t.quickLinks}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[t.home, t.features, "Hardware", t.faqLink, t.support].map((link, i) => (
                  <a key={i} href={i === 0 ? "#" : `#${link.toLowerCase()}`} style={{
                    fontSize: 13, color: "#8b949e", textDecoration: "none",
                    transition: "all 0.2s",
                  }}
                    onMouseEnter={e => { e.target.style.color = "#f7931a"; e.target.style.paddingLeft = "4px"; }}
                    onMouseLeave={e => { e.target.style.color = "#8b949e"; e.target.style.paddingLeft = "0"; }}
                  >{link}</a>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#e6edf3", marginBottom: 16, textTransform: "uppercase", letterSpacing: "1px", opacity: 0.6 }}>{t.account}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Link to="/login" style={{
                  fontSize: 13, color: "#8b949e", textDecoration: "none",
                  transition: "all 0.2s",
                }}
                  onMouseEnter={e => { e.target.style.color = "#f7931a"; e.target.style.paddingLeft = "4px"; }}
                  onMouseLeave={e => { e.target.style.color = "#8b949e"; e.target.style.paddingLeft = "0"; }}
                >{t.signIn}</Link>
                <Link to="/register" style={{
                  fontSize: 13, color: "#8b949e", textDecoration: "none",
                  transition: "all 0.2s",
                }}
                  onMouseEnter={e => { e.target.style.color = "#f7931a"; e.target.style.paddingLeft = "4px"; }}
                  onMouseLeave={e => { e.target.style.color = "#8b949e"; e.target.style.paddingLeft = "0"; }}
                >{t.createAccountFooter}</Link>
                <Link to="/dashboard" style={{
                  fontSize: 13, color: "#8b949e", textDecoration: "none",
                  transition: "all 0.2s",
                }}
                  onMouseEnter={e => { e.target.style.color = "#f7931a"; e.target.style.paddingLeft = "4px"; }}
                  onMouseLeave={e => { e.target.style.color = "#8b949e"; e.target.style.paddingLeft = "0"; }}
                >Dashboard</Link>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#e6edf3", marginBottom: 16, textTransform: "uppercase", letterSpacing: "1px", opacity: 0.6 }}>{t.language}</div>
              <select value={lang} onChange={(e) => setLang(e.target.value)} style={{
                padding: "8px 14px", borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
                color: "#e6edf3", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                outline: "none", minWidth: 140,
              }}>
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{
            borderTop: "1px solid rgba(255,255,255,0.04)",
            paddingTop: 20,
            display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
            fontSize: 12, color: "#484f58",
          }}>
            <span>© {new Date().getFullYear()} Hashrial. {t.allRightsReserved}</span>
            <div style={{ display: "flex", gap: 20 }}>
              <span style={{ cursor: "pointer", transition: "color 0.2s" }}
                onMouseEnter={e => e.target.style.color = "#8b949e"}
                onMouseLeave={e => e.target.style.color = "#484f58"}
              >{t.terms}</span>
              <span style={{ cursor: "pointer", transition: "color 0.2s" }}
                onMouseEnter={e => e.target.style.color = "#8b949e"}
                onMouseLeave={e => e.target.style.color = "#484f58"}
              >{t.privacy}</span>
              <span style={{ cursor: "pointer", transition: "color 0.2s" }}
                onMouseEnter={e => e.target.style.color = "#8b949e"}
                onMouseLeave={e => e.target.style.color = "#484f58"}
              >{t.contact}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
