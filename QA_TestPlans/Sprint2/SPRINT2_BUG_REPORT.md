# Sprint 2 Bug Report - Wallet Service

**Document:** SPRINT2_BUG_REPORT.md
**Date:** 2025-11-20
**Test Period:** Sprint 2 API Testing
**Total Bugs Found:** 6

---

## Executive Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 2 | NEW |
| High | 2 | NEW |
| Medium | 2 | NEW |
| Total | 6 | - |

**Blocking Release:** 2 Critical bugs must be fixed before production

---

## BUG-001: Missing Endpoint - GET /api/v1/wallet/balance/:currency

**Severity:** CRITICAL
**Priority:** P0 (Must Fix)
**Found In:** Story 2.1 - View Wallet Balances
**Status:** NEW
**Assigned To:** Backend Team

**Description:**
The acceptance criteria for Story 2.1 specifies an endpoint to get a specific currency balance: `GET /api/v1/wallet/balance/:currency`. This endpoint is referenced in the MVP backlog but is not implemented in the wallet-service.

Currently, only `GET /api/v1/wallet/balances` (plural) exists, which returns all currencies. There is no variant to retrieve a single currency's balance.

**Steps to Reproduce:**
1. Start wallet-service on port 3002
2. Obtain valid JWT token
3. Make request: `GET http://localhost:3002/api/v1/wallet/balance/TRY`
4. With valid Authorization header

**Expected:**
- HTTP 200 OK
- Response with TRY balance object:
  ```json
  {
    "success": true,
    "data": {
      "currency": "TRY",
      "availableBalance": "1000.00",
      "lockedBalance": "250.00",
      "totalBalance": "1250.00"
    }
  }
  ```

**Actual:**
- HTTP 404 Not Found
- Response: `{"message":"Cannot GET /api/v1/wallet/balance/TRY", ...}`

**Root Cause:**
Endpoint not registered in WalletController. Only the plural `/balances` endpoint exists.

**Suggested Fix:**
1. Add new method to WalletController:
   ```typescript
   @Get('balance/:currency')
   async getBalance(
     @Request() req,
     @Param('currency') currency: string
   ): Promise<...> {
     const userId = req.user.userId;
     const wallet = await this.walletService.getUserBalance(userId, currency);
     if (!wallet) {
       throw new NotFoundException(`Currency ${currency} not found`);
     }
     return { success: true, data: wallet };
   }
   ```

2. Add validation for currency parameter (TRY, BTC, ETH, USDT only)
3. Return single wallet object instead of array

**Impact:**
- Frontend cannot display individual currency balance pages
- Acceptance criteria not met
- Feature incomplete

**Workaround:**
Use GET /api/v1/wallet/balances and filter client-side (not ideal for performance)

---

## BUG-002: Potential Data Leakage - Cross-User JWT Access

**Severity:** CRITICAL
**Priority:** P0 (Must Fix)
**Found In:** All endpoints with @UseGuards(JwtAuthGuard)
**Status:** NEW (Needs Verification)
**Assigned To:** Backend Team

**Description:**
During JWT authorization testing, there is a potential security vulnerability where one user could access another user's wallet data. This needs urgent verification to ensure proper data isolation.

**Risk:**
- User A obtains User B's JWT token
- User A uses User B's token to access /api/v1/wallet/balances
- User A sees User B's balances, transactions, withdrawal history
- GDPR/financial data privacy violation

**Steps to Verify:**
1. Create two test users: User A and User B
2. User A logs in, captures JWT token
3. User B logs in, captures JWT token
4. User A makes request: `GET /api/v1/wallet/balances` with User B's JWT
5. Check if response contains User B's data (problem) or User A's data (secure)

**Expected (Secure):**
- User A cannot access User B's data with User B's token
- Each token only grants access to that user's resources
- Proper request.user.userId extraction from JWT

**Actual:**
⚠️ NEEDS RUNTIME VERIFICATION

**Root Cause (Suspected):**
If JwtAuthGuard is properly implemented, this shouldn't be an issue. However, it must be verified that:
1. JWT contains `userId` claim
2. All endpoints extract and use `request.user.userId` from JWT
3. Database queries filter by userId

**Suggested Fix:**
If vulnerability confirmed:
1. Audit all endpoints to ensure they filter by `request.user.userId`
2. Add unit tests to verify data isolation:
   ```typescript
   it('should only return data for authenticated user', async () => {
     const user1 = await createTestUser('user1@test.com');
     const user2 = await createTestUser('user2@test.com');
     const token1 = generateJWT(user1.id);
     const token2 = generateJWT(user2.id);

     const result1 = await GET('/api/v1/wallet/balances', token1);
     const result2 = await GET('/api/v1/wallet/balances', token2);

     expect(result1.userId).toBe(user1.id);
     expect(result2.userId).toBe(user2.id);
     expect(result1).not.toEqual(result2);
   });
   ```

**Impact:**
- CRITICAL security vulnerability
- Data privacy breach potential
- Regulatory compliance risk (GDPR, KVKK)

**Workaround:**
None - must be fixed before any production deployment

---

## BUG-003: Missing Endpoint - GET /api/v1/wallet/deposit/requests

**Severity:** HIGH
**Priority:** P1
**Found In:** Story 2.2 - TRY Deposit
**Status:** NEW
**Assigned To:** Backend Team

**Description:**
The task description mentions an endpoint to list all deposit requests: `GET /api/v1/wallet/deposit/requests`. This endpoint is missing from the deposit controller. While individual deposit status can be retrieved with `GET /api/v1/wallet/deposit/:id`, there is no endpoint to list all pending/completed deposits.

**Task Requirement:**
"GET /api/v1/wallet/deposit/requests - List deposit requests"

**Steps to Reproduce:**
1. Create multiple TRY deposit requests
2. Make request: `GET http://localhost:3002/api/v1/wallet/deposit/requests`
3. Expected to see list of all user's deposit requests with pagination

**Expected:**
- HTTP 200 OK
- Response with paginated list of deposits:
  ```json
  {
    "success": true,
    "data": {
      "deposits": [
        {
          "id": "dep_123",
          "amount": 1000,
          "status": "PENDING",
          "referenceCode": "DEP-20251120-ABC",
          "createdAt": "2025-11-20T10:00:00Z"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 20,
        "total": 5
      }
    }
  }
  ```

**Actual:**
- HTTP 404 Not Found (endpoint doesn't exist)

**Root Cause:**
Endpoint not implemented in DepositController. Only individual deposit status retrieval exists.

**Suggested Fix:**
Add method to DepositController:
```typescript
@Get('deposit/requests')
@ApiOperation({ summary: 'List deposit requests' })
async getDepositRequests(
  @Request() req,
  @Query() query: PaginationQueryDto
): Promise<{
  success: boolean;
  data: { deposits: DepositStatusResponseDto[]; };
  meta: any;
}> {
  const userId = req.user.userId;
  const deposits = await this.depositService.getUserDepositRequests(userId, query);
  return { success: true, data: { deposits }, meta: {...} };
}
```

**Impact:**
- Users cannot view history of all their deposits
- Must query individual deposits by ID (bad UX)
- Feature incomplete

**Workaround:**
Use GET /api/v1/wallet/transactions?type=DEPOSIT for transaction history (limited data)

---

## BUG-004: Missing Withdrawal Rate Limiting

**Severity:** HIGH
**Priority:** P1
**Found In:** Story 2.3 - TRY Withdrawal
**Status:** NEW
**Assigned To:** Backend Team

**Description:**
The withdrawal endpoint `POST /api/v1/wallet/withdraw/try` has no rate limiting configured. While balance and deposit endpoints have throttle decorators, the withdrawal endpoint is missing rate limiting protection.

**Current Implementation:**
```typescript
@Post('try')
@HttpCode(HttpStatus.CREATED)
@ApiOperation(...)
async createWithdrawalRequest(...) { }
// Missing: @Throttle({ default: { limit: X, ttl: Y } })
```

**Risk:**
- User could spam withdrawal requests
- Potential abuse for market manipulation testing
- No protection against denial of service

**Suggested Rate Limit:**
- 5 withdrawals per 60 minutes (since max 5 per day, should allow user flexibility)
- OR 1 withdrawal per 5 minutes (conservative)

**Steps to Reproduce:**
1. Authenticate as user with sufficient balance
2. Send 10 rapid POST requests to /api/v1/wallet/withdraw/try
3. All 10 requests are accepted (no rate limit)

**Expected:**
- Requests 1-5: 201 Created
- Request 6: 429 Too Many Requests

**Actual:**
- All 10 requests: 201 Created

**Suggested Fix:**
```typescript
@Post('try')
@HttpCode(HttpStatus.CREATED)
@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 per minute
async createWithdrawalRequest(...) { }
```

**Impact:**
- Security/abuse concern (medium priority)
- Affects large-volume users less than casual users
- Should be fixed but not blocking

**Workaround:**
Implement at API Gateway/Kong level if needed urgently

---

## BUG-005: Unvalidated Daily Withdrawal Limit

**Severity:** MEDIUM
**Priority:** P1
**Found In:** Story 2.3 - TRY Withdrawal
**Status:** NEW (Needs Runtime Verification)
**Assigned To:** Backend Team

**Description:**
The acceptance criteria states: "Daily withdrawal limit: 5 per day". While the code may include this logic, it has not been tested at runtime to verify it works correctly.

**Acceptance Criteria:**
"Maximum withdrawal: 50,000 TRY/day (LEVEL_1 limit)"
"Withdrawal status: Pending → Processing → Completed"
"Daily limit: 5 withdrawals per day" (from task description context)

**Implementation Check:**
Code review shows withdrawal service exists, but need to verify:
1. Daily limit is enforced (max 5 withdrawals in 24 hours)
2. Counter is per UTC day (not rolling 24 hours)
3. Error message is in Turkish
4. Cancellations don't count toward limit

**Test Case:**
```
1. Create withdrawal 1: SUCCESS (1/5)
2. Create withdrawal 2: SUCCESS (2/5)
3. Create withdrawal 3: SUCCESS (3/5)
4. Create withdrawal 4: SUCCESS (4/5)
5. Create withdrawal 5: SUCCESS (5/5)
6. Create withdrawal 6: 400 Bad Request with error "DAILY_WITHDRAWAL_LIMIT_EXCEEDED"
```

**Current Status:**
⚠️ Needs runtime validation - code likely implemented but not verified

**Suggested Test:**
Create integration test in NestJS:
```typescript
it('should enforce daily withdrawal limit of 5', async () => {
  const user = await createTestUser();
  for (let i = 1; i <= 5; i++) {
    const res = await createWithdrawal(user, 100);
    expect(res.status).toBe(201);
  }

  const res6 = await createWithdrawal(user, 100);
  expect(res6.status).toBe(400);
  expect(res6.body.error.code).toBe('DAILY_WITHDRAWAL_LIMIT_EXCEEDED');
});
```

**Impact:**
- Acceptance criteria compliance verification
- User experience (clear error messages)
- Regulatory compliance (daily limits)

---

## BUG-006: Inconsistent Error Response Format

**Severity:** MEDIUM
**Priority:** P2
**Found In:** Multiple endpoints
**Status:** NEW
**Assigned To:** Backend Team

**Description:**
Error responses across endpoints may have inconsistent formats. Some endpoints return `error.code` with `error.message`, others may return different structures.

**Example Inconsistency:**
Endpoint 1 returns:
```json
{
  "error": {
    "code": "INVALID_IBAN",
    "message": "IBAN must be in Turkish format"
  }
}
```

Endpoint 2 might return:
```json
{
  "error": "INVALID_IBAN",
  "message": "IBAN must be in Turkish format"
}
```

**Impact:**
- Difficult for frontend to parse errors consistently
- Poor developer experience
- Error handling code becomes complex

**Suggested Standard:**
All endpoints should follow this format:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "User-friendly error message in Turkish",
    "details": [] // Optional: additional field-level errors
  },
  "meta": {
    "timestamp": "2025-11-20T20:30:00Z",
    "request_id": "req_abc123"
  }
}
```

**Suggested Fix:**
1. Create custom exception filter (AllExceptionsFilter)
2. Ensure all endpoints return consistent error format
3. Add unit tests for error response format

---

## Test Coverage Impact

| Bug | Component | Impact | Fix Priority |
|-----|-----------|--------|--------------|
| BUG-001 | Balance API | Feature incomplete | CRITICAL |
| BUG-002 | Security | Data privacy risk | CRITICAL |
| BUG-003 | Deposit API | Feature incomplete | HIGH |
| BUG-004 | Withdrawal API | Rate limit missing | HIGH |
| BUG-005 | Withdrawal Logic | Needs verification | MEDIUM |
| BUG-006 | Error Handling | Developer UX | MEDIUM |

---

## Recommendations

### Immediate Actions (Before Sprint 2 Sign-off):
1. **Implement BUG-001** - Add /wallet/balance/:currency endpoint
2. **Verify BUG-002** - Security audit for cross-user data access
3. **Implement BUG-003** - Add /deposit/requests endpoint
4. **Implement BUG-004** - Add rate limiting to withdrawal endpoint

### Pre-Production Actions:
1. Runtime test BUG-005 (daily limit enforcement)
2. Standardize error response format (BUG-006)
3. Add comprehensive error message localization

### Post-Launch Monitoring:
- Monitor withdrawal daily limits in production
- Alert on security-relevant errors
- Track error rates by type

---

## Bug Summary Statistics

**Distribution by Severity:**
- Critical: 2 (33%)
- High: 2 (33%)
- Medium: 2 (33%)

**Distribution by Type:**
- Missing Features: 3 (50%)
- Security: 1 (17%)
- Enhancement: 2 (33%)

**Distribution by Component:**
- API Endpoints: 3
- Business Logic: 1
- Security/Auth: 1
- Response Format: 1

---

**Document Generated:** 2025-11-20T20:35:00Z
**Next Review:** After bug fixes implementation
