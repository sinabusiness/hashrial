# Hashrial Mining Pool — Full Stack

Bitcoin mining proxy pool for hashrial.com. Standard 2% fee model:
- 98% of each user's hashrate → their own Antpool sub-account (they see it on their dashboard)
- 2% → `hashrialfee` sub-account (your infrastructure fee)

## Architecture

```
Miners → [Stratum Proxy :3333] → Antpool ss.antpool.com:3333
                                     ├── user's sub-account (98%)
                                     └── hashrialfee (2%)

[API :4000] ← polls Antpool API every 60s per user
[Dashboard] → React SPA served via nginx
[Postgres]  → user accounts, worker history, earnings, notifications
[Redis]     → live cache (90s TTL), session state
[Nginx]     → reverse proxy, SSL termination
```

## Quick Start

### 1. Prerequisites
```bash
# Install Docker + Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### 2. Clone & configure
```bash
git clone https://github.com/yourname/hashrial.git
cd hashrial
cp .env.example .env   # then edit .env
```

Edit `.env`:
- Set strong `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `JWT_SECRET`
- Antpool credentials are pre-filled (rotate after deployment)

### 3. SSL certificates
```bash
# Using Let's Encrypt (recommended):
apt install certbot
certbot certonly --standalone -d hashrial.com -d www.hashrial.com
cp /etc/letsencrypt/live/hashrial.com/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/hashrial.com/privkey.pem nginx/ssl/

# Or for testing, generate self-signed:
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem -out nginx/ssl/fullchain.pem \
  -subj "/CN=hashrial.com"
```

### 4. Launch
```bash
docker compose up -d
docker compose logs -f   # watch startup
```

### 5. Open firewall ports
```bash
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3333/tcp   # stratum port for miners
```

## Antpool Sub-Account Setup

**Important:** For each user who registers on hashrial.com, you must create a matching sub-account in your Antpool panel with the **exact same username**.

1. Log in to antpool.com as `hashrial`
2. Go to Sub-accounts → Create sub-account
3. Use the hashrial username as the sub-account name
4. The user's 98% hashrate will automatically appear in that sub-account
5. Users can see their own earnings and workers on their hashrial dashboard

The API polls Antpool every 60 seconds per user to update their dashboard.

## How the 2% fee works

The proxy counts shares. Every 50th share (= 2%) is submitted to Antpool with `hashrialfee` as the username instead of the miner's own account. The other 49 out of 50 go to the miner's own sub-account. This is identical to how F2Pool, ViaBTC, and Slushpool implement fees.

## Miner connection settings

Miners configure their ASICs with:
- **Pool URL:** `stratum+tcp://hashrial.com:3333`
- **Username:** `their_username.worker_name`
- **Password:** `x`

## Services

| Service | Port | Purpose |
|---------|------|---------|
| Stratum Proxy | 3333 | Miner connections |
| API | 4000 (internal) | REST API |
| Dashboard | 80 (internal) | React SPA |
| Nginx | 80, 443 | Public entry point |
| Postgres | 5432 (internal) | Database |
| Redis | 6379 (internal) | Cache |

## Update
```bash
git pull
docker compose up -d --build
```

## Logs
```bash
docker compose logs -f proxy    # miner connections + share routing
docker compose logs -f api      # API + Antpool poller
docker compose logs -f nginx    # web traffic
```

## Monitoring

Check worker counts and proxy health:
```bash
docker compose exec redis redis-cli -a YOUR_REDIS_PASSWORD keys "worker:*" | wc -l
curl http://localhost:4000/api/health
```
