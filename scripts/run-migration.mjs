/* Runs a migration against Supabase, by whichever credential is available.
 *
 *   node scripts/run-migration.mjs db/migrations/005_pool_subaccount.sql
 *
 * Reads either of these from the environment or from the repo's .env
 * (gitignored — put credentials there, never in a chat message):
 *
 *   SUPABASE_ACCESS_TOKEN   a personal access token from
 *                           supabase.com/dashboard/account/tokens
 *                           Easiest to find and revoke, and it needs no
 *                           database password. Runs the SQL through the
 *                           Management API. Add SUPABASE_PROJECT_REF too if
 *                           the account has more than one project.
 *
 *   SUPABASE_DB_URL         postgresql://… from the green "Connect" button at
 *                           the top of the project dashboard. Prefer the
 *                           SESSION POOLER string: the direct db.*.supabase.co
 *                           host is IPv6-only on newer projects and simply
 *                           times out from most home connections.
 *
 * The migrations here are idempotent, so re-running one is safe. Each file is
 * still sent as a single transaction: failing halfway and leaving some columns
 * added but a constraint missing is worse than failing cleanly.
 */
import fs from "node:fs";
import { createRequire } from "node:module";

const file = process.argv[2];
if (!file) { console.error("usage: node scripts/run-migration.mjs <path-to.sql>"); process.exit(1); }

const fromEnvFile = (key) => {
  if (!fs.existsSync(".env")) return null;
  const m = fs.readFileSync(".env", "utf8").match(new RegExp(`^${key}\\s*=\\s*(.+)$`, "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : null;
};
const cfg = (key) => process.env[key] || fromEnvFile(key);

const token = cfg("SUPABASE_ACCESS_TOKEN");
let url = cfg("SUPABASE_DB_URL");

/* ── Management API path — no database password needed ───────────────── */
if (token) {
  const sqlText = fs.readFileSync(file, "utf8");
  const api = async (path, init = {}) => {
    const r = await fetch(`https://api.supabase.com${path}`, {
      ...init,
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.headers || {}) },
    });
    const body = await r.text();
    if (!r.ok) throw new Error(`${path} -> HTTP ${r.status}: ${body.slice(0, 300)}`);
    return body ? JSON.parse(body) : null;
  };

  let ref = cfg("SUPABASE_PROJECT_REF");
  if (!ref) {
    const projects = await api("/v1/projects");
    if (!projects?.length) throw new Error("the token can see no projects");
    if (projects.length > 1) {
      console.error("Several projects visible — set SUPABASE_PROJECT_REF to one of:");
      for (const p of projects) console.error(`  ${p.id}  ${p.name}  (${p.region})`);
      process.exit(1);
    }
    ref = projects[0].id;
    console.log(`project ${projects[0].name} (${ref})`);
  }

  console.log(`running ${file} via the Management API`);
  // Wrapped so a partial application cannot survive, same as the psql path.
  await api(`/v1/projects/${ref}/database/query`, {
    method: "POST",
    body: JSON.stringify({ query: `BEGIN;\n${sqlText}\nCOMMIT;` }),
  });
  console.log("✓ committed");
  process.exit(0);
}

if (!url) {
  console.error("No credential found. Add ONE of these to .env (gitignored):");
  console.error("  SUPABASE_ACCESS_TOKEN=sbp_…            supabase.com/dashboard/account/tokens");
  console.error("  SUPABASE_DB_URL=postgresql://…         Connect button → Session pooler");
  process.exit(1);
}

// pg is not a dependency of this repo's root; borrow the proxy's copy.
const require = createRequire(new URL("../proxy/", import.meta.url));
let Client;
try { ({ Client } = require("pg")); }
catch { console.error("pg not installed. Run: cd proxy && npm install"); process.exit(1); }

const sql = fs.readFileSync(file, "utf8");
const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

await client.connect();
console.log(`connected — running ${file}`);
try {
  await client.query("BEGIN");
  await client.query(sql);
  await client.query("COMMIT");
  console.log("✓ committed");
} catch (e) {
  await client.query("ROLLBACK").catch(() => {});
  console.error(`✗ rolled back: ${e.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
