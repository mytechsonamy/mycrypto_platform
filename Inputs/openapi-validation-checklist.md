# OpenAPI Specification Validation
## Sanity Check & Consistency Verification

**Version:** 1.0  
**Last Updated:** 2025-11-19  
**Purpose:** Ensure OpenAPI spec matches implementation & documentation

---

## 🎯 Validation Objectives

1. **Schema Consistency** - Endpoints in OpenAPI match documented APIs
2. **Response Format** - Response schemas match implementation
3. **Authentication** - Security schemes properly defined
4. **Error Responses** - All error codes documented
5. **Examples** - Request/response examples are valid

---

## 📋 Pre-Implementation Checklist

### Critical Checks

- [ ] All MVP endpoints are in `openapi-specification.yaml`
- [ ] Authentication schemes defined (OAuth2, JWT, API Keys)
- [ ] Response schemas match `Engineering Guidelines` format
- [ ] Error responses include all codes from user stories
- [ ] Rate limiting documented (headers, status codes)
- [ ] Pagination parameters consistent across endpoints
- [ ] Request validation rules match AC (Acceptance Criteria)
- [ ] Examples use realistic data (no `foo`, `bar`, `test`)

---

## 🔍 Sample Endpoint Cross-Check

Let's validate 2 critical endpoints from MVP:

### 1. POST /api/v1/auth/login

**From User Story 1.2 (MVP Backlog):**
- Input: `email` (string), `password` (string)
- Output: `access_token` (JWT, 15 min), `refresh_token` (30 days)
- Error: `401 Unauthorized` if credentials invalid

**Expected in OpenAPI:**

```yaml
/api/v1/auth/login:
  post:
    summary: User login
    tags:
      - Authentication
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - email
              - password
            properties:
              email:
                type: string
                format: email
                example: "user@example.com"
              password:
                type: string
                format: password
                minLength: 8
                example: "SecurePass123!"
    responses:
      '200':
        description: Login successful
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                  example: true
                data:
                  type: object
                  properties:
                    access_token:
                      type: string
                      example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    refresh_token:
                      type: string
                      example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    expires_in:
                      type: integer
                      example: 900
                      description: "Access token expiry in seconds (15 min)"
                    token_type:
                      type: string
                      example: "Bearer"
                meta:
                  $ref: '#/components/schemas/ResponseMeta'
      '401':
        description: Invalid credentials
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
            example:
              success: false
              error:
                code: "INVALID_CREDENTIALS"
                message: "Email veya şifre hatalı"
              meta:
                timestamp: "2025-11-19T10:30:45.123Z"
                request_id: "req_abc123"
      '429':
        description: Too many requests
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
```

✅ **Check:**
- [ ] Schema matches user story requirements
- [ ] Error messages match Turkish UI text
- [ ] Token expiry (900s = 15 min) is correct
- [ ] 429 status for rate limiting is documented

---

### 2. POST /api/v1/trading/order

**From User Story 3.4 (Place Market Order):**
- Input: `symbol`, `side` (BUY/SELL), `amount`, `order_type` (MARKET)
- Output: `order_id`, `status`, `filled_amount`
- Errors: `400` (invalid amount), `401` (unauthorized), `403` (insufficient funds)

**Expected in OpenAPI:**

```yaml
/api/v1/trading/order:
  post:
    summary: Place a new order
    tags:
      - Trading
    security:
      - BearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - symbol
              - side
              - order_type
              - amount
            properties:
              symbol:
                type: string
                enum: [BTC_TRY, ETH_TRY, USDT_TRY]
                example: "BTC_TRY"
              side:
                type: string
                enum: [BUY, SELL]
                example: "BUY"
              order_type:
                type: string
                enum: [MARKET, LIMIT]
                example: "MARKET"
              amount:
                type: number
                format: double
                minimum: 0.0001
                example: 0.01
                description: "Amount in base currency (BTC)"
              price:
                type: number
                format: double
                example: 50000
                description: "Required for LIMIT orders"
              time_in_force:
                type: string
                enum: [GTC, IOC, FOK]
                default: GTC
                description: "Good-Till-Cancelled, Immediate-or-Cancel, Fill-or-Kill"
    responses:
      '201':
        description: Order created successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                  example: true
                data:
                  type: object
                  properties:
                    order_id:
                      type: string
                      format: uuid
                      example: "ord_a1b2c3d4"
                    status:
                      type: string
                      enum: [PENDING, OPEN, PARTIALLY_FILLED, FILLED, CANCELLED]
                      example: "OPEN"
                    symbol:
                      type: string
                      example: "BTC_TRY"
                    side:
                      type: string
                      example: "BUY"
                    order_type:
                      type: string
                      example: "MARKET"
                    amount:
                      type: number
                      example: 0.01
                    filled_amount:
                      type: number
                      example: 0.0
                    price:
                      type: number
                      nullable: true
                      example: null
                    created_at:
                      type: string
                      format: date-time
                      example: "2025-11-19T10:30:45.123Z"
                meta:
                  $ref: '#/components/schemas/ResponseMeta'
      '400':
        description: Invalid request
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
            examples:
              invalid_amount:
                summary: Invalid amount
                value:
                  success: false
                  error:
                    code: "INVALID_AMOUNT"
                    message: "Minimum order amount is 0.0001 BTC"
                  meta:
                    timestamp: "2025-11-19T10:30:45.123Z"
                    request_id: "req_xyz"
              invalid_symbol:
                summary: Invalid trading pair
                value:
                  success: false
                  error:
                    code: "INVALID_SYMBOL"
                    message: "Trading pair not found"
      '401':
        $ref: '#/components/responses/UnauthorizedError'
      '403':
        description: Insufficient funds
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
            example:
              success: false
              error:
                code: "INSUFFICIENT_FUNDS"
                message: "Yetersiz bakiye"
      '429':
        $ref: '#/components/responses/RateLimitError'
```

✅ **Check:**
- [ ] All required fields present (`symbol`, `side`, `order_type`, `amount`)
- [ ] Enum values match database schema (BUY/SELL, not Buy/Sell)
- [ ] Minimum amount (0.0001) matches user story
- [ ] Error codes match Engineering Guidelines
- [ ] Turkish error messages for user-facing errors

---

## 🛠️ Automated Validation Script

### Using OpenAPI Validator

**File:** `scripts/validate-openapi.sh`

```bash
#!/bin/bash
set -e

echo "🔍 Validating OpenAPI Specification..."

# 1. Syntax validation (YAML)
echo "1️⃣  Checking YAML syntax..."
yq eval . openapi-specification.yaml > /dev/null
echo "✅ YAML syntax is valid"

# 2. OpenAPI schema validation
echo "2️⃣  Validating OpenAPI 3.0 schema..."
npx @apidevtools/swagger-cli validate openapi-specification.yaml
echo "✅ OpenAPI schema is valid"

# 3. Check for required fields
echo "3️⃣  Checking required sections..."
REQUIRED_SECTIONS=("info" "servers" "paths" "components")
for section in "${REQUIRED_SECTIONS[@]}"; do
  if ! yq eval ".$section" openapi-specification.yaml | grep -q "."; then
    echo "❌ Missing required section: $section"
    exit 1
  fi
done
echo "✅ All required sections present"

# 4. Check for security schemes
echo "4️⃣  Checking security schemes..."
SECURITY_COUNT=$(yq eval '.components.securitySchemes | length' openapi-specification.yaml)
if [ "$SECURITY_COUNT" -lt 1 ]; then
  echo "❌ No security schemes defined"
  exit 1
fi
echo "✅ Security schemes defined: $SECURITY_COUNT"

# 5. Check for response schemas
echo "5️⃣  Checking common response schemas..."
REQUIRED_SCHEMAS=("ErrorResponse" "ResponseMeta")
for schema in "${REQUIRED_SCHEMAS[@]}"; do
  if ! yq eval ".components.schemas.$schema" openapi-specification.yaml | grep -q "type:"; then
    echo "❌ Missing schema: $schema"
    exit 1
  fi
done
echo "✅ Common response schemas present"

# 6. Check for examples
echo "6️⃣  Checking for request/response examples..."
PATHS_WITH_EXAMPLES=$(yq eval '.paths.*.*.requestBody.content.*.example' openapi-specification.yaml 2>/dev/null | grep -c "." || echo 0)
if [ "$PATHS_WITH_EXAMPLES" -lt 5 ]; then
  echo "⚠️  Warning: Only $PATHS_WITH_EXAMPLES paths have examples (recommended: at least 5)"
fi

echo ""
echo "🎉 OpenAPI validation complete!"
```

**Usage:**

```bash
chmod +x scripts/validate-openapi.sh
./scripts/validate-openapi.sh
```

---

### Contract Testing with Dredd

**File:** `scripts/contract-test.sh`

```bash
#!/bin/bash
set -e

echo "🧪 Running contract tests against API..."

# Prerequisites: API server running on http://localhost:3000

# Install Dredd if not present
if ! command -v dredd &> /dev/null; then
  echo "📦 Installing Dredd..."
  npm install -g dredd
fi

# Run contract tests
dredd openapi-specification.yaml http://localhost:3000 \
  --header "Authorization: Bearer $TEST_JWT_TOKEN" \
  --sorted \
  --reporter markdown:dredd-report.md

echo "✅ Contract tests passed!"
echo "📄 Report: dredd-report.md"
```

---

## 📊 Validation Checklist

### Core Endpoints (MVP)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `POST /api/v1/auth/register` | ⬜ | Check email validation regex |
| `POST /api/v1/auth/login` | ⬜ | Verify token expiry times |
| `POST /api/v1/auth/refresh` | ⬜ | Check refresh token flow |
| `POST /api/v1/auth/logout` | ⬜ | |
| `GET /api/v1/kyc/status` | ⬜ | Verify status enum values |
| `POST /api/v1/kyc/submit` | ⬜ | Check file upload schema |
| `GET /api/v1/wallet/balances` | ⬜ | Verify asset list |
| `POST /api/v1/wallet/deposit/try` | ⬜ | Check IBAN validation |
| `POST /api/v1/wallet/withdraw/try` | ⬜ | Verify fee calculation |
| `POST /api/v1/wallet/withdraw/crypto` | ⬜ | Check address validation |
| `GET /api/v1/market/ticker/:symbol` | ⬜ | Verify real-time data format |
| `GET /api/v1/market/orderbook/:symbol` | ⬜ | Check depth levels |
| `POST /api/v1/trading/order` | ⬜ | Validate order types |
| `GET /api/v1/trading/orders/open` | ⬜ | Check pagination |
| `DELETE /api/v1/trading/order/:id` | ⬜ | Verify cancel response |

---

### Schema Consistency Checks

#### Response Format

**Expected (from Engineering Guidelines):**

```json
{
  "success": true,
  "data": {...},
  "meta": {
    "timestamp": "2025-11-19T10:30:45.123Z",
    "request_id": "req_abc123"
  }
}
```

**OpenAPI Schema:**

```yaml
components:
  schemas:
    SuccessResponse:
      type: object
      required:
        - success
        - data
        - meta
      properties:
        success:
          type: boolean
          example: true
        data:
          type: object
        meta:
          $ref: '#/components/schemas/ResponseMeta'
    
    ResponseMeta:
      type: object
      required:
        - timestamp
        - request_id
      properties:
        timestamp:
          type: string
          format: date-time
        request_id:
          type: string
          pattern: '^req_[a-z0-9]{8,}$'
```

✅ **Check:**
- [ ] All success responses use `SuccessResponse` schema
- [ ] All error responses use `ErrorResponse` schema
- [ ] `timestamp` is ISO 8601 format
- [ ] `request_id` follows pattern (`req_xxxxx`)

---

#### Error Format

**Expected:**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Validation failed",
    "details": [...]
  },
  "meta": {
    "timestamp": "2025-11-19T10:30:45.123Z",
    "request_id": "req_abc123"
  }
}
```

**OpenAPI Schema:**

```yaml
components:
  schemas:
    ErrorResponse:
      type: object
      required:
        - success
        - error
        - meta
      properties:
        success:
          type: boolean
          example: false
        error:
          type: object
          required:
            - code
            - message
          properties:
            code:
              type: string
              enum:
                - INVALID_INPUT
                - UNAUTHORIZED
                - INSUFFICIENT_FUNDS
                - ORDER_NOT_FOUND
                # ... (all error codes from MVP backlog)
            message:
              type: string
            details:
              type: array
              items:
                type: object
                properties:
                  field:
                    type: string
                  message:
                    type: string
        meta:
          $ref: '#/components/schemas/ResponseMeta'
```

✅ **Check:**
- [ ] All error codes from user stories are in enum
- [ ] Error messages are user-friendly (Turkish where applicable)
- [ ] `details` array is optional (only for validation errors)

---

### Authentication Schemes

**Expected (from Engineering Guidelines):**

- OAuth 2.0 / JWT Bearer tokens
- API Keys for server-to-server

**OpenAPI Security Schemes:**

```yaml
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: "JWT access token (15 min expiry)"
    
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
      description: "API key for server-to-server communication"
    
    OAuth2:
      type: oauth2
      flows:
        password:
          tokenUrl: /api/v1/auth/token
          scopes:
            read: Read access
            write: Write access
            admin: Admin access
```

**Global Security (applied to all endpoints unless overridden):**

```yaml
security:
  - BearerAuth: []
```

✅ **Check:**
- [ ] BearerAuth defined for user endpoints
- [ ] ApiKeyAuth defined for webhooks/callbacks
- [ ] Public endpoints (e.g., `/health`) have `security: []`

---

## 🚨 Common Issues to Check

### 1. Inconsistent Naming

**Bad:**
- `user_id` in schema, `userId` in code
- `order-id` in URL, `orderId` in response

**Good:**
- Stick to one convention (snake_case or camelCase)
- MVP uses `snake_case` for consistency with DB

**Check:**
```bash
# Find inconsistent casing in OpenAPI
grep -r "userId\|orderId" openapi-specification.yaml
# Should return 0 results if following snake_case
```

---

### 2. Missing Required Fields

**User Story:** "Amount must be positive"  
**OpenAPI Schema:**

```yaml
amount:
  type: number
  minimum: 0.0001  # ✅ Constraint defined
```

**Check:**
- [ ] All validation rules from AC are in schema
- [ ] `required` fields match user story inputs

---

### 3. Enum Values

**Bad:**
```yaml
status:
  type: string
  enum: [open, filled, cancelled]  # lowercase
```

**Good (matches DB):**
```yaml
status:
  type: string
  enum: [OPEN, FILLED, CANCELLED]  # UPPERCASE
```

**Check:**
```bash
# Compare with database enum
psql -d exchange_dev -c "\dT+ order_status"
```

---

### 4. Date/Time Format

**Expected:** ISO 8601 with timezone (`2025-11-19T10:30:45.123Z`)

**OpenAPI:**
```yaml
created_at:
  type: string
  format: date-time  # ✅ Uses ISO 8601
```

---

### 5. Pagination

**Expected (from Engineering Guidelines):**

```yaml
parameters:
  - name: page
    in: query
    schema:
      type: integer
      default: 1
      minimum: 1
  - name: limit
    in: query
    schema:
      type: integer
      default: 20
      minimum: 1
      maximum: 100
```

**Response:**
```yaml
pagination:
  type: object
  properties:
    page:
      type: integer
    limit:
      type: integer
    total:
      type: integer
    pages:
      type: integer
```

✅ **Check:**
- [ ] All list endpoints have pagination
- [ ] `limit` has max value (100)

---

## 📝 Validation Report Template

**File:** `docs/openapi-validation-report.md`

```markdown
# OpenAPI Validation Report
**Date:** 2025-11-19  
**Validator:** [Your Name]  
**Spec Version:** 1.0.0

## Summary
- ✅ Total Endpoints: 45
- ✅ Endpoints Validated: 45
- ⚠️  Warnings: 3
- ❌ Errors: 0

## Detailed Findings

### ✅ Pass
- All MVP endpoints present
- Response schemas consistent
- Authentication schemes defined
- Error codes documented

### ⚠️  Warnings
1. **Missing examples:** 5 endpoints lack request examples
2. **Optional 2FA:** User Story 1.3 mentions 2FA, but not in `/login` response
3. **Rate limit headers:** Not documented in responses (X-RateLimit-Remaining, etc.)

### ❌ Errors
- None

## Recommendations
1. Add request/response examples for all endpoints
2. Document rate limit headers in common responses
3. Add 2FA flow to `/login` response (or separate endpoint)

## Next Steps
- [ ] Fix warnings before Sprint 1
- [ ] Re-validate after implementation
- [ ] Set up automated contract tests (Dredd)
```

---

## 🎯 Integration with CI/CD

**GitHub Action:** `.github/workflows/openapi-validation.yml`

```yaml
name: OpenAPI Validation

on:
  pull_request:
    paths:
      - 'openapi-specification.yaml'
      - 'docs/api/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Validate OpenAPI Spec
        run: |
          npm install -g @apidevtools/swagger-cli
          swagger-cli validate openapi-specification.yaml
      
      - name: Check for breaking changes
        uses: oasdiff/oasdiff-action@v0.0.15
        with:
          base: main
          revision: ${{ github.head_ref }}
          format: text
```

---

## 📚 Tools & Resources

### Validation Tools
- **Swagger CLI:** `npm install -g @apidevtools/swagger-cli`
- **OpenAPI Generator:** `npm install -g @openapitools/openapi-generator-cli`
- **Dredd:** `npm install -g dredd` (contract testing)
- **Spectral:** `npm install -g @stoplight/spectral-cli` (linting)

### Online Validators
- Swagger Editor: https://editor.swagger.io
- Stoplight Studio: https://stoplight.io/studio
- OpenAPI.tools: https://openapi.tools

---

**Document Owner:** API Team  
**Review Frequency:** Before each sprint  
**Next Review Date:** 2025-11-25 (Sprint 1 start)
