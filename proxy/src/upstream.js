"use strict";
const net = require("net");
const tls = require("tls");
const { logger } = require("./logger");

function createUpstreamConnection({ host, port, name, sessionId, onNotify, onSetDifficulty, onSubscribe, onDisconnect, onReply, onExtraNonce, onReconnect }) {
    let socket = null, buf = "", msgId = 1;
    const pending = new Map();
    let authorized = false, destroyed = false, authWorker = null, authPass = null, connected = false, connecting = false;
    // Retained across reconnects so the re-authorize on a fresh socket reports
    // its verdict too, not just the first one.
    let authCb = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_DELAY = 30000;
    const reconnectTimer = { current: null };

    function connect() {
        if (destroyed || connecting || (socket && !socket.destroyed)) return;
        buf = ""; // Reset buffer on each new connection
        connecting = true;
        // Port 443 does NOT imply TLS. Braiins publishes its backup endpoint as
        // stratum+tcp://stratum.braiins.com:443 — plain TCP on a port that gets
        // through restrictive networks, which is exactly why it matters for
        // Iran. Assuming TLS here made the alternate port fail its handshake and
        // look like the pool was down. Opt in explicitly instead.
        const isTls = process.env.POOL_TLS === "true" || process.env.ANTPOOL_STRATUM_SSL === "true";
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
                const authId = msgId++;
                // Re-auth after a reconnect must report too — a pool that
                // starts rejecting the account mid-life should not look healthy
                // just because the FIRST authorize succeeded.
                if (authCb) pending.set(authId, (reply) => authCb(reply && reply.result === true, reply && reply.error));
                const authMsg = { id: authId, method: "mining.authorize", params: [authWorker, authPass] };
                send(JSON.stringify(authMsg));
            }
        });
        send(JSON.stringify(msg));
    }

    function send(data) { if (socket && !socket.destroyed) socket.write(data + "\n"); }

    function handle(msg) {
        if (msg.id != null && !msg.method) {
            const cb = pending.get(msg.id);
            if (cb) { pending.delete(msg.id); cb(msg); return; }
            // Any other id-bearing reply is a response to something we relayed
            // on the miner's behalf — overwhelmingly mining.submit. These were
            // previously DROPPED, so the ASIC never learned whether a single
            // share was accepted: it displayed 0 accepted forever and
            // cgminer-family firmware eventually declares the pool dead and
            // fails over to its backup. Hand it back to the proxy to translate.
            if (onReply) onReply(msg);
            return;
        }
        if (msg.method === "mining.notify") onNotify(msg);
        else if (msg.method === "mining.set_difficulty") onSetDifficulty(msg);
        // Previously discarded. After a reconnect the pool issues a NEW
        // extranonce1; a miner still using the old one produces work that
        // collides with another miner's range, so its shares are rejected
        // upstream while Hashrial's own share counter still credits them.
        else if (msg.method === "mining.set_extranonce" && onExtraNonce) onExtraNonce(msg);
        else if (msg.method === "client.reconnect" && onReconnect) onReconnect(msg);
    }

    return {
        connect, send,
        // Relay a downstream request under OUR id space and resolve the reply.
        // The miner's ids and this connection's ids are different namespaces —
        // sharing them meant a miner submitting id:1 could collide with our own
        // pending subscribe and hang the session.
        relay(msg, cb) {
            const upstreamId = msgId++;
            if (cb) pending.set(upstreamId, cb);
            send(JSON.stringify({ ...msg, id: upstreamId }));
            return upstreamId;
        },
        authorize: (worker, pass, cb) => {
            authWorker = worker; authPass = pass;
            if (cb) authCb = cb;
            if (connected) {
                const id = msgId++;
                // The result was previously discarded, so a rejected account
                // (typo, suspension, wrong name) was indistinguishable from a
                // healthy one and every share failed silently upstream.
                if (authCb) pending.set(id, (reply) => authCb(reply && reply.result === true, reply && reply.error));
                send(JSON.stringify({ id, method: "mining.authorize", params: [worker, pass] }));
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
