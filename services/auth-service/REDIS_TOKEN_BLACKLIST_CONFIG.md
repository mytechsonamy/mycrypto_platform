# Redis Token Blacklist Configuration

## Overview

This document describes the Redis configuration for JWT token blacklisting in the MyCrypto Exchange authentication service. The token blacklist is used to invalidate tokens before their natural expiration time, particularly during logout operations and password resets.

## Purpose

The token blacklist serves the following purposes:

1. **Immediate Logout**: Instantly invalidate tokens when users explicitly log out
2. **Session Termination**: Terminate all active sessions when security-sensitive operations occur (password reset, 2FA changes)
3. **Token Revocation**: Revoke tokens in case of suspicious activity or security breaches
4. **Security Compliance**: Ensure sessions are properly terminated according to security requirements

## Redis Configuration

### Key Pattern

```
token:blacklist:{jti}
```

Where `{jti}` is the JWT ID (jti claim) from the token payload.

Example:
```
token:blacklist:550e8400-e29b-41d4-a716-446655440000
```

### Data Structure

**Type**: Simple String or Hash
**Value**: Placeholder value (can be empty string or timestamp)

#### Option 1: Simple String (Recommended)
```redis
SET token:blacklist:550e8400-e29b-41d4-a716-446655440000 "" EX 3600
```

#### Option 2: Hash (For Audit Trail)
```redis
HSET token:blacklist:550e8400-e29b-41d4-a716-446655440000 revoked_at "2024-11-19T10:30:00Z" reason "logout"
EXPIRE token:blacklist:550e8400-e29b-41d4-a716-446655440000 3600
```

### Time-To-Live (TTL)

**TTL**: Matches the JWT token expiration time

The TTL should align with the `exp` claim of the JWT token:
- Default JWT expiration: **1 hour (3600 seconds)**
- Refresh token blacklist: **7 days (604800 seconds)**

Example calculation:
```
TTL = token_expiration_time - current_time
```

Redis automatically deletes expired keys, so no manual cleanup is needed.

## Implementation Details

### Authentication Service Integration

```typescript
// Pseudocode example
async function logoutUser(token: JWTToken): Promise<void> {
  const jti = token.payload.jti;
  const expiresIn = token.payload.exp - Math.floor(Date.now() / 1000);

  // Add token to blacklist
  await redisClient.setex(
    `token:blacklist:${jti}`,
    expiresIn,
    JSON.stringify({
      revoked_at: new Date().toISOString(),
      reason: 'logout'
    })
  );
}

async function isTokenBlacklisted(jti: string): Promise<boolean> {
  const key = `token:blacklist:${jti}`;
  const exists = await redisClient.exists(key);
  return exists === 1;
}
```

### Token Validation Workflow

1. Extract `jti` claim from JWT token
2. Check Redis for key `token:blacklist:{jti}`
3. If key exists → Token is blacklisted → Deny access
4. If key doesn't exist → Token is valid → Allow access

## Scenarios for Token Blacklisting

### Logout
```
User clicks "Logout" → Generate blacklist entry → Clear local storage
```

### Password Reset
```
User resets password → Blacklist all tokens → Force re-login on all devices
```

### Two-Factor Authentication (2FA) Changes
```
User changes 2FA settings → Blacklist all tokens → Enforce new authentication method
```

### Suspicious Activity
```
Anomaly detected → Blacklist current token → Force re-authentication
```

## Redis Configuration File

### Redis Server Settings

```redis
# redis.conf configuration for token blacklist

# General
databases 16
port 6379
bind 127.0.0.1

# Memory management
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec

# Keyspace expiration
hz 10

# Client management
timeout 0
tcp-keepalive 300
```

## Environment Variables

Configure Redis connection in your `.env` file:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=your-secure-password
REDIS_TIMEOUT=5000
REDIS_KEY_PREFIX=token:blacklist:
```

## Monitoring and Maintenance

### Monitoring Queries

```bash
# Monitor key count
DBSIZE

# Monitor specific key pattern
SCAN 0 MATCH "token:blacklist:*" COUNT 100

# Check memory usage
INFO memory

# Monitor expiration
SCAN 0 MATCH "token:blacklist:*" COUNT 100 | xargs PTTL
```

### Sample Monitoring Commands

```redis
# Get number of blacklisted tokens
KEYS token:blacklist:* | wc -l

# Get total memory used by blacklist keys
SCAN 0 MATCH "token:blacklist:*" COUNT 1000

# Monitor Redis memory stats
INFO stats
```

### Health Check

```redis
# Verify Redis connectivity
PING
# Expected response: PONG

# Check token blacklist size
DBSIZE

# Monitor memory usage
INFO memory
```

## Performance Considerations

### Expected Performance

- **Write Operation**: < 5ms (SET with EX)
- **Read Operation**: < 2ms (EXISTS check)
- **Memory per Token**: ~50-100 bytes

### Capacity Planning

With 2GB Redis memory:
- Estimated blacklist capacity: **20-40 million tokens**
- With 1-hour expiration: **~5,500 tokens/second** sustained

### Optimization Tips

1. **Use String Keys Over Hashes**: Simpler structure for faster access
2. **Enable Eviction Policies**: Set `maxmemory-policy allkeys-lru`
3. **Monitor Memory Growth**: Alert if memory usage exceeds 80%
4. **Batch Operations**: Use MSET for bulk token additions

## Security Considerations

### Access Control

```redis
# Configure Redis user with limited permissions
ACL SETUSER blacklist-user on >password-hash +@read +@write -@all ~token:blacklist:*
```

### Network Security

- Run Redis on private network only
- Use firewall rules to restrict access
- Enable TLS/SSL for remote connections
- Change default port from 6379

### Data Privacy

- No sensitive data stored in blacklist values
- Only JTI (JWT ID) used as key
- All entries automatically expire
- Consider encryption at rest for compliance

## Integration Checklist

- [ ] Redis server running and accessible
- [ ] Connection pool configured
- [ ] Key pattern naming confirmed
- [ ] TTL calculation implemented
- [ ] Blacklist check in token validation middleware
- [ ] Monitoring and alerting configured
- [ ] Error handling for Redis failures
- [ ] Graceful degradation for Redis outages
- [ ] Load testing completed
- [ ] Documentation reviewed

## Troubleshooting

### Issue: Tokens not being revoked immediately

**Solution**: Check Redis connection and verify TTL is set correctly:
```redis
TTL token:blacklist:550e8400-e29b-41d4-a716-446655440000
```

### Issue: Redis memory usage growing rapidly

**Solution**: Verify keys are expiring correctly:
```redis
SCAN 0 MATCH "token:blacklist:*" COUNT 1000
PTTL token:blacklist:550e8400-e29b-41d4-a716-446655440000
```

### Issue: Redis connection timeouts

**Solution**: Adjust connection pool and timeout settings:
```env
REDIS_POOL_MIN=10
REDIS_POOL_MAX=50
REDIS_TIMEOUT=10000
```

## References

- [Redis Documentation](https://redis.io/documentation)
- [JWT Token Best Practices](https://tools.ietf.org/html/rfc7519)
- [Redis Persistence](https://redis.io/topics/persistence)
- [Redis Security](https://redis.io/topics/security)
