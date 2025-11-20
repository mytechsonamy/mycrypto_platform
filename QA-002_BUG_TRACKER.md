# QA-002: Bug Tracker
## User Registration & Email Verification Testing

**Report Date:** November 19, 2025
**Environment:** Development
**Status:** OPEN (3 Critical/High bugs blocking testing)

---

## Bug Summary

| ID | Title | Severity | Status | Component | Assigned To |
|----|-------|----------|--------|-----------|-------------|
| BUG-QA-002-001 | Database Schema Incomplete | CRITICAL | OPEN | Backend/Database | Backend Team |
| BUG-QA-002-002 | Email Verification Endpoints Missing | CRITICAL | OPEN | Backend/API | Backend Team |
| BUG-QA-002-003 | Request Format Mismatch | HIGH | OPEN | Backend/API | Backend Team |

---

## Detailed Bug Reports

### BUG-QA-002-001: Database Schema Incomplete
**Severity:** CRITICAL
**Status:** OPEN
**Assigned To:** Backend Team
**Component:** PostgreSQL / TypeORM
**Found In:** User Registration API Test (TC-019)
**Environment:** Development (Docker)

#### Description
User registration endpoint fails with HTTP 500 error because the database `users` table is missing required columns. The TypeORM entity expects 18 columns, but the init-db.sql script only creates 4 basic columns.

#### Steps to Reproduce
1. Start Docker Compose environment: `docker-compose up -d`
2. Wait for all services to be healthy
3. Send POST request to `/api/v1/auth/register`:
```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "SecurePass123!@#",
    "terms_accepted": true,
    "kvkk_consent_accepted": true
  }'
```
4. Observe response with error

#### Expected Behavior
- HTTP Status: 201 Created
- User record created in database
- Email verification token generated
- Success response returned with user ID

#### Actual Behavior
- HTTP Status: 500 Internal Server Error
- Response message: "Kayıt işlemi sırasında bir hata oluştu"
- Database error: "column User.password_hash does not exist"
- No user record created

#### Error Details
```
Error: column User.password_hash does not exist
Location: AuthService → registration → Database Query

Query:
SELECT "User"."id" AS "User_id",
       "User"."email" AS "User_email",
       "User"."password_hash" AS "User_password_hash",
       ... FROM "users" "User" WHERE (("User"."email" = $1)) LIMIT 1

Current Table Schema:
- id (UUID PRIMARY KEY)
- email (VARCHAR 255 UNIQUE NOT NULL)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

Missing Columns (from User entity):
- password_hash (VARCHAR)
- email_verified (BOOLEAN)
- email_verification_token (VARCHAR)
- email_verification_expires_at (TIMESTAMP)
- two_fa_enabled (BOOLEAN)
- two_fa_secret (VARCHAR)
- terms_accepted (BOOLEAN)
- kvkk_consent_accepted (BOOLEAN)
- kyc_status (VARCHAR)
- status (VARCHAR)
- failed_login_attempts (INTEGER)
- locked_until (TIMESTAMP)
- last_login_at (TIMESTAMP)
- last_login_ip (VARCHAR)
```

#### Root Cause
TypeORM migrations have not been executed on the database. The initialization script (`init-db.sql`) creates only the basic table structure. The migration files exist in `/Users/musti/Documents/Projects/MyCrypto_Platform/services/auth-service/src/migrations/` but are not run during container startup.

#### Suggested Fix

**Option 1: Run Migrations at Startup (Recommended)**
Modify the Auth service Dockerfile to run migrations on startup:
```dockerfile
RUN npm install

# Run migrations before starting application
RUN npm run typeorm migration:run

EXPOSE 3000
CMD ["node", "dist/main.js"]
```

**Option 2: Manual Migration Command**
After container starts, run:
```bash
docker exec exchange_auth_service npm run typeorm migration:run
```

**Option 3: Add Health Check Wait**
Implement a startup script that waits for database, then runs migrations:
```bash
#!/bin/bash
until npm run typeorm migration:run; do
  echo "Running migrations..."
  sleep 2
done
npm start
```

#### Testing for Fix
1. Run migration: `npm run typeorm migration:run`
2. Verify table schema: `\d users` in psql
3. Retry registration endpoint - should return 201
4. Verify user created in database: `SELECT * FROM users WHERE email = 'test@test.com';`

#### Related Files
- Auth Service: `/Users/musti/Documents/Projects/MyCrypto_Platform/services/auth-service/src/`
- Migrations: `/Users/musti/Documents/Projects/MyCrypto_Platform/services/auth-service/src/migrations/1731999999999-UpdateEmailVerificationTokenFields.ts`
- Init Script: `/Users/musti/Documents/Projects/MyCrypto_Platform/scripts/init-db.sql`
- Docker Compose: `/Users/musti/Documents/Projects/MyCrypto_Platform/docker-compose.yml`

#### Impact Analysis
- **User Impact:** CRITICAL - Users cannot register
- **Feature Impact:** Complete blockage of user registration flow
- **Testing Impact:** Cannot test 25 test cases - 0% coverage
- **Business Impact:** Platform non-functional for new users

#### Priority
HIGH - Must fix before any feature testing can proceed

---

### BUG-QA-002-002: Email Verification Endpoints Missing
**Severity:** CRITICAL
**Status:** OPEN
**Assigned To:** Backend Team
**Component:** API / AuthController
**Found In:** Email Verification Tests (TC-022 to TC-025)
**Environment:** Development

#### Description
The email verification endpoints are not implemented in the API. Both `POST /api/v1/auth/verify-email` and `POST /api/v1/auth/resend-verification` return 404 Not Found, indicating they are not defined in the AuthController.

#### Steps to Reproduce
1. Start Docker Compose environment
2. Send POST request to verify-email endpoint:
```bash
curl -X POST http://localhost:3001/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"}'
```
3. Observe 404 response

#### Expected Behavior
**For verify-email endpoint:**
- HTTP Status: 200 OK
- Accept 64-character hexadecimal token
- Validate token exists in database
- Verify token not expired (24-hour expiry)
- Update user.email_verified = true
- Clear/delete verification token from database
- Return success message in Turkish: "Email adresi başarıyla doğrulandı"

**For resend-verification endpoint:**
- HTTP Status: 200 OK
- Accept email address in request
- Check user exists and not already verified
- Generate new verification token
- Queue email via RabbitMQ
- Return success message: "Doğrulama emaili tekrar gönderildi"

#### Actual Behavior
- HTTP Status: 404 Not Found
- Response: `{"message":"Cannot POST /api/v1/auth/verify-email","error":"Not Found","statusCode":404}`
- Both endpoints are not implemented

#### Missing Endpoints

**1. POST /api/v1/auth/verify-email**
```typescript
@Post('verify-email')
async verifyEmail(@Body() dto: VerifyEmailDto): Promise<VerifyEmailResponse> {
  // Validate token format (64 hex characters)
  // Query users table for matching token
  // Check expiration: email_verification_expires_at > NOW()
  // Update: email_verified = true
  // Clear: email_verification_token = NULL
  // Return success with 200 status
}
```

**2. POST /api/v1/auth/resend-verification**
```typescript
@Post('resend-verification')
async resendVerification(@Body() dto: ResendVerificationDto): Promise<ResendVerificationResponse> {
  // Validate email exists
  // Check email not already verified
  // Generate new token
  // Update token and expiry in database
  // Queue email via RabbitMQ
  // Return success with 200 status
}
```

#### Request/Response Format

**Verify Email Request:**
```json
{
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"
}
```

**Verify Email Response (200):**
```json
{
  "success": true,
  "message": "Email adresi başarıyla doğrulandı",
  "data": {
    "email": "user@example.com",
    "emailVerified": true
  }
}
```

**Verify Email Response (400 - Invalid Token):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Geçersiz doğrulama linki"
  }
}
```

**Resend Verification Request:**
```json
{
  "email": "user@example.com"
}
```

**Resend Verification Response (200):**
```json
{
  "success": true,
  "message": "Doğrulama emaili tekrar gönderildi"
}
```

**Resend Verification Response (404 - User Not Found):**
```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "Kullanıcı bulunamadı"
  }
}
```

#### DTOs Required
See `/Users/musti/Documents/Projects/MyCrypto_Platform/services/auth-service/src/auth/dto/`:
- `verify-email.dto.ts`
- `resend-verification.dto.ts`

Both files exist but endpoints are not implemented.

#### Suggested Implementation

**In AuthController:**
```typescript
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';

@Post('verify-email')
async verifyEmail(@Body() dto: VerifyEmailDto) {
  return await this.authService.verifyEmail(dto.token);
}

@Post('resend-verification')
async resendVerification(@Body() dto: ResendVerificationDto) {
  return await this.authService.resendVerification(dto.email);
}
```

**In AuthService:**
```typescript
async verifyEmail(token: string): Promise<VerifyEmailResponse> {
  // 1. Validate token format
  if (!this.isValidTokenFormat(token)) {
    throw new BadRequestException('Geçersiz doğrulama linki');
  }

  // 2. Hash token (if stored hashed in DB)
  const hashedToken = await this.hashToken(token);

  // 3. Find user with token
  const user = await this.userRepository.findOne({
    where: { email_verification_token: hashedToken }
  });

  if (!user) {
    throw new BadRequestException('Geçersiz doğrulama linki');
  }

  // 4. Check expiration
  if (new Date() > user.email_verification_expires_at) {
    throw new BadRequestException('Doğrulama linki süresi geçti');
  }

  // 5. Update user
  user.email_verified = true;
  user.email_verification_token = null;
  user.email_verification_expires_at = null;
  await this.userRepository.save(user);

  return {
    success: true,
    message: 'Email adresi başarıyla doğrulandı',
    data: {
      email: user.email,
      emailVerified: true
    }
  };
}

async resendVerification(email: string): Promise<ResendVerificationResponse> {
  // 1. Find user
  const user = await this.userRepository.findOne({ where: { email } });

  if (!user) {
    throw new NotFoundException('Kullanıcı bulunamadı');
  }

  // 2. Check not already verified
  if (user.email_verified) {
    throw new BadRequestException('Bu email zaten doğrulanmış');
  }

  // 3. Generate new token
  const token = this.generateToken();

  // 4. Update user
  user.email_verification_token = this.hashToken(token);
  user.email_verification_expires_at = addHours(new Date(), 24);
  await this.userRepository.save(user);

  // 5. Send email
  await this.emailService.sendVerificationEmail(user.email, token);

  return {
    success: true,
    message: 'Doğrulama emaili tekrar gönderildi'
  };
}
```

#### Testing for Fix
After implementation:
1. Register new user (once BUG-QA-002-001 is fixed)
2. Get verification token from Mailpit
3. Call verify-email endpoint with token - should return 200
4. Verify user.email_verified = true in database
5. Call resend-verification with unverified user - should return 200
6. Verify new token sent to Mailpit
7. Call verify-email with expired token - should return 400 with appropriate message

#### Related Files
- Auth Controller: `/Users/musti/Documents/Projects/MyCrypto_Platform/services/auth-service/src/auth/auth.controller.ts`
- Auth Service: `/Users/musti/Documents/Projects/MyCrypto_Platform/services/auth-service/src/auth/auth.service.ts`
- DTOs: `/Users/musti/Documents/Projects/MyCrypto_Platform/services/auth-service/src/auth/dto/`

#### Impact Analysis
- **User Impact:** CRITICAL - Users cannot verify email addresses
- **Feature Impact:** Complete blockage of email verification flow (Story 1.2)
- **Testing Impact:** Cannot test 8 test cases (TC-011 to TC-018, TC-022 to TC-025)
- **Business Impact:** Unverified users cannot proceed to next steps

#### Priority
HIGH - Must implement before QA can test email verification feature

---

### BUG-QA-002-003: Request Format Mismatch - Field Names
**Severity:** HIGH
**Status:** OPEN
**Assigned To:** Backend Team
**Component:** API / DTO Validation
**Found In:** API Test Collection / Registration Endpoint
**Environment:** Development

#### Description
The Postman test collection sends registration requests with camelCase field names (termsAccepted, kvkkAccepted) and an undocumented recaptchaToken field, but the API's RegisterDto expects snake_case field names (terms_accepted, kvkk_consent_accepted) without recaptchaToken.

#### Steps to Reproduce
1. Send registration request with camelCase fields:
```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!@#",
    "termsAccepted": true,
    "kvkkAccepted": true,
    "recaptchaToken": "mock-token"
  }'
```

2. Observe validation errors

#### Expected API Field Names (Per DTO)
```typescript
export class RegisterDto {
  email: string;              // ✓ Correct
  password: string;           // ✓ Correct
  terms_accepted: boolean;    // Expected: snake_case
  kvkk_consent_accepted: boolean; // Expected: snake_case
  // recaptchaToken NOT in DTO - should be removed
}
```

#### Actual Request Fields (From Postman)
```json
{
  "email": "test@example.com",
  "password": "SecurePass123!@#",
  "termsAccepted": true,          // WRONG: camelCase instead of terms_accepted
  "kvkkAccepted": true,            // WRONG: camelCase instead of kvkk_consent_accepted
  "recaptchaToken": "mock-token"   // WRONG: Not in DTO
}
```

#### Error Response
```json
{
  "message": [
    "property termsAccepted should not exist",
    "property kvkkAccepted should not exist",
    "property recaptchaToken should not exist",
    "Kullanım şartlarını kabul etmelisiniz",
    "Kullanım şartları kabul durumu boolean olmalıdır",
    "KVKK metnini onaylamalısınız",
    "KVKK onay durumu boolean olmalıdır"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

#### Root Cause
The Postman collection was created with assumptions about the API field naming convention that don't match the actual NestJS backend implementation. The backend uses snake_case for database field mapping, while the test collection uses JavaScript camelCase conventions.

#### Suggested Fix

**Option 1: Update Postman Collection (Recommended)**
Correct field names in test collection:
```json
{
  "email": "testuser001@example.com",
  "password": "SecurePass123!@#",
  "terms_accepted": true,
  "kvkk_consent_accepted": true
}
```

**Option 2: Add DTO Transformer**
If cross-platform naming convention compatibility is needed, add ClassTransformer to RegisterDto:
```typescript
import { Transform } from 'class-transformer';

export class RegisterDto {
  @Transform(({ obj }) => obj.termsAccepted || obj.terms_accepted)
  terms_accepted: boolean;

  @Transform(({ obj }) => obj.kvkkAccepted || obj.kvkk_consent_accepted)
  kvkk_consent_accepted: boolean;
}
```

**Option 3: API Consistency**
Ensure all APIs follow one naming convention (recommend snake_case for consistency with database).

#### Impacted Tests
- Registration - Valid: Field name mismatch
- Registration - Invalid Email: Field name mismatch
- Registration - Weak Password: Field name mismatch
- Registration - Duplicate Email: Field name mismatch

#### Testing for Fix
After correction:
1. Update Postman collection with snake_case field names
2. Re-run Newman tests
3. Verify 400 Bad Request becomes proper validation error
4. Verify 201 Created for valid requests (once BUG-QA-002-001 is fixed)

#### Related Files
- RegisterDto: `/Users/musti/Documents/Projects/MyCrypto_Platform/services/auth-service/src/auth/dto/register.dto.ts`
- Postman Collection: `/Users/musti/Documents/Projects/MyCrypto_Platform/auth-registration-verification.postman_collection.json`

#### Impact Analysis
- **Testing Impact:** HIGH - All Postman tests fail with validation errors
- **API Contract Impact:** Unclear what field names API expects
- **Developer Experience:** Confusing for API consumers
- **Documentation Impact:** OpenAPI/Swagger should reflect actual field names

#### Priority
HIGH - Must fix before API testing can validate actual functionality

---

## Summary Table

| Bug ID | Title | Severity | Component | Status | Est. Fix Time | Est. Test Time |
|--------|-------|----------|-----------|--------|---------------|----------------|
| BUG-QA-002-001 | Database Schema Incomplete | CRITICAL | Backend/DB | OPEN | 0.5 hours | 1 hour |
| BUG-QA-002-002 | Missing Email Endpoints | CRITICAL | Backend/API | OPEN | 2-3 hours | 2 hours |
| BUG-QA-002-003 | Field Name Mismatch | HIGH | Backend/API | OPEN | 0.5 hours | 0.5 hours |

**Total Estimated Fix Time:** 3-4 hours
**Total Estimated Re-Test Time:** 3.5 hours

---

## Reassessment Timeline

1. **Phase 1:** Fix BUG-QA-002-001 (Database Schema)
   - Expected completion: 30 minutes
   - Re-test registration endpoint: 1 hour

2. **Phase 2:** Fix BUG-QA-002-002 (Email Endpoints)
   - Expected completion: 2-3 hours
   - Re-test email flow: 1.5 hours

3. **Phase 3:** Fix BUG-QA-002-003 (Field Names)
   - Expected completion: 30 minutes
   - Re-run all API tests: 30 minutes

4. **Phase 4:** Complete Manual Testing (after all fixes)
   - UI testing: 4-6 hours
   - E2E testing: 2-3 hours
   - Accessibility testing: 1 hour

---

**Report Generated:** 2025-11-19
**QA Engineer:** Senior QA Test Automation Agent
**Status:** OPEN - Awaiting Development Team Action
