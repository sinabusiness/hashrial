"use strict";
const net    = require("net");
const crypto = require("crypto");
const { Pool }   = require("pg");
const Redis      = require("ioredis");
const { createUpstreamConnection } = require("./upstream");
const { sessionStore }             = require("./sessions");
const { logger }                   = require("./logger");

(function assertEnv() {
    const required = ["POSTGRES_HOST", "POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD", "REDIS_HOST", "REDIS_PASSWORD", "ANTPOOL_STRATUM", "FEE_SUBACCOUNT", "MAIN_SUBACCOUNT"];
    const missing = required.filter(k => !process.env[k]);
    if (missing.length > 0) { console.error("FATAL: Missing env vars:", missing.join(", ")); process.exit(1); }
})();

const PROXY_PORT = parseInt(process.env.PROXY_PORT || "3333");
const MAX_CONNS_PER_IP = 50;
const ipConnections = new Map();

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
    const remoteIp = socket.remoteAddress || "unknown";
    const ipCount = (ipConnections.get(remoteIp) || 0) + 1;
    if (ipCount > MAX_CONNS_PER_IP) { socket.destroy(); return; }
    ipConnections.set(remoteIp, ipCount);

    const session = {
        id: crypto.randomUUID(), socket, remoteIp, authorized: false, username: null, userId: null,
        workerName: null, buffer: "", upstream: null, extraNonce1: null, extraNonce2Size: 4,
        pendingSubscribeId: undefined, acceptedShares: 0, rejectedShares: 0,
    };

    socket.on("data", (data) => {
        session.buffer += data.toString();
        const lines = session.buffer.split("\n");
        session.buffer = lines.pop();
        for (const line of lines) { if (line.trim()) handleMessage(line.trim()); }
    });

    socket.on("close", () => {
        ipConnections.set(remoteIp, (ipConnections.get(remoteIp) || 1) - 1);
        if (session.upstream) session.upstream.destroy();
    });

    const handleMessage = (line) => {
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
            const r = await pg.query("SELECT id, username FROM users WHERE username = $1", [session.username]);
            if (r.rows.length > 0) session.userId = r.rows[0].id;
        } catch (e) { logger.error("db_user_lookup", { err: e.message }); }
        session.authorized = true;
        if (session.upstream) {
            session.upstream.authorize(`${session.username}.${session.workerName}`, "x");
        }
        sendToMiner(session, { id: msg.id, result: true, error: null });
    }

    function handleSubmit(session, msg) {
        if (!session.authorized) return sendToMiner(session, { id: msg.id, result: false, error: [24, "Unauthorized", null] });
        if (!session.upstream || !session.upstream.connected) return sendToMiner(session, { id: msg.id, result: false, error: [20, "Pool not ready", null] });
        
        session.shareCount = (session.shareCount || 0) + 1;
        const feePercent = parseInt(process.env.FEE_PERCENT || "2");
        const interval = Math.round(100 / feePercent);
        const isFee = session.shareCount % interval === 0;

        if (isFee) {
            const feeSub = process.env.FEE_SUBACCOUNT || "hashrialfee";
            if (msg.params && msg.params.length > 0) {
                msg.params[0] = `${feeSub}.${session.workerName || "default"}`;
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
        }
        
        session.upstream.send(JSON.stringify(msg) + "\n");
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
