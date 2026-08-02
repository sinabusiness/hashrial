import React, { useMemo } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { useLang } from "../i18n";
import blogData from "../blog-data.json";

/* Blog. Content is markdown in content/blog/, converted at BUILD time by
   scripts/build-blog.mjs — no markdown parser ships in the bundle, and the
   generated HTML is what the prerenderer emits as real crawlable pages.

   Articles are written Farsi-first. An article that exists only in Persian is
   correct and complete, not a missing translation, so the list shows what
   exists in the reader's language and offers the other versions rather than
   pretending every post exists in six. */

const POSTS = (blogData && blogData.posts) || [];

function useLocalisedPosts() {
  const { lang } = useLang();
  return useMemo(() => {
    const mine = POSTS.filter(p => p.lang === lang);
    // Fall back to whatever DOES exist for a slug rather than hiding the piece.
    const covered = new Set(mine.map(p => p.slug));
    const rest = [];
    for (const p of POSTS) {
      if (covered.has(p.slug)) continue;
      if (rest.some(r => r.slug === p.slug)) continue;
      rest.push(p);
    }
    return [...mine, ...rest].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [lang]);
}

/* Every language version gets its OWN url. Sharing one url between translations
   meant Google could index only one of them, which defeats the point of writing
   Farsi-first. The primary edition (Persian where it exists) keeps the bare
   /blog/<slug>; the others hang off it. */
export function postPath(slug, lang, translations) {
  const primary = (translations || []).includes("fa") ? "fa" : (translations || [])[0];
  return lang === primary ? `/blog/${slug}` : `/blog/${slug}/${lang}`;
}

function fmtDate(d, lang) {
  try {
    return new Date(d).toLocaleDateString(lang === "fa" ? "fa-IR" : lang === "zh" ? "zh-CN" : "en-GB",
      { year: "numeric", month: "short", day: "numeric" });
  } catch { return d; }
}

export function BlogIndex() {
  const { t, lang } = useLang();
  const posts = useLocalisedPosts();

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t("blogTitle")}</h1>
          <div className="page-sub">{t("blogSub")}</div>
        </div>
      </div>

      {!posts.length ? (
        <div className="panel"><div className="empty">{t("blogEmpty")}</div></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {posts.map(p => (
            <Link
              key={`${p.slug}.${p.lang}`}
              to={postPath(p.slug, p.lang, p.translations)}
              className="panel panel-pad hr-link"
              style={{ display: "block", textDecoration: "none", color: "inherit" }}
            >
              <article dir={p.dir}>
                <h2 style={{ fontSize: 17, fontWeight: 650, letterSpacing: "-0.01em", marginBottom: 6, color: "var(--text)" }}>
                  {p.title}
                </h2>
                <div style={{ fontSize: 13.5, color: "var(--text2)", lineHeight: 1.7, marginBottom: 10 }}>
                  {p.description}
                </div>
                <div className="meta" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <span className="num">{fmtDate(p.date, lang)}</span>
                  <span aria-hidden="true">·</span>
                  <span><span className="num">{p.readingMinutes}</span> {t("blogMinRead")}</span>
                  {(p.translations || []).map(l => (
                    <span key={l} className={`pill ${l === p.lang ? "pill-ok" : "pill-idle"}`}
                          style={{ textTransform: "uppercase" }}>{l}</span>
                  ))}
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function BlogPost() {
  const { slug, lang: urlLang } = useParams();
  const { t, lang } = useLang();

  /* THE URL DECIDES THE EDITION — never the interface language.
     
     Letting the UI language pick produced a page whose tab said one thing and
     whose body said another: the prerendered HTML at /blog/<slug> is the
     Persian edition, then React hydrated and swapped the body to English while
     the prerendered <title> stayed Persian. Beyond looking broken, a url whose
     content depends on a viewer setting cannot be shared or indexed — the
     crawler and the reader would see different articles at the same address.
     
     So: /blog/<slug> is always the primary (Persian) edition, /blog/<slug>/<lang>
     is always that language. The interface language styles the chrome around
     the article; it does not choose the article. */
  const post = useMemo(() => {
    const versions = POSTS.filter(p => p.slug === slug);
    if (!versions.length) return null;
    if (urlLang) return versions.find(p => p.lang === urlLang) || null;
    const primary = versions.find(p => p.lang === "fa") || versions[0];
    return primary;
  }, [slug, urlLang]);

  if (!post) return <Navigate to="/blog" replace />;

  const others = POSTS.filter(p => p.slug === slug && p.lang !== post.lang);

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div style={{ marginBottom: 18 }}>
        <Link to="/blog" className="btn-link">← {t("blogAll")}</Link>
      </div>

      {/* dir is per-article, not per-UI: a Persian article stays RTL even if the
          interface is in English, and vice versa. */}
      <article dir={post.dir}>
        <h1 className="page-title" style={{ fontSize: 27, lineHeight: 1.35, marginBottom: 10 }}>{post.title}</h1>
        <div className="meta" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 22 }}>
          <span className="num">{fmtDate(post.date, lang)}</span>
          <span aria-hidden="true">·</span>
          <span><span className="num">{post.readingMinutes}</span> {t("blogMinRead")}</span>
        </div>

        {others.length > 0 && (
          <div className="meta" style={{ marginBottom: 20, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span>{t("blogAlsoIn")}</span>
            {others.map(o => (
              <Link key={o.lang} to={postPath(o.slug, o.lang, o.translations)}
                    className="pill pill-idle hr-link"
                    style={{ textTransform: "uppercase", textDecoration: "none" }}>{o.lang}</Link>
            ))}
          </div>
        )}

        <div className="blog-body" dangerouslySetInnerHTML={{ __html: post.html }} />
      </article>

      <div className="panel panel-pad" style={{ marginTop: 32 }}>
        <div className="panel-title" style={{ marginBottom: 6 }}>{t("blogCtaTitle")}</div>
        <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7, marginBottom: 14 }}>{t("blogCtaBody")}</div>
        <Link to="/register" className="btn btn-primary" style={{ textDecoration: "none" }}>{t("blogCtaAction")}</Link>
      </div>
    </div>
  );
}

export default BlogIndex;
