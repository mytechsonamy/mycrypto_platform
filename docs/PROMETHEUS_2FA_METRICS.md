# Prometheus Metrics for Two-Factor Authentication

## Overview
This document describes all Prometheus metrics that the Auth Service must expose for 2FA monitoring. These metrics are critical for detecting security issues and monitoring system health.

## Metric Types

### Counter Metrics
Counters only increase and never decrease. They measure cumulative counts of events.

### Gauge Metrics
Gauges can increase or decrease. They measure current values.

### Histogram Metrics
Histograms measure distributions of values. They generate multiple time series.

## 2FA Metrics

### 1. Setup Process Metrics

#### auth_2fa_setup_total
- **Type**: Counter
- **Description**: Total number of 2FA setup attempts
- **Labels**: `status` (success, failed)
- **Example Usage**:
  ```bash
  # Increment on setup completion
  counter.inc({ status: 'success' })
  counter.inc({ status: 'failed' })

  # Query: Success rate
  rate(auth_2fa_setup_total{status="success"}[5m])

  # Query: Failure rate
  (rate(auth_2fa_setup_total{status="failed"}[5m]) / rate(auth_2fa_setup_total[5m]))
  ```
- **Alert Threshold**: > 20% failure rate over 5 minutes
- **Usage**: Track 2FA enablement success/failure during onboarding

#### auth_2fa_setup_duration_seconds
- **Type**: Histogram with buckets [0.1, 0.5, 1.0, 2.0, 5.0, 10.0]
- **Description**: Time taken to complete 2FA setup process
- **Labels**: `status` (success, failed)
- **Example Usage**:
  ```bash
  # Measure setup time
  histogram.observe(0.456, { status: 'success' })

  # Query: P95 setup time
  histogram_quantile(0.95, rate(auth_2fa_setup_duration_seconds_bucket[5m]))

  # Query: Average setup time
  rate(auth_2fa_setup_duration_seconds_sum[5m]) / rate(auth_2fa_setup_duration_seconds_count[5m])
  ```
- **Expected Range**: 0.1 - 2.0 seconds
- **Usage**: Detect slowdowns in setup process

### 2. Verification During Setup

#### auth_2fa_verify_total
- **Type**: Counter
- **Description**: Total TOTP code verification attempts during setup
- **Labels**: `status` (success, failed)
- **Example Usage**:
  ```bash
  # Increment on verification attempt
  counter.inc({ status: 'success' })
  counter.inc({ status: 'failed' })

  # Query: Failure rate (should be low)
  (rate(auth_2fa_verify_total{status="failed"}[5m]) / rate(auth_2fa_verify_total[5m]))
  ```
- **Alert Threshold**: > 30% failure rate over 5 minutes
- **Usage**: Detect issues with QR code or time synchronization

#### auth_2fa_verify_duration_seconds
- **Type**: Histogram
- **Description**: Time taken to verify TOTP code during setup
- **Expected Range**: 0.01 - 0.5 seconds
- **Usage**: Verify backend processing is fast

### 3. Login Validation Metrics

#### auth_2fa_validate_total
- **Type**: Counter
- **Description**: Total 2FA code validations during login (most important metric)
- **Labels**: `status` (success, failed), `method` (totp, backup)
- **Example Usage**:
  ```bash
  # Increment on validation
  counter.inc({ status: 'success', method: 'totp' })
  counter.inc({ status: 'failed', method: 'totp' })
  counter.inc({ status: 'success', method: 'backup' })
  counter.inc({ status: 'failed', method: 'backup' })

  # Query: Overall failure rate
  (rate(auth_2fa_validate_total{status="failed"}[5m]) / rate(auth_2fa_validate_total[5m]))

  # Query: Backup code usage ratio
  rate(auth_2fa_validate_total{method="backup"}[1h]) / rate(auth_2fa_validate_total[1h])
  ```
- **Critical Alert Threshold**: > 40% failure rate (possible brute force)
- **Warning Alert Threshold**: > 20% failure rate over 15 minutes
- **Usage**: Detect brute force attacks and legitimate user issues

#### auth_2fa_validate_duration_seconds
- **Type**: Histogram
- **Description**: Time taken to validate 2FA code during login
- **Expected Range**: 0.01 - 0.5 seconds
- **Usage**: Monitor authentication latency impact

### 4. Failed Attempts and Rate Limiting

#### auth_2fa_failed_total
- **Type**: Counter
- **Description**: Total failed 2FA verification attempts
- **Labels**: `reason` (invalid_code, rate_limited, locked, expired, error)
- **Example Usage**:
  ```bash
  counter.inc({ reason: 'invalid_code' })
  counter.inc({ reason: 'rate_limited' })
  counter.inc({ reason: 'locked' })
  counter.inc({ reason: 'expired' })
  counter.inc({ reason: 'error' })

  # Query: Brute force attempts (same user, multiple attempts)
  rate(auth_2fa_failed_total{reason="invalid_code"}[5m])
  ```
- **Usage**: Detailed failure analysis

#### auth_2fa_lockout_total
- **Type**: Counter
- **Description**: Total 2FA lockout events (user exceeded max attempts)
- **Labels**: (none)
- **Example Usage**:
  ```bash
  counter.inc()

  # Query: Lockout rate
  rate(auth_2fa_lockout_total[5m])

  # Query: Total lockouts in 5 minutes
  increase(auth_2fa_lockout_total[5m])
  ```
- **Alert Threshold**: > 10 lockouts per 5 minutes indicates attack
- **Usage**: Detect brute force attacks

#### auth_2fa_rate_limit_hits_total
- **Type**: Counter
- **Description**: Total times a user hit the rate limit
- **Labels**: `scope` (user, ip)
- **Example Usage**:
  ```bash
  counter.inc({ scope: 'user' })
  counter.inc({ scope: 'ip' })

  # Query: User-level rate limits
  rate(auth_2fa_rate_limit_hits_total{scope="user"}[5m])
  ```
- **Usage**: Monitor rate limiting effectiveness

### 5. Backup Code Metrics

#### auth_2fa_backup_used_total
- **Type**: Counter
- **Description**: Total backup codes used for authentication
- **Labels**: (none)
- **Example Usage**:
  ```bash
  counter.inc()

  # Query: Backup code usage rate
  rate(auth_2fa_backup_used_total[1h])
  ```
- **Warning Alert Threshold**: > 2 per hour per user (anomaly)
- **Usage**: Detect users who lost access to authenticator app

#### auth_2fa_backup_exhausted_total
- **Type**: Counter
- **Description**: Total users who have used all backup codes
- **Labels**: (none)
- **Example Usage**:
  ```bash
  counter.inc()

  # Query: Exhaustion rate
  rate(auth_2fa_backup_exhausted_total[1h])
  ```
- **Alert Threshold**: Any increase warrants user contact
- **Usage**: Identify users needing backup code regeneration

### 6. Disable/Management Metrics

#### auth_2fa_disabled_total
- **Type**: Counter
- **Description**: Total 2FA disablements
- **Labels**: `reason` (user_request, admin_request, security_incident)
- **Example Usage**:
  ```bash
  counter.inc({ reason: 'user_request' })

  # Query: Disablement rate
  rate(auth_2fa_disabled_total[1h])
  ```
- **Info Alert Threshold**: > 5 disablements per hour (audit)
- **Usage**: Audit trail of security changes

#### auth_2fa_secret_rotated_total
- **Type**: Counter
- **Description**: Total TOTP secret rotations
- **Labels**: `reason` (user_generated, admin_forced, security_incident)
- **Example Usage**:
  ```bash
  counter.inc({ reason: 'user_generated' })
  ```
- **Usage**: Track security management activities

### 7. Infrastructure Metrics

#### auth_2fa_encryption_key_errors_total
- **Type**: Counter
- **Description**: Errors during TOTP secret encryption/decryption
- **Labels**: `operation` (encrypt, decrypt), `error` (invalid_key, encoding_error, crypto_error)
- **Example Usage**:
  ```bash
  counter.inc({ operation: 'decrypt', error: 'invalid_key' })

  # Query: Any encryption errors
  rate(auth_2fa_encryption_key_errors_total[5m]) > 0
  ```
- **Critical Alert Threshold**: > 0 (indicates key misconfiguration)
- **Usage**: Detect encryption infrastructure issues

#### auth_2fa_redis_errors_total
- **Type**: Counter
- **Description**: Redis connection/operation errors during 2FA
- **Labels**: `operation` (set, get, incr, delete)
- **Example Usage**:
  ```bash
  counter.inc({ operation: 'get' })

  # Query: Redis operation failure rate
  rate(auth_2fa_redis_errors_total[5m])
  ```
- **Alert Threshold**: > 5 errors per minute
- **Usage**: Monitor Redis connectivity

#### auth_2fa_database_errors_total
- **Type**: Counter
- **Description**: Database errors during 2FA operations
- **Labels**: `operation` (read, write, delete)
- **Example Usage**:
  ```bash
  counter.inc({ operation: 'write' })
  ```
- **Alert Threshold**: > 5 errors per minute
- **Usage**: Monitor database connectivity

### 8. Time Synchronization Metrics

#### auth_2fa_time_skew_detected_total
- **Type**: Counter
- **Description**: Times server time was significantly out of sync
- **Labels**: `skew_seconds` (bucket: 0-1, 1-5, 5-30, 30+)
- **Example Usage**:
  ```bash
  counter.inc({ skew_seconds: '5-30' })

  # Query: Any time skew detected
  rate(auth_2fa_time_skew_detected_total[1h]) > 0
  ```
- **Alert Threshold**: > 0 occurrences (indicates NTP issues)
- **Usage**: Monitor server time synchronization

## Implementation Examples

### NestJS with prom-client
```typescript
import { Counter, Histogram, register } from 'prom-client';

// Create counters
export const twoFactorSetupCounter = new Counter({
  name: 'auth_2fa_setup_total',
  help: 'Total 2FA setup attempts',
  labelNames: ['status']
});

// Create histogram
export const twoFactorValidateDuration = new Histogram({
  name: 'auth_2fa_validate_duration_seconds',
  help: 'Time to validate 2FA code',
  buckets: [0.01, 0.05, 0.1, 0.5, 1.0]
});

// In service method
async validateCode(userId: string, code: string): Promise<boolean> {
  const start = Date.now();
  try {
    const result = await verifyTOTP(code);
    twoFactorValidateCounter.inc({ status: 'success', method: 'totp' });
    twoFactorValidateDuration.observe((Date.now() - start) / 1000);
    return result;
  } catch (error) {
    twoFactorValidateCounter.inc({ status: 'failed', method: 'totp' });
    twoFactorValidateDuration.observe((Date.now() - start) / 1000);
    throw error;
  }
}

// Expose metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
});
```

## Alert Rules Summary

| Alert | Metric | Threshold | Severity | Action |
|-------|--------|-----------|----------|--------|
| High2FASetupFailureRate | auth_2fa_setup_total | >20% over 5m | Warning | Check encryption/storage |
| High2FAVerificationFailureRate | auth_2fa_verify_total | >30% over 5m | Warning | Check time sync |
| High2FAValidationFailureRate | auth_2fa_validate_total | >40% over 5m | Critical | Possible brute force |
| Excessive2FALockouts | auth_2fa_lockout_total | >10 in 5m | Warning | Review IPs |
| UnusualBackupCodeUsage | auth_2fa_backup_used_total | >2/hour | Warning | Contact user |
| EncryptionKeyErrors | auth_2fa_encryption_key_errors_total | >0 | Critical | Check key config |
| RedisErrors | auth_2fa_redis_errors_total | >5/min | Warning | Check Redis |
| TimeSyncErrors | auth_2fa_time_skew_detected_total | >0 | Critical | Check NTP |

## Query Examples for Debugging

### Find users with excessive failed attempts
```promql
topk(10, increase(auth_2fa_failed_total{reason="invalid_code"}[1h]) by (user_id))
```

### Monitor backup code depletion
```promql
rate(auth_2fa_backup_used_total[1h]) > 0.5
```

### Check 2FA adoption rate
```promql
(increase(auth_2fa_setup_total{status="success"}[7d]) /
 increase(auth_registration_total[7d])) * 100
```

### Identify time synchronization issues
```promql
rate(auth_2fa_time_skew_detected_total[1h]) > 0
```

## Dashboard Panels

### Key Panels in auth-2fa Dashboard
1. **Setup Success/Failure Rate** - Tracks 2FA onboarding health
2. **Validation Failure Rate** - Brute force detection (CRITICAL)
3. **Lockout Trends** - Attack indicators
4. **Backup Code Usage** - Anomaly detection
5. **System Health** - Encryption/Redis/Database errors
6. **Time Skew Detection** - Infrastructure health

## Production Recommendations

### Metrics Retention
- Keep metrics for at least 30 days in Prometheus
- Archive metrics to S3 monthly for long-term audit
- Retention size: ~10GB per month expected

### Scrape Configuration
```yaml
scrape_configs:
  - job_name: 'auth-service'
    static_configs:
      - targets: ['auth-service:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s
    scrape_timeout: 10s
```

### Alert Routing
Route 2FA alerts to:
- Critical (Brute force, Encryption errors): PagerDuty + Slack #security
- Warning (High failure rate, Lockouts): Slack #auth-team
- Info (Disablements, Audit): Slack #security-audit

## Testing Metrics

### Unit Test Example
```typescript
it('should increment setup success counter', async () => {
  const counterBefore = twoFactorSetupCounter.get();
  await service.generateSecret('user123', 'user@example.com');
  const counterAfter = twoFactorSetupCounter.get();
  expect(counterAfter).toBeGreaterThan(counterBefore);
});
```

### Integration Test Example
```typescript
it('should record validation attempt with timing', async () => {
  const result = await service.validateCode('user123', '123456');
  const metrics = await register.metrics();
  expect(metrics).toContain('auth_2fa_validate_duration_seconds');
});
```

## References
- Prometheus Metrics Types: https://prometheus.io/docs/concepts/metric_types/
- prom-client Library: https://github.com/siimon/prom-client
- Best Practices: https://prometheus.io/docs/practices/naming/
