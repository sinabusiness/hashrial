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
echo "[1/8] Installing system dependencies..."
apt-get update -qq
apt-get install -y -qq curl git nginx ufw

# ── 2. Node.js 20 ───────────────────────────────────────────────
echo "[2/8] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y -qq nodejs
echo "  Node $(node -v)  npm $(npm -v)"

# ── 3. Create hashrial user ─────────────────────────────────────
echo "[3/8] Creating dedicated hashrial user..."
if ! id -u hashrial &>/dev/null; then
  useradd -r -s /bin/false -d /opt/hashrial hashrial
  echo "  Created user: hashrial"
else
  echo "  User hashrial already exists"
fi

# ── 4. Clone repo ───────────────────────────────────────────────
echo "[4/8] Cloning repository..."
if [ -d /opt/hashrial ]; then
  cd /opt/hashrial && git pull
else
  git clone https://github.com/sinabusiness/hashrial.git /opt/hashrial
fi
cd /opt/hashrial

# ── 5. Install deps ─────────────────────────────────────────────
echo "[5/8] Installing dependencies..."
cd /opt/hashrial/api && npm ci --production
cd /opt/hashrial/proxy && npm ci --production
cd /opt/hashrial

# ── 6. Create .env with real secrets ────────────────────────────
echo "[6/8] Creating .env with secure defaults..."
if [ ! -f .env ]; then
  GENERATED_JWT=$(openssl rand -base64 32)
  GENERATED_PASS=$(openssl rand -base64 16 | tr -d '=' | head -c 20)

  cat > .env << ENVEOF
# ── API Configuration ──────────────────────────────────────────
API_PORT=4000
JWT_SECRET=${GENERATED_JWT}
SITE_URL=https://hashrial.com
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
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

# ── Admin ──────────────────────────────────────────────────────
ADMIN_USER_IDS=

# ── Payout / Polling ──────────────────────────────────────────
MIN_PAYOUT_BTC=0.001
POLL_INTERVAL_MS=120000
POLL_CONCURRENCY=3
CYCLE_TIMEOUT_MS=96000
ENVEOF

  chmod 600 .env
  echo ""
  echo "  ✓ Generated secure JWT_SECRET (${#GENERATED_JWT} chars)"
  echo ""
  echo "  ⚠  You MUST edit /opt/hashrial/.env with your real secrets:"
  echo "     sudo nano /opt/hashrial/.env"
  echo ""
  echo "  Required changes:"
  echo "    - ANTPOOL_API_KEY"
  echo "    - ANTPOOL_API_SECRET"
  echo "    - POSTGRES_HOST / POSTGRES_PASSWORD"
  echo "    - REDIS_HOST / REDIS_PASSWORD"
  echo "    - SITE_URL (your domain)"
  echo ""
else
  echo "  .env already exists — skipping creation"
fi

# ── 7. nginx config (reverse proxy to API on port 4000) ────────
echo "[7/8] Configuring nginx..."
cat > /etc/nginx/sites-available/hashrial << 'NGINXEOF'
server {
    listen 80 default_server;
    server_name _;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

    # API reverse proxy — Cloudflare handles SSL
    location /api/auth/ {
        limit_req zone=auth burst=3 nodelay;
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
        proxy_connect_timeout 5s;
    }

    location /api/ {
        limit_req zone=api burst=20 nodelay;
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

# ── 8. Systemd services (non-root) ──────────────────────────────
echo "[8/8] Creating systemd services..."

# API service
cat > /etc/systemd/system/hashrial-api.service << 'SERVICEEOF'
[Unit]
Description=Hashrial API Backend
After=network.target nginx.service
Requires=network.target

[Service]
Type=simple
User=hashrial
Group=hashrial
WorkingDirectory=/opt/hashrial/api
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=5
EnvironmentFile=/opt/hashrial/.env
LimitNOFILE=65536
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/hashrial

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
User=hashrial
Group=hashrial
WorkingDirectory=/opt/hashrial/proxy
ExecStart=/usr/bin/node src/proxy.js
Restart=always
RestartSec=5
EnvironmentFile=/opt/hashrial/.env
LimitNOFILE=65536
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/hashrial

[Install]
WantedBy=multi-user.target
SERVICEEOF

# Set ownership
chown -R hashrial:hashrial /opt/hashrial

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
echo "║  Services (running as 'hashrial' user):                 ║"
echo "║    hashrial-api     →  http://localhost:4000             ║"
echo "║    hashrial-proxy   →  tcp://0.0.0.0:3333               ║"
echo "║    nginx            →  http://0.0.0.0:80 → api:4000     ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Security:                                              ║"
echo "║    ✓ JWT_SECRET auto-generated (44+ chars)              ║"
echo "║    ✓ Services run as non-root 'hashrial' user           ║"
echo "║    ✓ .env file permissions: 600 (owner-only)            ║"
echo "║    ✓ nginx rate limiting enabled                        ║"
echo "║    ✓ systemd sandboxing enabled                         ║"
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
