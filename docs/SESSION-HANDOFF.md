# Hashrial — session handoff

Written 2026-08-02. Everything below was verified live against the running
system on that date, not recalled. Where something is unverified or an
assumption, it says so.

---

## 0. First thing: you are probably in the wrong directory

Claude Code opens in `/Users/sina/Downloads/hashrial-claude-code`. That is
**not the repo** — it is the changeset drop folder (`apply.sh`, the original
`HANDOFF.md`, a copy of `CLAUDE.md`). It is not a git repository.

**The repo is `/Users/sina/Downloads/hashrial`.** Everything below assumes it.

```bash
cd /Users/sina/Downloads/hashrial
```

`CLAUDE.md` is loaded from the drop folder and is **out of date in one
important way** — see §1.

---

## 1. Corrections to CLAUDE.md

`CLAUDE.md` states the live stack is unresolved and that Antpool is the
upstream. Both were resolved during this work:

| CLAUDE.md says | Actually |
|---|---|
| "nobody has confirmed which pair serves hashrial.com" | **`dashboard/` + `api-worker/`** are live. Verified: Cloudflare Pages project `hashrial` builds `dashboard/build`; `wrangler pages deploy dashboard/build --project-name hashrial` is the deploy path and changes appear on hashrial.com. |
| Antpool field-name gotchas | Still true for `api/`, but the pool has been **migrated to Braiins**. `ACTIVE_POOL = "braiins"` in `api-worker/wrangler.toml`. The Antpool notes are now historical. |
| "apply frontend changes to BOTH" | **Still true and still enforced.** `dashboard/` is live, `pwa/` is not, but they are kept byte-identical so the drift never restarts. Every shared file currently matches. |

The open question about `availableBalance` double-counting completed payouts
is **still open and still must not be "fixed" without asking Sina.**

---

## 2. Live system — verified 2026-08-02

```
repo         /Users/sina/Downloads/hashrial   (clean, on main)
HEAD         3fc1260  fix: the url decides which language edition renders
remote       git@github.com:sinabusiness/hashrial.git  (SSH — no PAT needed)
             origin/main == local HEAD

site         https://hashrial.com                          200
api          https://hashrial-api.wold-brunch-0r.workers.dev
  /health                                                  200
  /public/btcprice                                         200
  /pool/stats                                              200

blog fa      /blog/connect-asic-to-mining-pool-from-iran/   200, Persian
blog en      /blog/connect-asic-to-mining-pool-from-iran/en/ 200, English
sitemap.xml  8 urls
```

Worker config (`api-worker/wrangler.toml`):
```
ACTIVE_POOL     = "braiins"
BRAIINS_ACCOUNT = "hashrial"
ADMIN_USER_IDS  = "6830a5d0-c5fa-4515-bff1-f0badf7a770b"   (Sina)
EMAIL_FROM      = "Hashrial <noreply@hashrial.com>"
FX_OVERRIDES    = '{}'
[triggers] crons = ["*/5 * * * *"]
```

Worker secrets set: `JWT_SECRET, RESEND_API_KEY, SUPABASE_ANON_KEY,
SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, UPSTASH_REDIS_TOKEN,
UPSTASH_REDIS_URL`.

**`BRAIINS_TOKEN` is NOT set.** The Braiins poller therefore does nothing.

---

## 3. Blocked on Sina — nothing else can move until these happen

### 3.1 Run the referral migration (5 minutes, blocking a live 500)

`/dashboard/referral` errors for every user until this runs.

Supabase → SQL Editor → paste the whole of `db/migrations/004_referrals.sql`
→ Run. It is idempotent; running it twice is safe.

It adds `users.referral_code / referred_by / referred_at`, creates the
`referral_earnings` ledger with `UNIQUE(referrer_id, referred_id,
settle_date)`, adds CHECK constraints against self-referral, and backfills a
code for every existing user.

### 3.2 Rotate four exposed credentials

These were pasted into a chat transcript and must be treated as public:

| What | Value prefix | Where to rotate |
|---|---|---|
| GitHub PAT | `github_pat_11AHNCPCI0…` | github.com → Settings → Developer settings → Tokens |
| صراف Resend key | `re_5CD4A4PS_…` | Resend (صراف account) → API Keys |
| Hashrial Resend send-only key | `re_Pd7f5f8e_…` | Resend (Hashrial account) → API Keys, then `wrangler secret put RESEND_API_KEY` |
| Upstash REST token | `gQAAAAAAAjsVAAIg…` | Upstash console → the DB → rotate, then `wrangler secret put UPSTASH_REDIS_TOKEN` |

(`re_7UfRBRwZ_…` was already revoked — that was the one revoked by mistake
in place of the send-only key.)

The remote is SSH, so rotating the PAT breaks nothing here.

### 3.3 Braiins token

After the meeting, from the Braiins pool UI (Settings → Access Profiles →
create a token with read access):

```bash
cd api-worker && npx wrangler secret put BRAIINS_TOKEN
```
then
```bash
node scripts/verify-braiins.js
```
which calls the real endpoints and checks every field name the poller
depends on actually exists in the response. **Do not trust the docs — that
exact mistake is what made the Antpool poller write zero worker rows.**

Then set `ACTIVE_POOL=braiins` in `proxy/.env` too (there is currently no
`proxy/.env` at all — the proxy has never been run against Braiins).

---

## 4. Questions only Braiins can answer

Full list with rationale in `docs/BRAIINS-MEETING.md`. The one that matters
most:

**Does Braiins read `params[0]` (the worker name) on `mining.submit`, or
does it attribute every share to the connection's authorized worker?**

Hashrial's entire 2% fee works by rewriting `params[0]` on every 50th share
to `hashrial.fee-…`. Most Stratum V1 pools ignore `params[0]` and use the
connection identity. **If Braiins ignores it, the fee mechanism does not
work at all** and the revenue model has to change to per-user accounting on
Hashrial's side against a single aggregate figure. This is a
go/no-go-shaped question, not a detail.

Others: is `shares_24h` difficulty-weighted or a raw count; does
`/accounts/workers/json/btc` paginate (matters at >N workers); what
`current_balance` means exactly; worker-name length/truncation rules;
connection and IP limits; whether ports 443 and 25 are reachable from Iran;
and written confirmation that the aggregate-account model is permitted.

---

## 5. What was built (and where it lives)

### Stratum proxy — four silent defects fixed, with tests
`proxy/src/upstream.js`, `proxy/src/proxy.js`

1. **Upstream replies were dropped.** A `mining.submit` response with no
   matching pending id was discarded, so the ASIC never learned whether any
   share was accepted. Now routed via `onReply`.
2. **`mining.set_extranonce` was ignored** — the pool could rotate the
   extranonce and the miner would keep hashing a dead range.
3. **`client.reconnect` was ignored.**
4. **Port 443 was assumed to mean TLS.** Braiins publishes
   `stratum+tcp://stratum.braiins.com:443` — plain TCP on a port that gets
   through restrictive networks, which is exactly why it matters for Iran.
   TLS is now opt-in via `POOL_TLS=true`.

Also: `authorize()` now reports its verdict on reconnect too, and
`session.upstreamAuthorized === false` returns a real error to the miner
instead of silently accepting shares that go nowhere.

Tests: `node scripts/test-proxy-stratum.mjs` (10 tests against a fake pool),
`node scripts/test-braiins-attribution.mjs` (37 tests).

### Braiins naming
`proxy/src/poolConfig.js` — aggregate model, `hashrial.{user}_{worker}`,
fee marker `hashrial.fee-{user}_{worker}`. Braiins' allowed character set is
`[-a-zA-Z0-9_@+:]`; anything else is replaced with `_` and the label is
capped at 60 chars. **A label that still fails validation becomes
`"invalid"` rather than silently falling back to `[auto]`** — a silent
fallback would attribute a user's hashrate to nobody.

### Referral system
1% to the referrer — half of Hashrial's 2% fee.

- `api-worker/src/index.js`: `referralReward()` (pure, tested),
  `creditReferrals()`, `/referral/stats`.
- Crediting is a **delta**: lifetime `earn_total` minus already-credited
  `referred_gross_btc`, upserted with
  `onConflict: "referrer_id,referred_id,settle_date", ignoreDuplicates:
  true`. Re-running the cron cannot double-pay.
- `db/migrations/004_referrals.sql` — **not yet run** (§3.1).
- UI: referral section on the landing page in all 6 languages, plus
  `/dashboard/referral`.
- Tests: `node scripts/test-referral.mjs`, `node scripts/test-referral-crediting.mjs`.

### Blog
Markdown in `content/blog/`, converted at **build** time.

```
scripts/build-blog.mjs      prebuild   md → dashboard+pwa src/blog-data.json
scripts/prerender-blog.mjs  postbuild  one real HTML page per language + sitemap
```

Drafts are excluded from the bundle entirely (metadata only, for the admin
panel) — an unpublished article is not reachable, indexable, or in the
sitemap.

Prerendering exists because **Telegram and WhatsApp link previews do not run
JS**, and that is how these get shared in Iran. Without it every shared link
is a bare URL.

**The URL decides the language edition, never the UI setting.**
`/blog/<slug>` is the Persian edition; `/blog/<slug>/<lang>` is that
language. Letting the interface language pick produced a page whose tab and
body disagreed, and made the url unshareable and unindexable.

Publishing:
```bash
bash scripts/publish-article.sh <slug> [fa|en|all]
bash scripts/publish-article.sh <slug> --unpublish
```
It prints live figures, shows the article's editorial checklist, asks for
confirmation, rebuilds, and deploys. Editing markdown alone changes nothing
on the site.

### Admin panel
`/dashboard/admin`, gated by `ADMIN_USER_IDS` **server-side on every
endpoint** — hiding the nav item is convenience, not the control.
Users / workers / pending payouts / referral totals, payout mark-paid and
mark-failed (with a confirm and a txid prompt), article list, recent users.

Articles are deliberately **read-only** here: publishing stays a file edit
plus a deploy so git history is the audit trail, and so an article cannot be
published without someone reading the fact-check list.

### Dashboard design
Telemetry, not analytics — hashrate is a vital sign with its own panel.
Design system in `dashboard/src/index.css` (`.panel .display .pill .tbl
.rigs .metric-row …`). Every status colour's contrast ratio was **measured**
in both themes; light and dark both pass WCAG AA. BTC price rail fed by
`/public/btcprice` (CoinGecko → Binance → Kraken → Coinbase; Cloudflare
egress IPs get 429 from CoinGecko and 403 from Binance, hence the chain) plus
live IRR from صراف.

### Standing instruction, automated
> "just for articles always fact check the prices with www.صراف.com, and
> network hashrate with antpool and viabtc and poolin and f2pool and
> foundryusa"

```bash
node scripts/fact-check-figures.mjs
```
Also runs automatically inside `publish-article.sh` before any publish.
Saved as a memory (`article-fact-check-sources.md`).

---

## 6. Known-imperfect, deliberately left alone

Each of these is flagged rather than fixed, and why.

- **The landing page advertises "96 ACTIVE WORKERS / 786.7 PH/s"** while the
  real pool has zero of both. This is the highest-priority item on the list
  — it is potentially misleading to prospective users, and Sina asked me not
  to touch the landing page.
- **4 of 6 article files are still `status: "draft"`** — the profitability
  and pool-comparison pieces. They assume **BTC ≈ $110,000 and ≈1,000 EH/s**;
  live figures at time of writing were **$64,780 and ≈866 EH/s**. Every
  worked example in them is wrong until rewritten. Do not publish without
  running the fact-check.
- **Articles mix Persian and Latin numerals** (۱۲۳ vs 123) inconsistently.
- **Repo history rewrite not done.** `git filter-repo` would drop ~140 MiB of
  `builds/hashrial.apk` and old `node_modules` blobs. Destructive and
  rewrites every hash — needs Sina's explicit go-ahead.
- **`api-cron/package.json` points at a `src/index.js` that does not exist.**
  Harmless now that the Worker's own cron trigger does the polling, but it is
  dead weight that reads as if something is scheduled.
- **Braiins' 5-minute window is stored in the `hs_10m` column**, so the
  dashboard's "10m" label will be off by five minutes once real data flows.
- **Worker-offline push notifications** not built — needs `last_share_at`.

---

## 7. Rules that apply to this repo

- **Never commit `node_modules`.** 377 MB of `pwa/node_modules` plus a 26 MB
  iOS tarball once took the repo to 545 MB.
- **`node --check` does not validate JSX** — it silently passes broken JSX.
  Use Babel. There is no local Babel in this repo; borrow it:
  `/Users/sina/Downloads/hashrial-main-2/pwa/node_modules/@babel/core`.
- **`CI=true` turns ESLint warnings into build errors** in CRA. Build with
  `CI=true npm run build` locally or Pages will fail on something that passed
  for you.
- **Upstash SET takes an options object**, `redis.set(k, v, {ex: 5, nx:
  true})` — not ioredis positional args. (`api/` uses real ioredis, where
  positional is correct.)
- **Cloudflare Workers drop un-awaited async work.** Wrap in
  `ctx.waitUntil()`.
- **Secrets never go in committed files.** `wrangler secret put` only;
  `EMAIL_FROM` in the toml is fine, `RESEND_API_KEY` is not.
- **Diff `dashboard/` against `pwa/` whenever you touch frontend code.** They
  are currently identical; that is a property worth keeping.
- Any new UI string needs **all 6 languages** (en, fa, zh, ru, es, pt); fa is
  RTL. BTC formats to 8 decimals. Numbers use `tabular-nums`.

---

## 8. Deploy

```bash
cd dashboard && CI=true npm run build          # prebuild+postbuild do the blog
cd .. && CI=1 npx wrangler pages deploy dashboard/build \
  --project-name hashrial --branch main --commit-dirty=true
```
Worker:
```bash
cd api-worker && npx wrangler deploy
```
A Pages deploy can take a minute to propagate. Compare the bundle hash in the
served HTML if you need to be sure a deploy actually promoted.
