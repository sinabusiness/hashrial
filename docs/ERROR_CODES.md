# Hashrial API & Proxy Error Reference

## HTTP Status Codes

### 2xx Success
| Code | Meaning |
|------|---------|
| 200 | Request successful |
| 201 | Resource created |

### 4xx Client Errors
| Code | Meaning | Common Causes |
|------|---------|---------------|
| 400 | Bad Request | Invalid input, missing required fields, validation failed |
| 401 | Unauthorized | Missing or invalid authentication token |
| 409 | Conflict | Resource already exists (e.g., duplicate username) |
| 429 | Too Many Requests | Rate limit exceeded |

### 5xx Server Errors
| Code | Meaning | Common Causes |
|------|---------|---------------|
| 500 | Internal Server Error | Unexpected server error, check logs |
| 503 | Service Unavailable | Database down, Redis unavailable, pool not responding |

---

## API Error Response Format

All error responses follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description"
  },
  "request_id": "randomstring123"
}
```

Use the `request_id` to correlate errors in server logs for debugging.

---

## API Error Codes

### Authentication & Authorization

| Code | HTTP | Meaning | Solution |
|------|------|---------|----------|
| `AUTH_FAILED` | 401 | Invalid email or password | Verify credentials, check for typos |
| `TOKEN_EXPIRED` | 401 | JWT token has expired (30 days) | User must login again |
| `NO_TOKEN` | 401 | Missing Authorization header | Add: `Authorization: Bearer <token>` |
| `INVALID_TOKEN` | 401 | Token signature invalid or tampered | User must login again |

### Registration

| Code | HTTP | Meaning | Solution |
|------|------|---------|----------|
| `USER_EXISTS` | 409 | Username or email already taken | Choose different username/email |
| `INVALID_USERNAME` | 400 | Username must be 3-20 lowercase letters/numbers | Use valid username format |
| `WEAK_PASSWORD` | 400 | Password must be at least 10 characters | Create stronger password |
| `REGISTER_FAILED` | 500 | Unexpected error during registration | Retry, contact support if persists |

### Payout Management

| Code | HTTP | Meaning | Solution |
|------|------|---------|----------|
| `NO_PAYOUT_ADDRESS` | 400 | Bitcoin address not set | Set payout address in Settings first |
| `INVALID_ADDRESS` | 400 | Bitcoin address failed validation | Verify address format (P2PKH, P2SH, bech32) |
| `INSUFFICIENT_BALANCE` | 400 | Balance below minimum payout | Minimum is 0.001 BTC, wait for more earnings |
| `PENDING_REQUEST` | 409 | Payout request already pending | Wait for pending payout to complete |
| `PAYOUT_FAILED` | 500 | Error creating payout request | Contact support with request_id |

### Dashboard & Data

| Code | HTTP | Meaning | Solution |
|------|------|---------|----------|
| `DASHBOARD_LOAD_FAILED` | 500 | Failed to load dashboard data | Check network, API status |
| `HASHRATE_LOAD_FAILED` | 500 | Failed to fetch hashrate history | Retry, ensure miners are connected |
| `WORKERS_LOAD_FAILED` | 500 | Failed to fetch worker list | Ensure at least one worker is connected |

### Rate Limiting

| Code | HTTP | Meaning | Solution |
|------|------|---------|----------|
| `RATE_LIMIT_AUTH` | 429 | Too many login attempts (5 per 15 min) | Wait 15 minutes before trying again |
| `RATE_LIMIT_REGISTER` | 429 | Too many registrations (20 per hour) | Wait 1 hour before registering again |
| `RATE_LIMIT_API` | 429 | General API rate limit (120 per min) | Implement exponential backoff in client |

### Server & Services

| Code | HTTP | Meaning | Solution |
|------|------|---------|----------|
| `DATABASE_ERROR` | 500 | Database connection failed | API will auto-retry; if persists, contact support |
| `REDIS_ERROR` | 500 | Redis/cache service unavailable | Temporary outage; retry in 30 seconds |
| `POOL_NOT_READY` | 503 | Upstream Antpool disconnected | Connection will auto-restore; retry in 10s |
| `BTC_PRICE_UNAVAILABLE` | 503 | Bitcoin price service temporarily down | Retry in 30 seconds |

---

## Stratum Protocol Error Codes (Proxy)

These codes are sent in JSON responses to miners on the stratum protocol:

### Standard Stratum Errors

| Code | Message | Meaning |
|------|---------|---------|
| 20 | Pool not ready / Unauthorized / Rate limit exceeded | General mining error |
| 24 | Unauthorized | Mining credentials invalid, worker doesn't exist |
| 25 | Not subscribed | Miner attempted operation before subscribing |

### Hashrial-Specific Errors

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| 20 | Invalid worker name format | Worker name contains invalid characters | Use alphanumeric, dots, dashes, underscores only |
| 20 | Rate limit exceeded | Too many shares from this worker | Check if miner is properly configured |
| 20 | Pool not ready | Upstream Antpool connection down | Pool automatically reconnects; retry mining |

---

## Common Error Scenarios & Solutions

### "Unauthorized" on mining.authorize
**Cause**: Username not registered in Hashrial, typo in username  
**Solution**: 
1. Verify username is registered: `curl -X POST https://hashrial.com/api/auth/login -d '{"email":"...","password":"..."}'`
2. Check miner config has correct username
3. Try with different worker name: `username.worker1`

### "Pool not ready" during share submission
**Cause**: Upstream Antpool disconnected or overloaded  
**Solution**:
1. This is temporary; pool auto-reconnects
2. Retry share submission
3. If persistent > 30 minutes, check: Antpool status, network connectivity

### Account locked after failed logins
**Cause**: 5+ failed login attempts in 15 minutes  
**Solution**:
1. Wait 15 minutes before trying again
2. Verify password is correct
3. Reset password if needed

### Payout address rejected
**Cause**: Bitcoin address format invalid  
**Solution**:
1. Verify address format:
   - P2PKH: starts with `1`, 26-35 chars
   - P2SH: starts with `3`, 26-35 chars
   - Bech32: starts with `bc1`, 42-62 chars
2. Copy address carefully from wallet (no extra spaces)
3. Test address checksum on blockchain explorer before using

---

## Debugging with Request IDs

When you encounter an error:

1. **Note the `request_id`** from the error response
2. **Search server logs**: `docker logs api | grep request_id`
3. **Share with support**: Include request_id, timestamp, and steps to reproduce

Example:
```bash
# Error response includes request_id: "abc123xyz"
docker logs hashrial-api | grep "abc123xyz"

# Output shows detailed error trace for debugging
```

---

## Rate Limiting Details

### Auth Endpoints
- **Limit**: 5 attempts per IP per 15 minutes
- **Headers**: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`
- **When Hit**: Returns 429 with retry-after header

### General API
- **Limit**: 120 requests per minute per authenticated user
- **When Hit**: Returns 429, exponential backoff recommended

### Proxy (Mining)
- **Per IP**: 50 concurrent connections max
- **Per Worker**: 1000 shares per second
- **When Hit**: Connection closed by server

---

## Error Response Examples

### Failed Login
```json
{
  "error": {
    "code": "AUTH_FAILED",
    "message": "Invalid credentials"
  },
  "request_id": "req_60b2d8e9"
}
```

### Missing Payout Address
```json
{
  "error": {
    "code": "NO_PAYOUT_ADDRESS",
    "message": "Set a payout address first in Settings"
  },
  "request_id": "req_a3f1b2c4"
}
```

### Rate Limited
```json
{
  "error": {
    "code": "RATE_LIMIT_API",
    "message": "Too many requests"
  },
  "request_id": "req_f9e8d7c6",
  "retry_after": 15
}
```

---

## Support

For persistent errors:
1. Save the error response (including `request_id` and timestamp)
2. Describe the steps that led to the error
3. Include relevant logs: `docker logs api | tail -100`
4. Contact support with this information
