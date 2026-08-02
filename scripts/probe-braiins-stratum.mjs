/* Does Braiins read params[0] on mining.submit, and may one connection carry
 * more than one authorized worker?
 *
 *   node scripts/probe-braiins-stratum.mjs
 *   PROBE_ACCOUNT=hashrial PROBE_PORT=443 node scripts/probe-braiins-stratum.mjs
 *
 * Hashrial's 2% fee works by rewriting params[0] to hashrial.fee-… on every
 * 50th share. That only collects anything if the pool (a) reads params[0] at
 * all, and (b) lets the connection name a worker other than the one the miner
 * authorized. Nothing in the Stratum V1 spec settles either point, and the
 * Braiins docs do not cover it — hence a probe against the live pool rather
 * than a reading of the docs. That distinction is the same one that let the
 * Antpool poller write zero worker rows for months.
 *
 * Every submit below carries a real job_id but a deliberately invalid nonce, so
 * all of them are rejected and no work is claimed. The signal is in WHICH
 * rejection comes back:
 *
 *   A  submit as the worker this connection authorized     -> baseline
 *   B  submit as a worker it never authorized              -> differs => read
 *   C  authorize that second worker on the same connection -> permitted?
 *   D  submit as it again                                  -> baseline => works
 *
 * Result on 2026-08-02 against stratum.braiins.com:3333:
 *   A [34,"SInvalidTime"]   B [36,"SNotAuthorized"]   C true   D [34,"SInvalidTime"]
 * i.e. params[0] IS read and validated against the workers authorized on the
 * connection, and a second mining.authorize lifts the restriction. So the fee
 * label must be authorized upstream — see authorizeExtra() in proxy/src/upstream.js.
 */
import net from "node:net";

const HOST = process.env.PROBE_HOST || "stratum.braiins.com";
const PORT = parseInt(process.env.PROBE_PORT || "3333");
const ACCOUNT = process.env.PROBE_ACCOUNT || "hashrial";
const W_MAIN = `${ACCOUNT}.probe`;
const W_FEE = `${ACCOUNT}.fee-probe_rig01`;

const sock = net.connect({ host: HOST, port: PORT });
sock.setTimeout(30000);
let buf = "", id = 1, jobId = null, en2size = 4, started = false;
const sent = new Map();
const results = {};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function send(method, params, tag) {
  const myId = id++;
  sent.set(myId, tag || method);
  sock.write(JSON.stringify({ id: myId, method, params }) + "\n");
  return myId;
}
const submitAs = (label, tag) =>
  send("mining.submit", [label, jobId, "00".repeat(en2size), "00000000", "00000000"], `submit:${tag}`);

sock.on("connect", () => send("mining.subscribe", ["hashrial-probe/1.0"]));

sock.on("data", (d) => {
  buf += d.toString();
  const lines = buf.split("\n");
  buf = lines.pop();
  for (const l of lines) {
    if (!l.trim()) continue;
    let m; try { m = JSON.parse(l); } catch { continue; }

    if (m.method === "mining.notify" && Array.isArray(m.params)) {
      const first = jobId === null;
      jobId = m.params[0];
      if (first) runSteps();
      continue;
    }
    if (m.id === null || m.id === undefined) continue;

    const what = sent.get(m.id);
    if (what === "mining.subscribe" && Array.isArray(m.result)) {
      en2size = m.result[2] ?? 4;
      console.log(`subscribe   extranonce2_size=${en2size}`);
      send("mining.authorize", [W_MAIN, "x"]);
    } else if (what === "mining.authorize") {
      console.log(`authorize   ${W_MAIN} -> ${JSON.stringify(m.result)} ${JSON.stringify(m.error)}`);
      results.authMain = m.result;
      if (m.result !== true) {
        console.log(`\n!! ${ACCOUNT} did not authorize — set PROBE_ACCOUNT to a real Braiins account.`);
        sock.end();
      }
    } else if (what === "authorize:fee") {
      console.log(`authorize   ${W_FEE} -> ${JSON.stringify(m.result)} ${JSON.stringify(m.error)}`);
      results.authFee = m.result;
    } else if (what && what.startsWith("submit:")) {
      const tag = what.slice(7);
      results[tag] = m.error ? JSON.stringify(m.error) : "null";
      console.log(`submit ${tag.padEnd(16)} -> ${results[tag]}`);
    }
  }
});

async function runSteps() {
  if (started || results.authMain !== true) return;
  started = true;
  console.log(`job_id      ${jobId}\n`);

  console.log("A: naming the worker this connection authorized");
  submitAs(W_MAIN, "A-authorized");   await wait(3000);
  console.log("\nB: naming a worker it never authorized");
  submitAs(W_FEE, "B-unauthorized");  await wait(3000);
  console.log("\nC: authorizing that second worker on the SAME connection");
  send("mining.authorize", [W_FEE, "x"], "authorize:fee"); await wait(3000);
  console.log("\nD: naming it again, now that it is authorized");
  submitAs(W_FEE, "D-after-auth");    await wait(4000);

  const reads = results["A-authorized"] !== results["B-unauthorized"];
  const works = results["D-after-auth"] === results["A-authorized"];
  console.log("\n" + "=".repeat(60));
  console.log(reads
    ? "params[0] IS read — naming a different worker changed the answer."
    : "params[0] appears IGNORED — same rejection either way.");
  if (reads) {
    console.log(works
      ? "A second mining.authorize on the same connection MAKES IT WORK."
      : "But authorizing it on the same connection did NOT make it work.");
  }
  console.log("=".repeat(60));
  console.log(reads && works
    ? "=> the fee mechanism is viable; the fee label must be authorized upstream."
    : "=> the fee mechanism needs rethinking; raise it with Braiins.");
  sock.end();
}

sock.on("timeout", () => { console.log("!! timeout"); sock.destroy(); });
sock.on("error", (e) => console.log(`!! ${e.message}`));
sock.on("close", () => process.exit(0));
