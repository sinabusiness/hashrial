"use strict";
const net    = require("net");
const crypto = require("crypto");
const { Pool }   = require("pg");
const Redis      = require("ioredis");
const { createUpstreamConnection } = require("./upstream");
const { sessionStore }             = require("./sessions");
const { logger }                   = require("./logger");

(function assertEnv() {
    const required = ["POSTGRES_HOST", "POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD", "REDIS_HOST", "REDIS_PASSWORD", "ANTPOOL_STRATUM", "FEE_SUBACCOUNT", "MAIN_SUBACCOUNT", "JWT_SECRET"];
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

const ANTPOOL_HOST = (process.env.ANTPOOL_STRATUM || "ss.antpool.com:3333").split(":")[0];
const ANTPOOL_PORT = parseInt((process.env.ANTPOOL_STRATUM || "ss.antpool.com:3333").split(":")[1] || "3333");

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
            host: ANTPOOL_HOST, port: ANTPOOL_PORT, name: "main", sessionId: session.id,
            onNotify: (msg) => sendToMiner(session, msg),
            onSetDifficulty: (msg) => sendToMiner(session, msg),
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
            // Antpool expects: hashrial{poolIndex}.username.workerName
            const subAccount = `hashrial${session.poolIndex || 1}.${session.username}`;
            const upstreamUser = `${subAccount}.${session.workerName}`;
            session.upstream.authorize(upstreamUser, "x");
            logger.info("upstream_authorize", { user: upstreamUser, ip: session.remoteIp });
        }
        sendToMiner(session, { id: msg.id, result: true, error: null });
    }

    async function handleSubmit(session, msg) {
        if (!session.authorized) return sendToMiner(session, { id: msg.id, result: false, error: [24, "Unauthorized", null] });
        if (!session.upstream || !session.upstream.connected) return sendToMiner(session, { id: msg.id, result: false, error: [20, "Pool not ready", null] });
        
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
            const feeSub = process.env.FEE_SUBACCOUNT || "hashrialfee";
            // Antpool expects: FEE_SUBACCOUNT.workerName for fee shares
            if (outgoing.params && outgoing.params.length > 0) {
                outgoing.params[0] = `${feeSub}.${session.workerName || "default"}`;
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
        
        session.upstream.send(JSON.stringify(outgoing) + "\n");
    }

    function sendToMiner(session, msg) {
        if (session.socket && !session.socket.destroyed) session.socket.write(JSON.stringify(msg) + "\n");
    }
});

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
