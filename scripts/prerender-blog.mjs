/* Emit a real, crawlable HTML page per article, plus sitemap.xml.
 *
 * Runs AFTER the CRA build, against dashboard/build.
 *
 * Why this exists: hashrial.com is a client-rendered SPA. Google will usually
 * render JS eventually, but Telegram, WhatsApp and Twitter link-preview
 * crawlers do NOT execute JS at all — and those are how articles actually get
 * shared in Iran. Without a prerendered <head>, every shared link is a bare URL
 * with no title, description or image.
 *
 * The emitted page carries the full head plus the article text in the body, so
 * a crawler that never runs JS still sees the content. React hydrates over it
 * for a human visitor.
 *
 *   node scripts/prerender-blog.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUILD = path.join(ROOT, "dashboard", "build");
const DATA = path.join(ROOT, "dashboard", "src", "blog-data.json");
const SITE = "https://hashrial.com";

const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function run() {
  if (!fs.existsSync(BUILD)) { console.error("no dashboard/build — run the CRA build first"); process.exit(1); }
  const { posts } = JSON.parse(fs.readFileSync(DATA, "utf8"));
  const shell = fs.readFileSync(path.join(BUILD, "index.html"), "utf8");

  // One canonical URL per slug. The article exists in several languages at the
  // same path (the app picks by UI language), so the languages are declared
  // with hreflang rather than given separate URLs — separate URLs would need
  // separate paths, and inventing /fa/ routes the router does not serve would
  // produce a sitemap full of soft-404s.
  const bySlug = new Map();
  for (const p of posts) {
    if (!bySlug.has(p.slug)) bySlug.set(p.slug, []);
    bySlug.get(p.slug).push(p);
  }

  let written = 0;
  for (const [slug, versions] of bySlug) {
    // Farsi is the primary edition, so it supplies the head when present.
    const primary = versions.find(v => v.lang === "fa") || versions[0];
    const url = `${SITE}/blog/${slug}`;

    const hreflang = versions
      .map(v => `<link rel="alternate" hreflang="${v.lang}" href="${url}"/>`)
      .join("\n    ")
      + `\n    <link rel="alternate" hreflang="x-default" href="${url}"/>`;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: primary.title,
      description: primary.description,
      inLanguage: primary.lang,
      datePublished: primary.date,
      dateModified: primary.date,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      author: { "@type": "Organization", name: "Hashrial", url: SITE },
      publisher: {
        "@type": "Organization", name: "Hashrial",
        logo: { "@type": "ImageObject", url: `${SITE}/favicon.png` },
      },
      image: `${SITE}/og-image.png`,
      keywords: (primary.keywords || []).join(", "),
    };

    const head = `
    <title>${esc(primary.title)} — Hashrial</title>
    <meta name="description" content="${esc(primary.description)}"/>
    <link rel="canonical" href="${url}"/>
    ${hreflang}
    <meta property="og:type" content="article"/>
    <meta property="og:url" content="${url}"/>
    <meta property="og:title" content="${esc(primary.title)}"/>
    <meta property="og:description" content="${esc(primary.description)}"/>
    <meta property="og:image" content="${SITE}/og-image.png"/>
    <meta property="og:locale" content="${primary.lang === "fa" ? "fa_IR" : "en_US"}"/>
    <meta property="article:published_time" content="${primary.date}"/>
    <meta name="twitter:card" content="summary_large_image"/>
    <meta name="twitter:title" content="${esc(primary.title)}"/>
    <meta name="twitter:description" content="${esc(primary.description)}"/>
    <meta name="twitter:image" content="${SITE}/og-image.png"/>
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;

    // Replace the SPA's own title/description/canonical rather than appending,
    // or crawlers see two of each and pick unpredictably.
    let html = shell
      .replace(/<title>[\s\S]*?<\/title>/, "")
      .replace(/<meta name="description"[^>]*>/g, "")
      .replace(/<meta name="title"[^>]*>/g, "")
      .replace(/<link rel="canonical"[^>]*>/g, "")
      .replace(/<meta property="og:[^>]*>/g, "")
      .replace(/<meta property="twitter:[^>]*>/g, "")
      .replace("</head>", `${head}\n  </head>`);

    // The article text itself, so a JS-less crawler reads the content and not
    // an empty div. React replaces this on hydration.
    const noscript = `<div id="prerendered-article" dir="${primary.dir}">` +
      `<h1>${esc(primary.title)}</h1>${primary.html}</div>`;
    html = html.replace('<div id="root">', `<div id="root">${noscript}`);
    html = html.replace(/<html([^>]*)lang="[^"]*"/, `<html$1lang="${primary.lang}"`);
    if (primary.dir === "rtl") html = html.replace(/<html([^>]*)>/, `<html$1 dir="rtl">`);

    const dir = path.join(BUILD, "blog", slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), html);
    written++;
  }

  // /blog itself
  if (bySlug.size) {
    const listHead = `
    <title>Blog — Hashrial</title>
    <meta name="description" content="Mining, pools and Bitcoin — written for people who actually run hardware."/>
    <link rel="canonical" href="${SITE}/blog"/>`;
    let html = shell
      .replace(/<title>[\s\S]*?<\/title>/, "")
      .replace(/<meta name="description"[^>]*>/g, "")
      .replace(/<link rel="canonical"[^>]*>/g, "")
      .replace("</head>", `${listHead}\n  </head>`);
    const items = [...bySlug.values()].map(v => {
      const p = v.find(x => x.lang === "fa") || v[0];
      return `<li><a href="${SITE}/blog/${p.slug}">${esc(p.title)}</a> — ${esc(p.description)}</li>`;
    }).join("");
    html = html.replace('<div id="root">', `<div id="root"><h1>Blog</h1><ul>${items}</ul>`);
    fs.mkdirSync(path.join(BUILD, "blog"), { recursive: true });
    fs.writeFileSync(path.join(BUILD, "blog", "index.html"), html);
  }

  // sitemap — static routes plus every published article
  const staticRoutes = ["", "/blog", "/register", "/login", "/terms", "/privacy"];
  const urls = [
    ...staticRoutes.map(r => ({ loc: `${SITE}${r}`, priority: r === "" ? "1.0" : "0.6" })),
    ...[...bySlug.keys()].map(s => ({ loc: `${SITE}/blog/${s}`, priority: "0.8" })),
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.w3.org/1999/xhtml/sitemap" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.map(u => `  <url><loc>${u.loc}</loc><priority>${u.priority}</priority></url>`).join("\n")}
</urlset>
`.replace("http://www.w3.org/1999/xhtml/sitemap", "http://www.sitemaps.org/schemas/sitemap/0.9");
  fs.writeFileSync(path.join(BUILD, "sitemap.xml"), sitemap);

  console.log(`  prerendered ${written} article page(s) + /blog, sitemap has ${urls.length} url(s)`);
  if (!written) console.log("  (no published articles — only static routes are in the sitemap)");
}

run();
