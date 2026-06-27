# Hashrial — Production Deployment Guide

## Architecture

```
hashrial.com ───────► Cloudflare Pages (React SPA dashboard)
                            │
api.hashrial.com ────► Cloudflare proxy (orange cloud ☁)
                            │
                            ▼
                    Oracle Cloud Free VM
                    ├── nginx :80 ──► API :4000
                    ├── Proxy :3333 (Stratum TCP for miners)
                    │
                    ├── Supabase (Postgres, managed)
                    └── Upstash (Redis, managed)
```

## Prerequisites

- Domain `hashrial.com` — add to Cloudflare (free plan)
- [Supabase](https://supabase.com) account — free tier
- [Upstash](https://upstash.com) account — free tier
- [Oracle Cloud](https://oracle.com/cloud/free) account — always free VM
- Antpool API credentials (`ANTPOOL_API_KEY` + `ANTPOOL_API_SECRET`)

## Step 1 — Supabase (Postgres)

1. Create a project in Supabase
2. Go to **SQL Editor**, paste `db/migrations/001_init.sql`, click **Run**
3. Go to **Project Settings → Database → Connection string**
4. Copy `postgresql://postgres:XXXX@db.XXXX.supabase.co:5432/postgres`
   - Host: `db.XXXX.supabase.co`
   - Password: the project password you set

## Step 2 — Upstash (Redis)

1. Create a Redis database in Upstash (free tier: 10MB)
2. From the **Details** page, copy:
   - Host: `XXXX.upstash.io`
   - Password
3. Note: `REDIS_TLS=true` is required (already configured in code)

## Step 3 — Cloudflare Pages (Dashboard)

1. Push code to GitHub:
```bash
cd /path/to/hashrial
git remote add origin https://github.com/you/hashrial.git
git push -u origin main
```

2. In Cloudflare Dashboard → **Pages** → **Connect to Git**
   - Select your repo

3. Build configuration:
   - Build command: `cd dashboard && npm install && npm run build`
   - Build output directory: `/dashboard/build`

4. Environment variable:
   - `REACT_APP_API_URL` = `https://api.hashrial.com`

5. Deploy, then add custom domain: `hashrial.com`

## Step 4 — Oracle VM (Proxy + API)

### 4.1 — Create the VM

1. Oracle Cloud Console → **Compute → Instances**
2. Create:
   - Name: `hashrial`
   - Image: **Ubuntu 22.04+** (Canonical)
   - Shape: **VM.Standard.A1.Flex** (4 OCPU, 24GB RAM — always free)
   - SSH key: Add your public key

3. Note the **public IP** after creation

### 4.2 — Run setup script

```bash
ssh ubuntu@<YOUR_VM_IP>
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/you/hashrial/main/scripts/setup-oracle.sh)"
```

### 4.3 — Edit secrets

```bash
sudo nano /opt/hashrial/.env
```

Fill in ALL values — use these from Supabase, Upstash, and your Antpool account:
- `JWT_SECRET` = run `openssl rand -base64 32` locally and paste
- `POSTGRES_HOST`/`PASSWORD` from Supabase
- `REDIS_HOST`/`PASSWORD` from Upstash
- `ANTPOOL_API_KEY`/`SECRET` from Antpool

### 4.4 — Restart services

```bash
sudo systemctl restart hashrial-api hashrial-proxy
```

### 4.5 — Open firewall ports in Oracle Cloud Console

Networking → Virtual Cloud Networks → Security Lists → Add Ingress Rules:
- Port **3333** TCP (0.0.0.0/0) — Stratum proxy
- Port **80** TCP (0.0.0.0/0) — API proxy

## Step 5 — Cloudflare DNS

Add these DNS records in Cloudflare:

| Type | Name | Value | Proxy |
|------|------|-------|-------|
| A | `api` | `<ORACLE_VM_IP>` | ☁ Proxied (orange) |
| A | `@` | `<ORACLE_VM_IP>` | ☁ DNS only (gray) |

**Note:** `@` must be DNS-only (gray cloud) so TCP port 3333 traffic reaches the VM.

## Step 6 — Verify

| Check | Command/URL |
|-------|-------------|
| Dashboard | `https://hashrial.com` — should show landing page |
| Register | Create account → redirected to Connect page |
| API health | `https://api.hashrial.com/api/health` → `{"status":"ok"}` |
| Stratum port | `nc -zv hashrial.com 3333` → connection succeeds |

## Monitoring

```bash
# API logs
sudo journalctl -u hashrial-api -f

# Proxy logs
sudo journalctl -u hashrial-proxy -f

# nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Common Issues

**Registration fails with server error:**
→ Ensure migration SQL was run in Supabase SQL Editor

**API health returns 503:**
→ Check Postgres/Redis connectivity in the `.env` file
→ `sudo journalctl -u hashrial-api -f` for error details

**Miners can't connect on port 3333:**
→ Verify Oracle Cloud security list allows port 3333 TCP
→ Check `sudo journalctl -u hashrial-proxy -f`
