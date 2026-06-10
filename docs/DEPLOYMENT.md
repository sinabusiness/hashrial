# Hashrial Mining Pool - Deployment Guide

## Pre-Deployment Checklist

- [ ] SSL/TLS certificates generated (via Let's Encrypt or other CA)
- [ ] `.env` file configured with all required variables
- [ ] Database backups strategy implemented
- [ ] Monitoring and alerting configured
- [ ] Incident response plan reviewed with team
- [ ] Security headers validated (HSTS, CSP, etc.)
- [ ] Load testing completed (target: 1000+ concurrent connections)
- [ ] All health checks passing

## Production Deployment Steps

### 1. SSL Certificate Setup

```bash
# Generate Let's Encrypt certificate
sudo certbot certonly --standalone -d hashrial.com -d www.hashrial.com

# Copy to deployment directory
sudo cp /etc/letsencrypt/live/hashrial.com/fullchain.pem ./nginx/ssl/
sudo cp /etc/letsencrypt/live/hashrial.com/privkey.pem ./nginx/ssl/
sudo chown 1000:1000 ./nginx/ssl/*
```

### 2. Environment Configuration

```bash
# Copy example env file
cp .env.example .env

# Edit .env with production values
# CRITICAL: Set strong passwords (min 20 chars) for:
# - POSTGRES_PASSWORD
# - REDIS_PASSWORD
# - JWT_SECRET (44+ chars, generate with: openssl rand -base64 32)
# - ANTPOOL_API_KEY
# - ANTPOOL_API_SECRET
```

### 3. Database Initialization

```bash
# Start database services
docker compose up -d postgres redis

# Verify database is ready (health check should pass)
docker compose ps

# Database migrations run automatically via docker-entrypoint-initdb.d
```

### 4. Service Deployment

```bash
# Build all services
docker compose build

# Start all services
docker compose up -d

# Verify all services are healthy
docker compose ps
# Expected status: "running (healthy)" for all services

# Check logs
docker compose logs -f api proxy
```

### 5. Health Verification

```bash
# Test API health endpoint
curl https://hashrial.com/api/health

# Test Proxy (basic connectivity)
nc -zv hashrial.com 3333

# Check health check endpoint
docker exec hashrial-proxy nc -z 127.0.0.1 3334
```

### 6. Monitoring Setup

```bash
# Prometheus scrape configuration
cat > /etc/prometheus/hashrial.yml << 'EOF'
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'hashrial-proxy'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['localhost:9090']
  - job_name: 'hashrial-api'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['localhost:4000']
EOF
```

## Scaling Guide

### Horizontal Scaling (Multiple API instances)

1. Update `docker-compose.yml`:
```yaml
  api:
    deploy:
      replicas: 3
```

2. Update nginx upstream configuration to round-robin across replicas

### Proxy Scaling

Proxy should typically run as a single instance per geographic region due to the stratum protocol's connection-oriented nature. To scale to multiple regions:

1. Deploy separate Hashrial instances in each region
2. Use geographic DNS routing (GeoDNS or Route 53) to direct miners to nearest region
3. Ensure all instances share the same Antpool sub-accounts and database for unified stats

## Rollback Procedure

If deployment encounters critical issues:

```bash
# 1. Stop current deployment
docker compose down

# 2. Revert to previous version
git checkout HEAD~1

# 3. Restore database from backup (if needed)
pg_restore -h localhost -U hashrial -d hashrial < backup_$(date +%s).sql

# 4. Redeploy
docker compose up -d

# 5. Verify health checks
docker compose ps
```

## Common Issues

### Pool refuses connections
- Check: Antpool connectivity, network firewall rules, ANTPOOL_STRATUM env var
- Solution: `docker logs proxy | grep upstream`

### High error rate on register
- Check: Database connection pool, rate limiting settings
- Solution: `docker logs api | jq '. | select(.level=="error")'`

### Miners can't connect to pool
- Check: Firewall allows port 3333, DNS resolves hashrial.com
- Solution: `telnet hashrial.com 3333` from miner machine

### Database performance degrading
- Solution: Run vacuum and analyze
```bash
docker exec hashrial-postgres psql -U hashrial -d hashrial -c "VACUUM ANALYZE;"
```

## Maintenance

### Weekly Tasks
- [ ] Review error logs for patterns
- [ ] Check database disk usage
- [ ] Verify backup completion

### Monthly Tasks
- [ ] Review and rotate secrets (JWT_SECRET, API keys)
- [ ] Run `pg_dump` for backups
- [ ] Review pool stats for anomalies
- [ ] Update security headers if needed

### Quarterly Tasks
- [ ] Load test with increasing concurrent connections
- [ ] Review and rotate SSL certificates
- [ ] Disaster recovery drill
- [ ] Security audit

## Security Hardening

### Before Production
1. ✅ TLS verification enabled (default)
2. ✅ CORS restricted to SITE_URL domain
3. ✅ SQL injection protected (parameterized queries)
4. ✅ Security headers configured
5. ✅ Rate limiting enabled on auth endpoints
6. ✅ Worker name validation enforced

### Monitoring in Production
- Monitor for failed authentication attempts (brute force)
- Alert on CORS policy violations
- Track error rates by endpoint
- Monitor database connection pool saturation

## Support

For deployment issues:
1. Check logs: `docker compose logs <service_name>`
2. Verify health checks: `docker compose ps`
3. Test connectivity: Check firewall rules
4. Review environment: `docker compose config | grep -E "API_PORT|PROXY_PORT"`
