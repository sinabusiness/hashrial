"use strict";
const crypto = require("crypto");
const https  = require("https");

const ANTPOOL_API_BASE  = process.env.ANTPOOL_API_BASE  || "https://antpool.com/api";
const POLL_INTERVAL_MS  = parseInt(process.env.API_POLL_INTERVAL_MS || "120000");
const MAX_CONCURRENCY   = 5;
const CYCLE_TIMEOUT_MS  = Math.floor(POLL_INTERVAL_MS * 0.9);

let pollRunning = false;

// ── Antpool HMAC auth ─────────────────────────────────────────
function makeAuth(userId) {
    const apiKey    = process.env.ANTPOOL_API_KEY;
    const apiSecret = process.env.ANTPOOL_API_SECRET;
    const nonce     = crypto.randomBytes(16).toString("hex");
    const sig       = crypto.createHmac("sha256", apiSecret)
        .update(userId + apiKey + nonce).digest("hex").toUpperCase();
    return { key: apiKey, nonce, signature: sig, coin: process.env.COIN_TYPE || "BTC" };
}

// ── HTTP POST helper (no external deps) ──────────────────────
function antpoolPost(endpoint, body) {
    return new Promise((resolve, reject) => {
        const formBody = Object.keys(body)
            .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(body[k])}`).join("&");
        const url = new URL(`${ANTPOOL_API_BASE}/${endpoint}`);
        const options = {
            hostname: url.hostname,
            path:     url.pathname + url.search,
            method:   "POST",
            timeout:  10000,
            headers:  {
                "Content-Type":   "application/x-www-form-urlencoded",
                "Content-Length": Buffer.byteLength(formBody),
            },
        };
        const req = https.request(options, (res) => {
            let data = "";
            res.on("data", c => data += c);
            res.on("end", () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error(`antpool parse error on ${endpoint}`)); }
            });
        });
        req.on("error",   reject);
        req.on("timeout", () => { req.destroy(); reject(new Error(`antpool timeout on ${endpoint}`)); });
        req.write(formBody);
        req.end();
    });
}

// ── Sanity limits (kept as-is — good defensive addition) ──────
const MAX_HASHRATE_THS     = 1000000; // 1 EH/s — sanity cap
const MAX_EARNINGS_BTC     = 1000000;
const MAX_WORKERS_PER_USER = 5000;

// ── Poll one user ─────────────────────────────────────────────
async function pollUser(pg, redis, user) {
    const poolIndex        = user.pool_index || 1;
    const subAccountPrefix = `hashrial${poolIndex}`;
    const subAccount       = `${subAccountPrefix}.${user.username}`;

    try {
        // ── 1. Account balance & earnings (account.htm) ───────
        // FIX: correct field names — Antpool account.htm returns
        // balance / earn24Hours / earnTotal / paidOut (NOT totalAmount/paidAmount)
        const acct = await antpoolPost("account.htm", {
            ...makeAuth(subAccountPrefix),
            userId: subAccount,
        });
        const acctData = acct?.data || {};

        if (acct?.code !== undefined && acct.code !== 0) {
            console.error(`[poller] ${user.username}: Antpool account.htm error code ${acct.code}`);
            return;
        }

        const rawBalance   = parseFloat(acctData.balance     || 0);
        const rawEarn24h   = parseFloat(acctData.earn24Hours || 0);
        const rawEarnTotal = parseFloat(acctData.earnTotal   || 0); // was acctData.totalAmount — wrong field
        const rawPaidOut   = parseFloat(acctData.paidOut     || 0); // was acctData.paidAmount  — wrong field

        const balance   = isFinite(rawBalance)   && rawBalance   >= 0 && rawBalance   < MAX_EARNINGS_BTC ? rawBalance   : 0;
        const earn24h   = isFinite(rawEarn24h)   && rawEarn24h   >= 0 && rawEarn24h   < MAX_EARNINGS_BTC ? rawEarn24h   : 0;
        const earnTotal = isFinite(rawEarnTotal) && rawEarnTotal >= 0 && rawEarnTotal < MAX_EARNINGS_BTC ? rawEarnTotal : 0;
        const paidOut   = isFinite(rawPaidOut)   && rawPaidOut   >= 0 && rawPaidOut   < MAX_EARNINGS_BTC ? rawPaidOut   : 0;

        if (rawBalance !== balance || rawEarn24h !== earn24h) {
            console.warn(`[poller] ${user.username}: sanity clamp triggered (balance=${rawBalance}, earn24h=${rawEarn24h})`);
        }

        await pg.query(
            `INSERT INTO earnings_history (user_id, balance, earn_24h, earn_total, paid_out)
             VALUES ($1,$2,$3,$4,$5)`,
            [user.id, balance, earn24h, earnTotal, paidOut]
        );

        // ── 2. Hashrate (hashrate.htm) — SEPARATE ENDPOINT ────
        // FIX: account.htm has NO hashrate fields whatsoever — hsLast10m/hsLast1h/
        // activeWorker were being read from the wrong response and always evaluated
        // to 0. This call was completely missing before; it is now added.
        const hr = await antpoolPost("hashrate.htm", {
            ...makeAuth(subAccountPrefix),
            userId: subAccount,
        });
        const hrData = hr?.data || {};

        const rawHs10m = parseFloat(hrData.last10m       || 0); // was acctData.hsLast10m — nonexistent field
        const rawHs1h  = parseFloat(hrData.last1h        || 0); // was acctData.hsLast1h  — nonexistent field
        const rawHs1d  = parseFloat(hrData.last1d        || 0); // was acctData.hsLast1d  — nonexistent field
        const hs10m = isFinite(rawHs10m) && rawHs10m >= 0 && rawHs10m < MAX_HASHRATE_THS ? rawHs10m : 0;
        const hs1h  = isFinite(rawHs1h)  && rawHs1h  >= 0 && rawHs1h  < MAX_HASHRATE_THS ? rawHs1h  : 0;
        const hs1d  = isFinite(rawHs1d)  && rawHs1d  >= 0 && rawHs1d  < MAX_HASHRATE_THS ? rawHs1d  : 0;
        const activeWorkers = Math.max(0, Math.min(MAX_WORKERS_PER_USER, parseInt(hrData.activeWorkers || 0))); // was acctData.activeWorker (singular, wrong endpoint)

        await pg.query(
            `INSERT INTO hashrate_history (user_id, worker_name, hs_10m, hs_1h, hs_1d, active_workers)
             VALUES ($1, NULL, $2, $3, $4, $5)`,
            [user.id, hs10m, hs1h, hs1d, activeWorkers]
        );

        // ── 3. Worker rows (workers.htm) ───────────────────────
        // FIX-A: container key is `data.rows`, not `data.workers` (which never existed —
        //        workerRows was always [] regardless of the per-row field bug below)
        // FIX-B: per-row fields — worker/last10m/last1h/last1d/accepted/stale
        //        (was worker_name/hsLast10m/hsLast1h/shares/staleShares — none of these exist,
        //        so wName was always "" and every row was silently skipped)
        const workers = await antpoolPost("workers.htm", {
            ...makeAuth(subAccountPrefix),
            userId: subAccount,
            pageEnable: 0,
        });
        const workerRows = (workers?.data?.rows || []).slice(0, MAX_WORKERS_PER_USER);

        let processedWorkers = 0;
        for (const w of workerRows) {
            const rawName = (w.worker || "").toString(); // was w.worker_name || w.workerId — neither exists
            const wName   = (rawName.includes(".") ? rawName.split(".").slice(1).join(".") : rawName).slice(0, 128);
            if (!wName) continue;
            if (processedWorkers >= MAX_WORKERS_PER_USER) break;

            const rawWHs10m = parseFloat(w.last10m  || 0); // was w.hsLast10m — wrong
            const rawWHs1h  = parseFloat(w.last1h   || 0); // was w.hsLast1h  — wrong
            const rawWHs1d  = parseFloat(w.last1d   || 0); // was w.hsLast1d  — wrong
            const wHs10m = isFinite(rawWHs10m) && rawWHs10m >= 0 && rawWHs10m < MAX_HASHRATE_THS ? rawWHs10m : 0;
            const wHs1h  = isFinite(rawWHs1h)  && rawWHs1h  >= 0 && rawWHs1h  < MAX_HASHRATE_THS ? rawWHs1h  : 0;
            const wHs1d  = isFinite(rawWHs1d)  && rawWHs1d  >= 0 && rawWHs1d  < MAX_HASHRATE_THS ? rawWHs1d  : 0;
            const wAcc   = Math.max(0, parseInt(w.accepted || 0)); // was w.shares      — wrong
            const wStale = Math.max(0, parseInt(w.stale    || 0)); // was w.staleShares — wrong
            const status = wHs10m > 0 ? "online" : "offline";

            await pg.query(
                `INSERT INTO workers (user_id, worker_name, status, last_seen)
                 VALUES ($1,$2,$3,NOW())
                 ON CONFLICT (user_id, worker_name)
                 DO UPDATE SET status=$3, last_seen=NOW()`,
                [user.id, wName, status]
            );

            await pg.query(
                `INSERT INTO hashrate_history (user_id, worker_name, hs_10m, hs_1h, hs_1d, accepted, stale)
                 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                [user.id, wName, wHs10m, wHs1h, wHs1d, wAcc, wStale]
            );
            processedWorkers++;
        }

        // Mark workers offline if not refreshed in 5+ minutes
        if (processedWorkers > 0) {
            await pg.query(
                `UPDATE workers SET status='offline'
                 WHERE user_id=$1 AND status='online'
                 AND last_seen < NOW() - INTERVAL '5 minutes'`,
                [user.id]
            );
        }

        // ── 4. Cache overview in Redis ──────────────────────────
        const overviewKey = `pool:overview:${user.username}`;
        await redis.set(overviewKey, JSON.stringify({
            earnings: { balance, earn24h, earnTotal, paidOut },
            hashrate: { hs_10m: hs10m, hs_1h: hs1h, hs_1d: hs1d, active_workers: activeWorkers, accepted: 0, stale: 0 },
        }), "EX", Math.floor(POLL_INTERVAL_MS / 1000) + 30);

        await redis.del(`pool:workers:${user.username}`);

        console.log(`[poller] ${user.username}: balance=${balance} BTC, hs10m=${hs10m} TH/s, workers=${processedWorkers}/${workerRows.length}`);
    } catch (e) {
        console.error(`[poller] ${user.username} error:`, e.message);
    }
}

// ── Run one full poll cycle with bounded concurrency ─────────
async function runPoll(pg, redis) {
    if (pollRunning) { console.warn("[poller] Skipping cycle — previous still running"); return; }
    pollRunning = true;

    const timer = setTimeout(() => {
        console.error("[poller] Cycle timeout — forcing unlock");
        pollRunning = false;
    }, CYCLE_TIMEOUT_MS);

    try {
        const { rows: activeUsers } = await pg.query(`
            SELECT DISTINCT u.id, u.username, u.pool_index
            FROM users u
            INNER JOIN workers w ON w.user_id = u.id AND w.status = 'online'
        `);

        const { rows: dormantUsers } = await pg.query(`
            SELECT DISTINCT u.id, u.username, u.pool_index
            FROM users u
            LEFT JOIN workers w ON w.user_id = u.id AND w.status = 'online'
            WHERE w.id IS NULL
              AND u.last_login > NOW() - INTERVAL '24 hours'
            LIMIT 100
        `);

        const users = [...activeUsers, ...dormantUsers];
        for (let i = 0; i < users.length; i += MAX_CONCURRENCY) {
            const batch = users.slice(i, i + MAX_CONCURRENCY);
            await Promise.all(batch.map(u => pollUser(pg, redis, u)));
        }

        const w = await pg.query("SELECT COUNT(*) FROM workers WHERE status='online'");
        const u = await pg.query("SELECT COUNT(*) FROM users");
        await redis.set("pool:stats", JSON.stringify({
            totalUsers:    parseInt(u.rows[0].count),
            activeWorkers: parseInt(w.rows[0].count),
        }), "EX", 120);
    } catch (e) {
        console.error("[poller] Cycle error:", e.message);
    } finally {
        clearTimeout(timer);
        pollRunning = false;
    }
}

function startAntpoolPoller(pg, redis) {
    setTimeout(() => runPoll(pg, redis), 5000);
    setInterval(() => runPoll(pg, redis), POLL_INTERVAL_MS);
    console.log(`[poller] Started — interval ${POLL_INTERVAL_MS / 1000}s, concurrency ${MAX_CONCURRENCY}`);
}

module.exports = { startAntpoolPoller };
