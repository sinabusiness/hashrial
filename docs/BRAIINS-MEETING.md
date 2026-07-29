# Braiins call — technical brief

**Thu 13:00 CEST / 14:30 GMT+3:30 — Lukáš Krejčí (CTO), Will Baxter (CCO)**

Lukáš already described the model in his email:

> you keep your own frontend and proxy, point the aggregated hashrate at a single
> Braiins Pool account, and your user accounts, fees and payouts stay entirely on
> your side

That is exactly what Hashrial is now built for. This brief covers what is already
working, and the specific things only Braiins can answer — several of which
decide whether users get paid the right amount.

---

## 1. What Hashrial already does (so you can be concrete)

The proxy authorises every miner against one Braiins account, encoding the
Hashrial user inside the worker label:

| | sent to Braiins |
|---|---|
| user `alice`, rig `rig01` | `hashrial.alice_rig01` |
| the 2% fee share | `hashrial.fee-alice_rig01` |

- Endpoint `stratum.braiins.com:3333` (alternates 443, 25)
- Every 50th share is re-labelled to the `fee-` marker. In an aggregate account
  the fee is not a separate payee — it is simply the slice Hashrial does not
  redistribute — so tagging keeps it out of the per-user split and leaves an
  auditable trail in your own worker list.
- The backend polls `/accounts/profile/json/btc/` and
  `/accounts/workers/json/btc`, parses the labels back into users, and splits the
  account balance by each user's `shares_24h`.
- **Two API calls per 5-minute cycle, regardless of user count.** Deliberate,
  because of the documented ~1 request / 5 seconds limit.

Ask Lukáš to sanity-check the labelling scheme before anything else — everything
downstream depends on those labels round-tripping.

---

## 2. Questions that decide whether users get paid correctly

**These are the ones worth the meeting time.**

### 2.1 Is `shares_24h` a raw count, or difficulty-weighted?
The revenue split is `user_shares / total_shares`. If it is a **raw count** and
Braiins runs vardiff per connection, then a miner on high difficulty submits
fewer shares for the same work and **would be systematically underpaid**. If it
is difficulty-weighted (or all connections share one difficulty), the split is
fair as built.

*If raw count: ask whether a difficulty-weighted or "score" field is available.
`hash_rate_scoring` appears in the worker payload — what exactly is it?*

### 2.2 Does `/accounts/workers/json/btc` paginate?
A forwarding pool could have thousands of workers on one account. If that
endpoint caps or pages, attribution silently drops everyone past the cap and
those users are paid nothing. **Confirm whether it returns all workers, and what
happens at 1,000 / 10,000.**

### 2.3 When does `current_balance` change, and what moves it?
Needed to distinguish "earned" from "already paid":
- What is the settlement boundary, and in which timezone? (Antpool's day starts
  08:00 Beijing and its UI never says so — that has burned people.)
- On payout, does `current_balance` **decrease**? Hashrial's own accounting
  depends on knowing whether the pool balance is gross or net of payouts.
- `all_time_reward` vs `today_reward` vs `estimated_reward` — exact definitions.

### 2.4 Worker name limits
We send `account.user_worker`, currently capped at 60 characters for the label.
- Max length Braiins accepts, and does it **truncate or reject**?
- Allowed characters — underscore and hyphen both fine?
- Max workers per account?
- Silent truncation would collide two users into one label, which is the worst
  failure mode here.

### 2.5 Connection limits
- Max concurrent stratum connections on a single account?
- Any per-IP limit? All Hashrial traffic arrives from one proxy IP.

---

## 3. Operational

- **API rate limit** — docs say ~1 req/5s with IP bans for sustained overuse.
  Confirm, and ask whether partners get a higher ceiling. Two calls per five
  minutes is comfortable, but per-worker polling would not be.
- **API token** — generated per access profile (Settings → Access Profiles →
  "Allow access to web APIs"). Confirm read-only tokens exist; the backend only
  reads, and a send/write-capable token should not be sitting in a Worker.
- **Endpoint** — docs say the regional URLs (eu./us./sg.) are deprecated in
  favour of one global `stratum.braiins.com`. Confirm, and confirm ports 443
  and 25 still work. **This matters for Iran specifically** — 3333 is commonly
  blocked, so the alternates are not a nicety.
- **FPPS** — what is the payout scheme and Braiins' own commission on it? That
  is the number Hashrial's 2% sits on top of.
- **Is the aggregate model officially supported?** Ask plainly whether one
  account fronting many end users is fine under their terms, and whether there
  is a partner/proxy-pool programme with different terms or support.
- **Support path** for production issues, and whether there is a status/incident
  feed to watch.

---

## 4. Things to raise, not ask

- Hashrial keeps its own authoritative per-user record (share counters, fee
  shares, hashrate history). Braiins does not need to know about individual
  users — matches what Lukáš described.
- Hashrial's users are largely in Iran and MENA. Worth mentioning early:
  it drives the port question, and possibly sanctions/compliance questions that
  are better raised by you than discovered later.
- Current scale: 17 registered users, 0 currently mining. Small, so switching
  now costs nothing — a good moment to change upstream.

---

## 5. Immediately after the call

```bash
# 1. token from Settings -> Access Profiles -> Allow access to web APIs
cd api-worker && wrangler secret put BRAIINS_TOKEN

# 2. verify the live response matches what the poller reads.
#    Do NOT skip: field names here are from docs, not a real response, and
#    trusting docs over reality is exactly why Antpool wrote zero worker rows
#    for months.
BRAIINS_TOKEN=xxxx node scripts/verify-braiins.js

# 3. point the proxy at the real account
#    proxy/.env:  ACTIVE_POOL=braiins
#                 BRAIINS_ACCOUNT=<the account name Braiins gives you>
```

`ACTIVE_POOL=braiins` is already set in `api-worker/wrangler.toml` and
`.env.example`. The poller stays inert until `BRAIINS_TOKEN` exists, so nothing
breaks in the meantime.

**`verify-braiins.js` must pass before real balances depend on it.** It checks
every field the poller reads, and confirms worker labels parse back to real
Hashrial usernames — the single assumption the whole aggregate model rests on.
