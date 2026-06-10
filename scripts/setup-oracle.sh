#!/usr/bin/env bash
set -euo pipefail
# ===================================================================
# Hashrial — Oracle Always Free VM Production Setup
# Installs: Node.js 20, Stratum Proxy, API Backend, nginx
# ===================================================================
# Usage: ssh into your Oracle VM (Ubuntu 22.04+), then:
#   sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/sinabusiness/hashrial/main/scripts/setup-oracle.sh)"
# ===================================================================

export DEBIAN_FRONTEND=noninteractive

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║        Hashrial Mining Pool — Oracle VM Setup           ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── 1. System deps ──────────────────────────────────────────────
echo "[1/7] Installing system dependencies..."
apt-get update -qq
apt-get install -y -qq curl git nginx ufw

# ── 2. Node.js 20 ───────────────────────────────────────────────
echo "[2/7] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y -qq nodejs
echo "  Node $(node -v)  npm $(npm -v)"

# ── 3. Clone repo ───────────────────────────────────────────────
echo "[3/7] Cloning repository..."
if [ -d /opt/hashrial ]; then
  cd /opt/hashrial && git pull
else
  git clone https://github.com/sinabusiness/hashrial.git /opt/hashrial
fi
cd /opt/hashrial

# ── 4. Install deps ─────────────────────────────────────────────
echo "[4/7] Installing dependencies..."
cd /opt/hashrial/api && npm install --production
cd /opt/hashrial/proxy && npm install --production
cd /opt/hashrial

# ── 5. Create .env ──────────────────────────────────────────────
echo "[5/7] Creating .env (EDIT THIS FILE with your secrets!)..."
if [ ! -f .env ]; then
  cat > .env << 'ENVEOF'
# ── API Configuration ──────────────────────────────────────────
API_PORT=4000
JWT_SECRET=CHANGE_ME_RUN_openssl_rand_-base64_32
SITE_URL=https://hashrial.com
LOG_LEVEL=info

# ── Proxy Configuration ────────────────────────────────────────
PROXY_PORT=3333
MAX_CONNS_PER_IP=50
FEE_PERCENT=2
DISABLE_TLS_VERIFY=false

# ── Antpool Configuration ──────────────────────────────────────
ANTPOOL_STRATUM=ss.antpool.com:3333
ANTPOOL_STRATUM_SSL=false
ANTPOOL_API_KEY=YOUR_ANTPOOL_API_KEY
ANTPOOL_API_SECRET=YOUR_ANTPOOL_API_SECRET
ANTPOOL_USER_ID=hashrial
COIN_TYPE=BTC
FEE_SUBACCOUNT=hashrialfee
MAIN_SUBACCOUNT=hashrial

# ── Supabase Postgres ──────────────────────────────────────────
POSTGRES_HOST=db.xxxxx.supabase.co
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=YOUR_SUPABASE_PASSWORD

# ── Upstash Redis ──────────────────────────────────────────────
REDIS_HOST=xxxxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=YOUR_UPSTASH_PASSWORD
REDIS_TLS=true

# ── Payout / Polling ──────────────────────────────────────────
MIN_PAYOUT_BTC=0.001
POLL_INTERVAL_MS=120000
POLL_CONCURRENCY=3
CYCLE_TIMEOUT_MS=96000
ENVEOF
fi

echo ""
echo "  ⚠  IMPORTANT: Edit /opt/hashrial/.env with your real secrets:"
echo "     nano /opt/hashrial/.env"
echo ""

# ── 6. nginx config (reverse proxy to API on port 4000) ────────
echo "[6/7] Configuring nginx..."
cat > /etc/nginx/sites-available/hashrial << 'NGINXEOF'
server {
    listen 80 default_server;
    server_name _;

    # API reverse proxy — Cloudflare handles SSL
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
        proxy_connect_timeout 5s;
    }

    # Health check (for Cloudflare/Tunnel)
    location /health {
        proxy_pass http://127.0.0.1:4000/api/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Block everything else by default
    location / {
        return 444;
    }
}
NGINXEOF

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/hashrial /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx

# ── 7. Systemd services ─────────────────────────────────────────
echo "[7/7] Creating systemd services..."

# API service
cat > /etc/systemd/system/hashrial-api.service << 'SERVICEEOF'
[Unit]
Description=Hashrial API Backend
After=network.target nginx.service
Requires=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/hashrial/api
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=5
EnvironmentFile=/opt/hashrial/.env
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
SERVICEEOF

# Proxy service
cat > /etc/systemd/system/hashrial-proxy.service << 'SERVICEEOF'
[Unit]
Description=Hashrial Stratum Proxy (port 3333)
After=network.target
Requires=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/hashrial/proxy
ExecStart=/usr/bin/node src/proxy.js
Restart=always
RestartSec=5
EnvironmentFile=/opt/hashrial/.env
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
SERVICEEOF

systemctl daemon-reload
systemctl enable hashrial-api hashrial-proxy
systemctl restart hashrial-api hashrial-proxy

# ── Firewall ────────────────────────────────────────────────────
echo ""
echo "Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 3333/tcp
ufw --force enable

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  SETUP COMPLETE                                         ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Services:                                              ║"
echo "║    hashrial-api     →  http://localhost:4000             ║"
echo "║    hashrial-proxy   →  tcp://0.0.0.0:3333               ║"
echo "║    nginx            →  http://0.0.0.0:80 → api:4000     ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Commands:                                              ║"
echo "║    sudo journalctl -u hashrial-api -f                   ║"
echo "║    sudo journalctl -u hashrial-proxy -f                 ║"
echo "║    sudo nano /opt/hashrial/.env                         ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Oracle Cloud Console — add Ingress Rules:              ║"
echo "║    • Port 3333 TCP  (0.0.0.0/0) — Stratum               ║"
echo "║    • Port 80 TCP    (0.0.0.0/0) — API proxy             ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
