/* Runs a migration against Supabase over a direct Postgres connection.
 *
 *   SUPABASE_DB_URL="postgresql://…" node scripts/run-migration.mjs db/migrations/005_pool_subaccount.sql
 *
 * Reads SUPABASE_DB_URL from the environment or from a SUPABASE_DB_URL= line in
 * the repo's .env (which is gitignored). Get it from
 * Supabase → Project Settings → Database → Connection string → URI.
 *
 * The migrations here are written to be idempotent, so re-running one is safe.
 * Each file is still sent inside a single transaction: a migration that fails
 * halfway and leaves some columns added but a constraint missing is worse than
 * one that fails cleanly and can simply be run again.
 */
import fs from "node:fs";
import { createRequire } from "node:module";

const file = process.argv[2];
if (!file) { console.error("usage: node scripts/run-migration.mjs <path-to.sql>"); process.exit(1); }

let url = process.env.SUPABASE_DB_URL;
if (!url && fs.existsSync(".env")) {
  const m = fs.readFileSync(".env", "utf8").match(/^SUPABASE_DB_URL\s*=\s*(.+)$/m);
  if (m) url = m[1].trim().replace(/^["']|["']$/g, "");
}
if (!url) {
  console.error("No SUPABASE_DB_URL. Add a line to .env (gitignored):");
  console.error('  SUPABASE_DB_URL=postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres');
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
