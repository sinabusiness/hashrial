"use strict";
const net    = require("net");
const crypto = require("crypto");
const { Pool }   = require("pg");
const Redis      = require("ioredis");
const { createUpstreamConnection } = require("./upstream");
const { loadPoolConfig, buildUpstreamUsername, buildFeeUsername } = require("./poolConfig");
const { sessionStore }             = require("./sessions");
const { logger }                   = require("./logger");

(function assertEnv() {
    // Pool endpoint vars are validated by loadPoolConfig() below instead —
    // ANTPOOL_STRATUM/MAIN_SUBACCOUNT/FEE_SUBACCOUNT are only required in
    // legacy mode (no ACTIVE_POOL set), not when ACTIVE_POOL=braiins etc.
    const required = ["POSTGRES_HOST", "POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD", "REDIS_HOST", "REDIS_PASSWORD", "JWT_SECRET"];
    const missing = required.filter(k => !process.env[k]);
    if (missing.length > 0) { console.error("FATAL: Missing env vars:", missing.join(", ")); process.exit(1); }
})();

const MAIN_SUBACCOUNT = process.env.MAIN_SUBACCOUNT;

const PROXY_PORT = parseInt(process.env.PROXY_PORT || "3333");
const MAX_CONNS_PER_IP = 20;
const MAX_TOTAL_CONNS = parseInt(process.env.MAX_TOTAL_CONNS || "2000");
const ipConnections = new Map();
let totalConnections = 0;

// Periodic cleanup of stale IP connection entries (every 5 minutes)
setInterval(() => {
    for (const [ip, count] of ipConnections) {
        if (count <= 0) ipConnections.delete(ip);
    }
}, 300000);

const pg = new Pool({
    host: process.env.POSTGRES_HOST, port: parseInt(process.env.POSTGRES_PORT || "5432"),
    database: process.env.POSTGRES_DB, user: process.env.POSTGRES_USER, password: process.env.POSTGRES_PASSWORD,
    max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000,
});

const redis = new Redis({
    host: process.env.REDIS_HOST, port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD, tls: process.env.REDIS_TLS === "true" ? {} : undefined,
    lazyConnect: false, retryStrategy: (t) => Math.min(t * 200, 5000),
});

// ── Upstream pool selection ───────────────────────────────────
// Which pool this proxy forwards to. Set ACTIVE_POOL in .env
// (braiins | antpool | custom). See proxy/src/poolConfig.js.
let POOL;
try {
    POOL = loadPoolConfig();
} catch (e) {
    console.error("FATAL:", e.message);
    process.exit(1);
}

const server = net.createServer((socket) => {
    if (totalConnections >= MAX_TOTAL_CONNS) {
        logger.warn("max_connections_reached", { total: totalConnections, ip: socket.remoteAddress });
        socket.destroy();
        return;
    }
    const remoteIp = socket.remoteAddress || "unknown";
    const ipCount = (ipConnections.get(remoteIp) || 0) + 1;
    if (ipCount > MAX_CONNS_PER_IP) { socket.destroy(); return; }
    ipConnections.set(remoteIp, ipCount);
    totalConnections++;

    const session = {
        id: crypto.randomUUID(), socket, remoteIp, authorized: false, username: null, userId: null,
        workerName: null, buffer: "", upstream: null, extraNonce1: null, extraNonce2Size: 4,
        pendingSubscribeId: undefined, acceptedShares: 0, rejectedShares: 0,
    };

    socket.on("data", (data) => {
        session.buffer += data.toString();
        if (session.buffer.length > 65536) {
            logger.warn("buffer_overflow", { sessionId: session.id, ip: session.remoteIp });
            session.buffer = "";
            socket.destroy();
            return;
        }
        const lines = session.buffer.split("\n");
        session.buffer = lines.pop();
        for (const line of lines) { if (line.trim()) handleMessage(line.trim()); }
    });

    socket.on("close", () => {
        ipConnections.set(remoteIp, (ipConnections.get(remoteIp) || 1) - 1);
        totalConnections = Math.max(0, totalConnections - 1);
        if (session.upstream) session.upstream.destroy();
    });

        const handleMessage = (line) => {
        if (line.length > 4096) {
            logger.warn("oversized_message", { sessionId: session.id, len: line.length });
            return;
        }
        let msg;
        try { msg = JSON.parse(line); } catch (e) { return; }
        const method = msg.method;
        if (method === "mining.subscribe") handleSubscribe(session, msg);
        else if (method === "mining.authorize") handleAuthorize(session, msg);
        else if (method === "mining.submit") handleSubmit(session, msg);
        else if (session.upstream) session.upstream.send(JSON.stringify(msg) + "\n");
    };

    function handleSubscribe(session, msg) {
        session.pendingSubscribeId = msg.id;
        initUpstream(session); 
    }

    function initUpstream(session) {
        if (session.upstream) return;
        session.upstream = createUpstreamConnection({
            host: POOL.host, port: POOL.port, name: POOL.name, sessionId: session.id,
            onNotify: (msg) => sendToMiner(session, msg),
            onSetDifficulty: (msg) => sendToMiner(session, msg),
            // The pool can hand out a new extranonce1 mid-session, and always
            // does after a reconnect. A miner left on the stale one searches a
            // range another miner already owns, so its shares are rejected
            // upstream while the local counter still credits them — silent
            // mispayment. Pass it straight through.
            onExtraNonce: (m) => {
                if (Array.isArray(m.params) && m.params.length) {
                    session.extraNonce1 = m.params[0] || session.extraNonce1;
                    if (m.params.length > 1) session.extraNonce2Size = m.params[1];
                }
                sendToMiner(session, m);
            },
            // A pool-initiated move is not something a proxy can usefully
            // forward — the miner would reconnect to us, not to the new host.
            // Drop the downstream socket so the ASIC re-subscribes cleanly and
            // picks up fresh state instead of mining on stale jobs.
            onReconnect: () => {
                logger.warn("upstream_requested_reconnect", { session: session.id });
                if (session.socket && !session.socket.destroyed) session.socket.destroy();
            },
            onSubscribe: (result) => {
                if (result && Array.isArray(result.result)) {
                    const [subIds, en1, en2size] = result.result;
                    session.extraNonce1 = en1 || "00000000";
                    session.extraNonce2Size = en2size || 4;
                    if (session.pendingSubscribeId !== undefined) {
                        sendToMiner(session, { id: session.pendingSubscribeId, result: [subIds, session.extraNonce1, session.extraNonce2Size], error: null });
                        delete session.pendingSubscribeId;
                    }
                }
            },
            onDisconnect: () => logger.warn("upstream_disconnected", { sessionId: session.id }),
        });
        session.upstream.connect(); 
    }

    async function handleAuthorize(session, msg) {
        let workerString = (msg.params?.[0] || "").toString().slice(0, 256);
        if (!workerString || !workerString.match(/^[a-zA-Z0-9._\-]{1,256}$/)) {
            return sendToMiner(session, { id: msg.id, result: false, error: [20, "Invalid worker name format", null] });
        }
        const dotIdx = workerString.indexOf(".");
        session.username = dotIdx >= 0 ? workerString.slice(0, dotIdx) : workerString;
        session.workerName = dotIdx >= 0 ? workerString.slice(dotIdx + 1) : "default";
        try {
            const r = await pg.query("SELECT id, username, pool_index FROM users WHERE username = $1", [session.username]);
            if (r.rows.length > 0) {
                session.userId = r.rows[0].id;
                session.poolIndex = r.rows[0].pool_index || 1;
                session.authorized = true;
                // Cache in Redis for DB outage resilience (1 hour TTL)
                try { await redis.set(`auth:${session.username}`, JSON.stringify({ userId: session.userId, poolIndex: session.poolIndex }), "EX", 3600); } catch {}
            } else {
                // Check Redis cache as fallback
                try {
                    const cached = await redis.get(`auth:${session.username}`);
                    if (cached) {
                        const parsed = JSON.parse(cached);
                        session.userId = parsed.userId;
                        session.poolIndex = parsed.poolIndex || 1;
                        session.authorized = true;
                    }
                } catch {}
                if (!session.authorized) {
                    logger.warn("authorize_unknown_user", { username: session.username, ip: session.remoteIp });
                    return sendToMiner(session, { id: msg.id, result: false, error: [21, "User not found", null] });
                }
            }
        } catch (e) {
            // DB down — try Redis cache as fallback
            try {
                const cached = await redis.get(`auth:${session.username}`);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    session.userId = parsed.userId;
                    session.poolIndex = parsed.poolIndex || 1;
                    session.authorized = true;
                }
            } catch {}
            if (!session.authorized) {
                logger.error("db_user_lookup", { err: e.message });
                return sendToMiner(session, { id: msg.id, result: false, error: [21, "Internal error", null] });
            }
        }
        if (session.upstream) {
            // Username format depends on the active pool's model — a
            // sharded pool (per-user sub-accounts, current Antpool setup)
            // vs a single aggregate account (the Braiins model). See
            // poolConfig.js for the full explanation of both.
            const upstreamUser = buildUpstreamUsername(POOL, session);
            /* The miner is authorized against Hashrial's own DB, which is the
               right gate for letting it connect — but the UPSTREAM verdict was
               being thrown away. A typo'd or suspended pool account looked
               identical to a healthy one while every share failed silently.
               Accept the miner immediately (making it wait on a round trip
               would stall the connection), but record the upstream answer so a
               failure is visible and submits can say something true. */
            session.upstream.authorize(upstreamUser, "x", (ok, err) => {
                session.upstreamAuthorized = ok;
                if (!ok) {
                    logger.error("upstream_authorize_failed", {
                        user: upstreamUser, pool: POOL.name,
                        err: Array.isArray(err) ? err[1] : err,
                    });
                }
            });
            logger.info("upstream_authorize", { user: upstreamUser, pool: POOL.name, ip: session.remoteIp });
        }
        sendToMiner(session, { id: msg.id, result: true, error: null });
    }

    async function handleSubmit(session, msg) {
        if (!session.authorized) return sendToMiner(session, { id: msg.id, result: false, error: [24, "Unauthorized", null] });
        if (!session.upstream || !session.upstream.connected) return sendToMiner(session, { id: msg.id, result: false, error: [20, "Pool not ready", null] });
        // Explicitly false means the pool REJECTED our account. Saying so beats
        // relaying shares that will all fail for a reason the miner cannot see.
        if (session.upstreamAuthorized === false) return sendToMiner(session, { id: msg.id, result: false, error: [24, "Pool rejected pool account", null] });
        
        const feePercent = parseInt(process.env.FEE_PERCENT || "2");
        const interval = Math.round(100 / feePercent);

        // Use Redis cumulative counter per user+worker (survives reconnects)
        let isFee = false;
        if (session.userId) {
            const shareKey = `shares:${session.userId}:${session.workerName || "default"}`;
            try {
                const shareCount = await redis.incr(shareKey);
                // Set TTL of 7 days so keys don't live forever
                if (shareCount === 1) await redis.expire(shareKey, 604800);
                isFee = shareCount % interval === 0;
            } catch (e) {
                logger.error("redis_share_count_err", { err: e.message });
                // Fallback to session counter if Redis fails
                session.shareCount = (session.shareCount || 0) + 1;
                isFee = session.shareCount % interval === 0;
            }
        } else {
            session.shareCount = (session.shareCount || 0) + 1;
            isFee = session.shareCount % interval === 0;
        }

        // Clone msg to avoid mutating the original
        const outgoing = { ...msg, params: msg.params ? [...msg.params] : [] };

        if (isFee) {
            if (outgoing.params && outgoing.params.length > 0) {
                outgoing.params[0] = buildFeeUsername(POOL, session);
            }
            if (session.userId) {
                pg.query(
                    `INSERT INTO fee_shares (user_id, worker_name, session_id, count, last_updated)
                     VALUES ($1, $2, $3, 1, NOW())
                     ON CONFLICT (user_id, worker_name, session_id)
                     DO UPDATE SET count = fee_shares.count + 1, last_updated = NOW()`,
                    [session.userId, session.workerName || "default", session.id]
                ).catch(e => logger.error("db_fee_share_update_err", { err: e.message }));
            }
            logger.info("fee_share", { user: session.username, worker: session.workerName });
        }
        
        /* Relay under the upstream's own id space and return the pool's verdict
           to the ASIC. Previously this fired the miner's id at the pool and
           registered no callback, so the reply matched nothing and was dropped:
           the miner saw zero accepted shares forever, and cgminer-family
           firmware treats sustained unanswered submits as a dead pool and fails
           over to the backup. Hashrate would quietly leave. */
        session.upstream.relay(outgoing, (reply) => {
            if (!reply) return;
            sendToMiner(session, { id: msg.id, result: reply.result === true, error: reply.error || null });
            if (reply.result === true) {
                session.acceptedShares = (session.acceptedShares || 0) + 1;
            } else {
                session.rejectedShares = (session.rejectedShares || 0) + 1;
                // A rejection the pool gave a reason for is worth seeing — this
                // is how stale-share and extranonce problems announce themselves.
                logger.warn("share_rejected", {
                    user: session.username, worker: session.workerName,
                    err: Array.isArray(reply.error) ? reply.error[1] : reply.error,
                });
            }
        });
    }

    function sendToMiner(session, msg) {
        if (session.socket && !session.socket.destroyed) session.socket.write(JSON.stringify(msg) + "\n");
    }
});

logger.info("active_pool", { pool: POOL.name, host: POOL.host, port: POOL.port, sharded: POOL.sharded, account: POOL.accountName });
server.listen(PROXY_PORT, () => logger.info(`Hashrial proxy v3.1 on :${PROXY_PORT}`));

// ── Health check endpoint ────────────────────────────────────
const healthServer = net.createServer((socket) => {
  socket.write('HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nOK');
  socket.end();
});
healthServer.listen(3334, () => logger.info(`Health check on :3334`));

// ── Graceful shutdown ────────────────────────────────────────
process.on('SIGTERM', () => {
  logger.info('shutdown', { reason: 'SIGTERM' });
  server.close(() => {
    pg.end();
    redis.quit();
    logger.info('shutdown', { status: 'complete' });
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
});

process.on('SIGINT', () => {
  logger.info('shutdown', { reason: 'SIGINT' });
  server.close(() => {
    pg.end();
    redis.quit();
    logger.info('shutdown', { status: 'complete' });
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
});
