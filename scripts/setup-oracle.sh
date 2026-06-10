#!/usr/bin/env bash
set -euo pipefail
# ================================================================
# Oracle Cloud VM Setup for Hashrial Mining Pool
# Run this on your Oracle Always Free VM (Ubuntu 22.04+)
# ================================================================
# Usage: ssh into your VM, then:
#   curl -fsSL https://raw.githubusercontent.com/sinabusiness/hashrial/main/scripts/setup-oracle.sh | bash

echo "[1/5] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs
node -v && npm -v

echo "[2/5] Cloning repo..."
git clone https://github.com/sinabusiness/hashrial.git /opt/hashrial
cd /opt/hashrial

echo "[3/5] Installing proxy dependencies..."
cd proxy && npm install && cd ..

echo "[4/5] Creating .env file..."
cat > .env << 'ENVEOF'
# ── API (not used on VM, but proxy reads these) ──
API_PORT=4000
JWT_SECRET=CHANGE_ME_GENERATE_WITH_openssl_rand_-base64_32
SITE_URL=https://hashrial.com
LOG_LEVEL=info

# ── Proxy ──
PROXY_PORT=3333
MAX_CONNS_PER_IP=50
FEE_PERCENT=2

# ── Antpool ──
ANTPOOL_STRATUM=ss.antpool.com:3333
ANTPOOL_API_KEY=YOUR_ANTPOOL_API_KEY
ANTPOOL_API_SECRET=YOUR_ANTPOOL_API_SECRET
FEE_SUBACCOUNT=hashrialfee
MAIN_SUBACCOUNT=hashrial

# ── Supabase Postgres ──
POSTGRES_HOST=db.xxxxx.supabase.co
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=YOUR_SUPABASE_PASSWORD

# ── Upstash Redis ──
REDIS_HOST=xxxxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=YOUR_UPSTASH_PASSWORD
REDIS_TLS=true

# ── Payout / Polling ──
MIN_PAYOUT_BTC=0.001
POLL_INTERVAL_MS=120000
POLL_CONCURRENCY=3
ENVEOF

echo ""
echo "!!! IMPORTANT: Edit /opt/hashrial/.env with your real secrets !!!"
echo "    nano /opt/hashrial/.env"
echo ""

echo "[5/5] Setting up systemd service..."
sudo tee /etc/systemd/system/hashrial-proxy.service << 'SERVICEEOF'
[Unit]
Description=Hashrial Stratum Proxy
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/hashrial/proxy
ExecStart=/usr/bin/node /opt/hashrial/proxy/src/proxy.js
Restart=always
RestartSec=5
EnvironmentFile=/opt/hashrial/.env

[Install]
WantedBy=multi-user.target
SERVICEEOF

sudo systemctl daemon-reload
sudo systemctl enable hashrial-proxy
sudo systemctl start hashrial-proxy

echo ""
echo "=== DONE ==="
echo "Check status: sudo systemctl status hashrial-proxy"
echo "View logs:    sudo journalctl -u hashrial-proxy -f"
echo ""
echo "Open port 3333 in Oracle firewall:"
echo "  sudo ufw allow 3333"
echo "  Also add ingress rule in Oracle Cloud Console:"
echo "  Networking → Virtual Cloud Networks → Security Lists → Add Ingress Rule"
echo "  Source: 0.0.0.0/0, Port: 3333, Protocol: TCP"
echo ""
