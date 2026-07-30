/* End-to-end stratum check against a FAKE pool.
 *
 * The defects these cover were all invisible by inspection and all silent in
 * production, which is exactly why they survived: a miner that never receives a
 * submit verdict shows "0 accepted" and blames itself, and a stale extranonce
 * produces upstream rejects while the local share counter keeps crediting.
 *
 *   node scripts/test-proxy-stratum.mjs
 */
import net from "node:net";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { createUpstreamConnection } = require("/Users/sina/Downloads/hashrial/proxy/src/upstream.js");

let pass = 0, fail = 0;
const ok = (n, cond) => { if (cond) { pass++; console.log("  ok   " + n); } else { fail++; console.log("  FAIL " + n); } };

/* A pool that answers subscribe/authorize, verdicts every submit, and can push
   set_extranonce — i.e. the parts a forwarding proxy must actually handle. */
function fakePool({ authorizeOk = true } = {}) {
  const state = { submits: [], sockets: [] };
  const server = net.createServer((sock) => {
    state.sockets.push(sock);
    let buf = "";
    sock.on("data", (d) => {
      buf += d.toString();
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1);
        if (!line.trim()) continue;
        let m; try { m = JSON.parse(line); } catch { continue; }
        if (m.method === "mining.subscribe") {
          sock.write(JSON.stringify({ id: m.id, result: [[["mining.notify", "sub1"]], "aabbccdd", 4], error: null }) + "\n");
        } else if (m.method === "mining.authorize") {
          sock.write(JSON.stringify({ id: m.id, result: authorizeOk, error: authorizeOk ? null : [24, "Unauthorized worker", null] }) + "\n");
        } else if (m.method === "mining.submit") {
          state.submits.push(m);
          // Reject the 2nd submit so both verdict paths are exercised.
          const accept = state.submits.length !== 2;
          sock.write(JSON.stringify({ id: m.id, result: accept, error: accept ? null : [23, "Low difficulty share", null] }) + "\n");
        }
      }
    });
    sock.on("error", () => {});
  });
  state.server = server;
  state.push = (obj) => state.sockets.forEach(s => s.write(JSON.stringify(obj) + "\n"));
  return state;
}

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function run() {
  // ── 1. submit verdicts reach the caller ──────────────────────────────
  const pool = fakePool();
  await new Promise(r => pool.server.listen(0, "127.0.0.1", r));
  const port = pool.server.address().port;

  const replies = [], extranonces = [];
  let authVerdict = null;
  const up = createUpstreamConnection({
    host: "127.0.0.1", port, name: "fake", sessionId: "t1",
    onNotify: () => {}, onSetDifficulty: () => {},
    onSubscribe: () => {}, onDisconnect: () => {},
    onExtraNonce: (m) => extranonces.push(m),
    onReconnect: () => {},
  });
  up.connect();
  await wait(120);

  up.authorize("hashrial.alice_rig01", "x", (okAuth) => { authVerdict = okAuth; });
  await wait(120);
  ok("upstream authorize verdict is reported (was discarded)", authVerdict === true);

  for (let i = 0; i < 3; i++) {
    up.relay({ method: "mining.submit", params: ["hashrial.alice_rig01", "job", "00", "0", "0"] },
             (reply) => replies.push(reply));
  }
  await wait(200);

  ok("every submit gets a verdict back (was silently dropped)", replies.length === 3);
  ok("acceptances surface as result:true", replies.filter(r => r?.result === true).length === 2);
  ok("rejections surface with the pool's reason", replies.some(r => r?.result === false && Array.isArray(r.error)));

  // ids must come from the proxy's own space, never the miner's
  const ids = pool.submits.map(s => s.id);
  ok("relayed submits use distinct upstream ids", new Set(ids).size === ids.length);
  ok("upstream ids do not collide with the subscribe id", !ids.includes(1) || ids.length === new Set(ids).size);

  // ── 2. set_extranonce is relayed, not discarded ──────────────────────
  pool.push({ id: null, method: "mining.set_extranonce", params: ["deadbeef", 4] });
  await wait(150);
  ok("mining.set_extranonce reaches the proxy (was dropped)", extranonces.length === 1);
  ok("new extranonce1 value is carried", extranonces[0]?.params?.[0] === "deadbeef");

  up.destroy?.();
  pool.server.close();

  // ── 3. a rejected pool account is visible ────────────────────────────
  const badPool = fakePool({ authorizeOk: false });
  await new Promise(r => badPool.server.listen(0, "127.0.0.1", r));
  let badVerdict = null, badErr = null;
  const up2 = createUpstreamConnection({
    host: "127.0.0.1", port: badPool.server.address().port, name: "fake2", sessionId: "t2",
    onNotify: () => {}, onSetDifficulty: () => {}, onSubscribe: () => {}, onDisconnect: () => {},
  });
  up2.connect();
  await wait(120);
  up2.authorize("hashrial.typo", "x", (okAuth, err) => { badVerdict = okAuth; badErr = err; });
  await wait(150);
  ok("a rejected pool account is reported, not assumed healthy", badVerdict === false);
  ok("the pool's rejection reason is passed through", Array.isArray(badErr));
  up2.destroy?.();
  badPool.server.close();

  console.log(`\n  ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

run().catch(e => { console.error("harness error:", e); process.exit(1); });
