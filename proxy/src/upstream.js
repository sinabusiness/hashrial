"use strict";
const net = require("net");
const tls = require("tls");
const { logger } = require("./logger");

function createUpstreamConnection({ host, port, name, sessionId, onNotify, onSetDifficulty, onSubscribe, onDisconnect }) {
    let socket = null, buf = "", msgId = 1;
    const pending = new Map();
    let authorized = false, destroyed = false, authWorker = null, authPass = null, connected = false, connecting = false;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_DELAY = 30000;
    const reconnectTimer = { current: null };

    function connect() {
        if (destroyed || connecting || (socket && !socket.destroyed)) return;
        buf = ""; // Reset buffer on each new connection
        connecting = true;
        const isTls = port === 443 || process.env.ANTPOOL_STRATUM_SSL === "true";
        if (isTls) {
            const tls_opts = {
                host, port,
                rejectUnauthorized: process.env.DISABLE_TLS_VERIFY !== "true",
                servername: host,
            };
            socket = tls.connect(tls_opts);
            if (process.env.DISABLE_TLS_VERIFY !== "true") {
                logger.info("upstream_tls_enabled", { host, port });
            }
        } else {
            socket = net.connect({ host, port });
        }
        socket.setKeepAlive(true, 15000); socket.setNoDelay(true); socket.setTimeout(120000);

        socket.on("connect", () => {
            connected = true; connecting = false;
            reconnectAttempts = 0; // Reset backoff on successful connection
            doSubscribe();
        });

        socket.on("data", (d) => {
            buf += d.toString();
            if (buf.length > 65536) { socket.destroy(); return; }
            const lines = buf.split("\n"); buf = lines.pop();
            for (const l of lines) {
                const t = l.trim(); if (!t) continue;
                try { handle(JSON.parse(t)); } catch (_) {}
            }
        });

        socket.on("close", () => {
            connected = false; connecting = false;
            if (destroyed) return;
            onDisconnect();
            // Auto-reconnect with exponential backoff
            reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), MAX_RECONNECT_DELAY);
            logger.info("upstream_reconnect_scheduled", { sessionId, delay, attempt: reconnectAttempts });
            reconnectTimer.current = setTimeout(() => {
                if (!destroyed) connect();
            }, delay);
        });
        socket.on("error", (e) => { connecting = false; logger.warn("upstream_err", { err: e.message }); });
        socket.on("timeout", () => { connecting = false; socket.destroy(); });
    }

    function doSubscribe() {
        const id = msgId++;
        const msg = { id, method: "mining.subscribe", params: ["cpuminer/1.0"] };
        pending.set(id, (res) => {
            if (onSubscribe) onSubscribe(res);
            if (authWorker) {
                const authMsg = { id: msgId++, method: "mining.authorize", params: [authWorker, authPass] };
                send(JSON.stringify(authMsg));
            }
        });
        send(JSON.stringify(msg));
    }

    function send(data) { if (socket && !socket.destroyed) socket.write(data + "\n"); }

    function handle(msg) {
        if (msg.id != null && !msg.method) {
            const cb = pending.get(msg.id);
            if (cb) { pending.delete(msg.id); cb(msg); }
            return;
        }
        if (msg.method === "mining.notify") onNotify(msg);
        else if (msg.method === "mining.set_difficulty") onSetDifficulty(msg);
    }

    return {
        connect, send,
        authorize: (worker, pass) => {
            authWorker = worker; authPass = pass;
            if (connected) {
                const msg = { id: msgId++, method: "mining.authorize", params: [worker, pass] };
                send(JSON.stringify(msg));
            }
        },
        destroy: () => {
            destroyed = true;
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            if (socket) socket.destroy();
        },
        get connected() { return connected; },
    };
}
module.exports = { createUpstreamConnection };
