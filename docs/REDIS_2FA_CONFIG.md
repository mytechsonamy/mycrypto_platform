# Redis Configuration for Two-Factor Authentication

## Overview
This document provides detailed Redis configuration for 2FA operations in the MyCrypto Exchange platform. Redis is used for temporary token storage, rate limiting, and session management.

## Current Docker Compose Configuration

```yaml
redis:
  image: redis:7-alpine
  container_name: exchange_redis
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
  command: redis-server --appendonly yes --requirepass redis_dev_password
  healthcheck:
    test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
    interval: 10s
    timeout: 3s
    retries: 5
    start_period: 10s
  networks:
    - exchange_network
  labels:
    - "app=exchange"
    - "component=cache"
```

## 2FA Key Patterns

### 1. Setup Token Storage
**Key Pattern:** `2fa:setup:{userId}`
- **Type:** String (JSON)
- **TTL:** 900 seconds (15 minutes)
- **Size:** ~200 bytes (base64 encoded secret + metadata)
- **Purpose:** Temporary storage during 2FA setup process
- **Content Structure:**
  ```json
  {
    "secret": "base64_encoded_encrypted_secret",
    "backupCodes": ["code1_hash", "code2_hash", ...],
    "setupToken": "random_token_value",
    "createdAt": "2024-11-19T10:00:00Z",
    "expiresAt": "2024-11-19T10:15:00Z"
  }
  ```

**Usage Flow:**
1. User initiates 2FA setup
2. Service generates TOTP secret
3. Stores encrypted secret in Redis with 15-min TTL
4. Returns QR code and backup codes to user
5. User scans QR and verifies with TOTP code
6. System validates and moves secret to database (permanent storage)
7. Redis key automatically expires

### 2. Challenge Token Storage
**Key Pattern:** `2fa:challenge:{userId}`
- **Type:** String (JSON)
- **TTL:** 300 seconds (5 minutes)
- **Size:** ~100 bytes
- **Purpose:** Login challenge tokens
- **Content Structure:**
  ```json
  {
    "challengeToken": "random_challenge_token",
    "createdAt": "2024-11-19T10:00:00Z",
    "expiresAt": "2024-11-19T10:05:00Z",
    "ipAddress": "192.168.1.1"
  }
  ```

**Usage Flow:**
1. User logs in with valid credentials
2. If 2FA enabled, service creates challenge token
3. Stores token in Redis with 5-min TTL
4. Returns challenge token to client
5. User provides TOTP code with challenge token
6. System validates code and issues JWT
7. Redis key automatically expires

### 3. Rate Limiting Counters (Per User)
**Key Pattern:** `2fa:attempts:{userId}`
- **Type:** String (Integer counter)
- **TTL:** 900 seconds (15 minutes)
- **Size:** ~10 bytes
- **Purpose:** Track failed verification attempts
- **Increment Logic:**
  ```
  - On failed verification: increment counter
  - If counter >= 5: lock user for 15 minutes
  - If counter expires: reset on next attempt
  ```

**Usage Flow:**
1. User attempts 2FA code verification
2. Service retrieves counter (default: 0 if not exists)
3. If counter == 0: Set new key with 15-min TTL
4. If invalid code: Increment counter and check threshold
5. If counter >= 5: Return "Account locked" error
6. If valid code: Delete key (reset attempts)
7. Counter automatically expires after 15 minutes

**Implementation:**
```bash
# Pseudo-code for rate limiting logic
GET 2fa:attempts:{userId}
IF result >= 5:
    RETURN "User locked out for 15 minutes"
ELSE IF invalid_code:
    INCR 2fa:attempts:{userId}
    EXPIRE 2fa:attempts:{userId} 900
    SET new_attempts = GET 2fa:attempts:{userId}
    IF new_attempts >= 5:
        PUBLISH alert "2fa_lockout" {userId}
    RETURN "Invalid code, attempts: {new_attempts}/5"
ELSE:  # valid code
    DEL 2fa:attempts:{userId}
    RETURN "Success"
```

### 4. Rate Limiting Counters (Per IP)
**Key Pattern:** `2fa:attempts:ip:{ipAddress}`
- **Type:** String (Integer counter)
- **TTL:** 3600 seconds (1 hour)
- **Size:** ~10 bytes
- **Purpose:** Detect distributed brute force attacks
- **Threshold:** 50 attempts per IP per hour
- **Content:** Simple integer counter

**Usage Flow:**
1. Extract client IP address
2. Increment counter for IP
3. Set TTL to 1 hour on first attempt
4. If counter > 50: Log alert and potentially block IP
5. Counter resets hourly

### 5. Session Validation Cache
**Key Pattern:** `2fa:session:{sessionId}`
- **Type:** String (JSON)
- **TTL:** 86400 seconds (24 hours)
- **Size:** ~150 bytes
- **Purpose:** Cache 2FA validation status during session
- **Content Structure:**
  ```json
  {
    "userId": "user_uuid",
    "validated": true,
    "validatedAt": "2024-11-19T10:00:00Z",
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }
  ```

## Redis Commands for 2FA Operations

### Get Setup Data
```bash
GET 2fa:setup:{userId}
# Returns: JSON string with encrypted secret and backup codes
```

### Store Setup Data
```bash
SET 2fa:setup:{userId} "{json_data}" EX 900
# TTL: 15 minutes
```

### Check Verification Attempts
```bash
GET 2fa:attempts:{userId}
# Returns: attempt count (0-5) or nil if not set
```

### Increment Failed Attempts
```bash
INCR 2fa:attempts:{userId}
EXPIRE 2fa:attempts:{userId} 900
# Atomic increment, then set 15-min TTL
```

### Clear Attempts (on success)
```bash
DEL 2fa:attempts:{userId}
# Removes counter key
```

### Check IP-based Rate Limit
```bash
GET 2fa:attempts:ip:{ipAddress}
INCRBY 2fa:attempts:ip:{ipAddress} 1
EXPIRE 2fa:attempts:ip:{ipAddress} 3600
```

## Production Configuration Recommendations

### 1. Redis Cluster Setup
```yaml
redis-cluster:
  image: redis:7-alpine
  # Deploy with cluster mode enabled
  command: redis-server --cluster-enabled yes --cluster-node-timeout 5000
  # Multiple nodes for high availability
  replicas: 3
```

### 2. Redis Persistence
```bash
# Existing RDB (snapshot) + AOF (append-only file)
redis-server --appendonly yes --appendfsync everysec

# Recommended production settings:
--appendonly yes           # Enable AOF persistence
--appendfsync everysec     # Sync every second (balance safety and performance)
--maxmemory 512mb          # Prevent unbounded growth
--maxmemory-policy allkeys-lru  # Evict LRU keys when full
--requirepass strong_password  # Strong authentication
--timeout 0                # Disable client timeout
--tcp-keepalive 300        # Detect dead connections
```

### 3. Memory Management
```bash
# Estimate Redis memory usage for 2FA:
# Per active user during setup: ~300 bytes (key + value)
# Per rate-limited user: ~100 bytes
# Per IP tracking: ~50 bytes

# With 10,000 concurrent setups: ~3 MB
# With 50,000 tracked IPs: ~2.5 MB
# Recommended allocation: 512 MB - 1 GB for production
```

### 4. Key Eviction Policy
```bash
# Use LRU (Least Recently Used) eviction:
maxmemory-policy allkeys-lru

# This ensures older tokens are evicted first
# while keeping recent attempts counters
```

### 5. Monitoring
```bash
# Monitor key metrics:
redis-cli INFO stats
redis-cli INFO memory
redis-cli INFO clients
redis-cli KEYS "2fa:*" | wc -l

# Set up alerts for:
# - Memory usage > 80% of maxmemory
# - Number of keys > expected threshold
# - Evicted keys counter increasing unexpectedly
```

## Security Considerations

### 1. Authentication
- Always use `--requirepass` in production
- Store password in AWS Secrets Manager
- Rotate password every 90 days

### 2. Network Isolation
- Redis should not be exposed to internet
- Only accessible from auth-service container
- Use VPC security groups to restrict access

### 3. Encryption in Transit
- Use Redis TLS for production
- Set `--tls-port 6380` and SSL certificates
- Enable `--tls-replication` for cluster replication

### 4. Data Expiration
- All 2FA keys have TTL to auto-cleanup
- Prevents accumulation of stale data
- Reduces security risk of leaked keys

### 5. Sensitive Data Handling
- Encrypted secrets stored in Redis (encryption key kept in env)
- Attempt counters are non-sensitive
- Consider not logging full keys in production

## Monitoring and Alerting

### Key Metrics to Monitor
1. **Memory Usage**: `redis_used_memory` / `redis_maxmemory`
2. **Connected Clients**: `redis_connected_clients`
3. **Key Count**: Approximate with `DBSIZE`
4. **Evicted Keys**: `redis_evicted_keys_total`
5. **Commands/sec**: `redis_commands_processed_total`

### Example Prometheus Queries
```promql
# Memory usage percentage
redis_memory_used_bytes / redis_memory_max_bytes * 100

# Keys by pattern
redis_keys{pattern="2fa:*"}

# Failed commands
rate(redis_commands_failed_total[5m])

# Eviction rate
rate(redis_evicted_keys_total[5m])
```

### Alerts to Configure
- High memory usage (> 80%)
- High eviction rate (> 100/sec)
- Connection failures
- Slowlog entries increasing
- Replication lag (in cluster)

## Backup and Disaster Recovery

### RDB Snapshots
```bash
# Default: 900 seconds (15 min) if >= 1 key changed
# Production recommendation: More frequent snapshots
# Example: Save every 5 minutes if >= 1000 keys changed
save 300 1000
save 60 10000
```

### AOF Persistence
```bash
# Append-Only File for durability
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec  # Sync every second
```

### Backup Locations
- Primary: Local Docker volume `redis_data:/data`
- Backup: S3 bucket (automated daily snapshots)
- Restore: Mount S3 backup, restore RDB/AOF

### Recovery Procedure
1. Stop auth-service and dependent services
2. Stop Redis container
3. Download latest backup from S3
4. Restore RDB/AOF to Redis data volume
5. Verify data integrity with `redis-check-aof` and `redis-check-rdb`
6. Start Redis container
7. Start auth-service
8. Monitor logs for recovery issues

## Development vs Production

### Development (Current)
- Single Redis instance
- RDB persistence only
- No TLS
- Password: redis_dev_password
- No cluster

### Production Recommended
- Redis Cluster (3+ nodes)
- RDB + AOF persistence
- TLS encryption enabled
- Strong password from Secrets Manager
- Regular backups to S3
- Monitoring and alerts enabled
- Replication lag monitoring

## Testing 2FA with Redis

### Manual Testing
```bash
# Connect to Redis
docker-compose exec redis redis-cli -a redis_dev_password

# Test setup key
SET 2fa:setup:test-user '{"secret":"test"}'
EXPIRE 2fa:setup:test-user 900
GET 2fa:setup:test-user

# Test rate limiting
INCR 2fa:attempts:test-user
EXPIRE 2fa:attempts:test-user 900
GET 2fa:attempts:test-user

# Monitor keys
MONITOR  # Watch all commands in real-time
KEYS "2fa:*"  # List all 2FA keys
```

### Load Testing
```bash
# Test Redis performance with high 2FA traffic
redis-benchmark -h redis -a redis_dev_password -t get,set -n 10000 -c 100

# Expected performance:
# - 50,000+ SET operations/sec
# - 100,000+ GET operations/sec
# - Latency < 5ms (p99)
```

## References
- Redis Documentation: https://redis.io/documentation
- Redis Cluster: https://redis.io/topics/cluster-tutorial
- Redis Sentinel: https://redis.io/topics/sentinel
- Redis Security: https://redis.io/topics/security
