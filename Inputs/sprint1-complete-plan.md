# Sprint 1: Complete 10-Day Plan
## User Authentication & Onboarding (21 Story Points)

**Version:** 1.0  
**Created:** 2025-11-19  
**Sprint Duration:** 10 working days  
**Team:** 6 AI Agents (Tech Lead, Backend, Frontend, DevOps, Database, QA)

---

## 📊 Sprint Overview

**Goal:** Enable users to register, login, and setup 2FA with full security measures.

**User Stories:**
- **Story 1.1:** User Registration (5 points) - Days 1-3
- **Story 1.2:** User Login (5 points) - Days 4-5
- **Story 1.3:** Two-Factor Authentication (8 points) - Days 6-9
- **Story 1.6:** KYC Status Check (3 points) - Day 10

**Success Criteria:**
- ✅ Users can register with email verification
- ✅ Users can login with JWT tokens
- ✅ Users can enable TOTP 2FA
- ✅ Security: Rate limiting, account lockout, password hashing
- ✅ All endpoints have ≥80% test coverage
- ✅ CI/CD pipeline operational

---

## 🗓️ Day-by-Day Breakdown

---

### Day 1: Foundation Setup (Story 1.1 Start)
**Focus:** Infrastructure & Database foundation for user registration

#### DevOps Agent (DO-001, DO-002)
**Tasks:**
- **DO-001:** Setup development environment (6h)
  - Kubernetes local cluster (k3d)
  - PostgreSQL StatefulSet
  - Redis StatefulSet
  - RabbitMQ StatefulSet
  - Helm charts
  - **Output:** `kubectl get pods` all Running

- **DO-002:** Setup CI/CD pipeline skeleton (2h)
  - GitHub Actions workflow files
  - Build & test jobs
  - **Output:** `.github/workflows/ci.yml`

**Total:** 8h

---

#### Database Agent (DB-001)
**Tasks:**
- **DB-001:** Create users table (2h)
  - Migration: `001_create_users_table.sql`
  - Columns: id, email, password_hash, email_verified, created_at, etc.
  - Indexes: email (unique), created_at
  - Up & down migrations tested
  - **Output:** Users table ready in `exchange_dev` database

**Total:** 2h

---

#### Backend Agent (BE-001)
**Tasks:**
- **BE-001:** Implement user registration endpoint (4h)
  - POST `/api/v1/auth/register`
  - Input validation (email, password strength)
  - Argon2id password hashing
  - Email verification token generation
  - Queue email to RabbitMQ
  - Unit tests (≥80% coverage)
  - OpenAPI spec
  - **Output:** Registration endpoint ready, PR created

**Total:** 4h

---

#### Frontend Agent (FE-001)
**Tasks:**
- **FE-001:** Create registration form UI (3h)
  - Registration page (`/register`)
  - Material-UI form
  - Client-side validation
  - Redux slice for auth state
  - Loading/error states
  - Responsive design
  - **Output:** Registration form functional (using mock API initially)

**Total:** 3h

---

#### QA Agent (QA-001-PREP)
**Tasks:**
- **QA-001-PREP:** Prepare test plan for Story 1.1 (2h)
  - Test cases document
  - Postman collection skeleton
  - Accessibility checklist
  - **Output:** Test plan ready for execution

**Total:** 2h

---

**Day 1 End:**
- ✅ Infrastructure running
- ✅ Database table created
- ✅ Backend endpoint implemented
- ✅ Frontend form built
- ✅ Test plan ready
- **Story Points Completed:** ~2 points

---

### Day 2: Integration & Email Verification (Story 1.1 Continue)
**Focus:** Backend email worker, frontend-backend integration

#### Backend Agent (BE-002, BE-003)
**Tasks:**
- **BE-002:** Implement email verification worker (3h)
  - RabbitMQ consumer
  - Email template (HTML)
  - SendGrid/AWS SES integration
  - Retry logic for failed sends
  - **Output:** Email worker sending verification emails

- **BE-003:** Email verification endpoint (2h)
  - GET `/api/v1/auth/verify-email/:token`
  - Token validation (JWT, 24h expiry)
  - Update `email_verified` in database
  - **Output:** Verification endpoint ready

**Total:** 5h

---

#### Frontend Agent (FE-002, FE-003)
**Tasks:**
- **FE-002:** Integrate registration with real API (1h)
  - Replace mock API with real backend
  - Error handling
  - Success redirect to `/verify-email-sent` page
  - **Output:** Registration flow end-to-end

- **FE-003:** Email verification success page (2h)
  - `/verify-email-sent` page
  - `/verify-email/:token` page
  - Loading states
  - Success/error messages
  - **Output:** Email verification UI complete

**Total:** 3h

---

#### DevOps Agent (DO-003)
**Tasks:**
- **DO-003:** Configure SendGrid/email service (2h)
  - Secrets management (Sealed Secrets)
  - Environment variables
  - Test email sending
  - **Output:** Email service configured

**Total:** 2h

---

#### QA Agent (QA-002)
**Tasks:**
- **QA-002:** Test user registration flow (3h)
  - Manual testing (happy path + edge cases)
  - API testing (Postman)
  - Bug reports (if any)
  - **Output:** Test execution report

**Total:** 3h

---

**Day 2 End:**
- ✅ Email verification working
- ✅ Frontend integrated with backend
- ✅ Registration flow tested
- **Story Points Completed:** ~4 points (Story 1.1 almost done)

---

### Day 3: Polish & Security (Story 1.1 Complete)
**Focus:** Security features, rate limiting, final testing

#### Backend Agent (BE-004, BE-005)
**Tasks:**
- **BE-004:** Add rate limiting (2h)
  - Redis-based rate limiter
  - 5 registrations per IP per hour
  - 429 Too Many Requests response
  - **Output:** Rate limiting active

- **BE-005:** Add reCAPTCHA v3 (2h)
  - reCAPTCHA verification middleware
  - Score threshold (0.5)
  - **Output:** Bot protection enabled

**Total:** 4h

---

#### Frontend Agent (FE-004)
**Tasks:**
- **FE-004:** Add reCAPTCHA to registration form (1h)
  - reCAPTCHA v3 widget
  - Token submission with form
  - **Output:** reCAPTCHA integrated

**Total:** 1h

---

#### DevOps Agent (DO-004)
**Tasks:**
- **DO-004:** Setup monitoring dashboards (3h)
  - Grafana dashboard for registration metrics
  - Prometheus alerts (error rate, latency)
  - **Output:** Monitoring operational

**Total:** 3h

---

#### QA Agent (QA-003)
**Tasks:**
- **QA-003:** Final regression testing (4h)
  - Full registration flow
  - Security testing (rate limiting, SQL injection, XSS)
  - Performance testing (response time <200ms)
  - Accessibility audit
  - **Output:** Story 1.1 sign-off

**Total:** 4h

---

**Day 3 End:**
- ✅ **Story 1.1 COMPLETE** (5 points)
- ✅ Security measures in place
- ✅ Monitoring operational
- **Cumulative Points:** 5/21

---

### Day 4: User Login - Backend (Story 1.2 Start)
**Focus:** Login endpoint, JWT token generation

#### Backend Agent (BE-006, BE-007)
**Tasks:**
- **BE-006:** Implement login endpoint (3h)
  - POST `/api/v1/auth/login`
  - Email + password validation
  - Argon2id password verification
  - JWT token generation (access: 15min, refresh: 30 days)
  - Redis session storage
  - OpenAPI spec
  - **Output:** Login endpoint ready

- **BE-007:** Implement token refresh endpoint (2h)
  - POST `/api/v1/auth/refresh`
  - Refresh token validation
  - New access token issuance
  - **Output:** Token refresh working

**Total:** 5h

---

#### Database Agent (DB-002)
**Tasks:**
- **DB-002:** Create sessions table (1h)
  - Migration: `002_create_sessions_table.sql`
  - Columns: id, user_id, refresh_token_hash, expires_at, etc.
  - Index: user_id, refresh_token_hash
  - **Output:** Sessions table ready

**Total:** 1h

---

#### Frontend Agent (FE-005)
**Tasks:**
- **FE-005:** Create login form UI (3h)
  - Login page (`/login`)
  - Material-UI form
  - Remember me checkbox
  - Forgot password link (placeholder)
  - Redux state for user session
  - **Output:** Login form ready

**Total:** 3h

---

#### DevOps Agent (DO-005)
**Tasks:**
- **DO-005:** JWT secrets management (2h)
  - Generate RSA keys for JWT signing
  - Store in Sealed Secrets
  - Environment variable injection
  - **Output:** JWT secrets configured

**Total:** 2h

---

#### QA Agent (QA-004)
**Tasks:**
- **QA-004:** Prepare login test cases (2h)
  - Test scenarios (happy, invalid credentials, account lockout)
  - Postman collection
  - **Output:** Test plan ready

**Total:** 2h

---

**Day 4 End:**
- ✅ Login endpoint implemented
- ✅ JWT tokens working
- ✅ Login UI ready
- **Story Points Completed:** ~3 points (Story 1.2 in progress)

---

### Day 5: Login Complete & Account Lockout (Story 1.2 Complete)
**Focus:** Account lockout, login testing

#### Backend Agent (BE-008, BE-009)
**Tasks:**
- **BE-008:** Implement account lockout (2h)
  - 5 failed attempts → lock for 15 minutes
  - Track in Redis (failed_login:<email>)
  - 423 Locked response
  - **Output:** Account lockout active

- **BE-009:** Logout endpoint (1h)
  - DELETE `/api/v1/auth/logout`
  - Invalidate refresh token in Redis
  - **Output:** Logout working

**Total:** 3h

---

#### Frontend Agent (FE-006, FE-007)
**Tasks:**
- **FE-006:** Integrate login with real API (1h)
  - Replace mock with real backend
  - Token storage (httpOnly cookie via backend)
  - Auto-redirect on success
  - **Output:** Login flow end-to-end

- **FE-007:** Implement logout (1h)
  - Logout button in header
  - Clear Redux state
  - Redirect to login
  - **Output:** Logout functional

**Total:** 2h

---

#### QA Agent (QA-005)
**Tasks:**
- **QA-005:** Test login flow (4h)
  - Happy path
  - Invalid credentials
  - Account lockout
  - Token refresh
  - Logout
  - **Output:** Story 1.2 sign-off

**Total:** 4h

---

**Day 5 End:**
- ✅ **Story 1.2 COMPLETE** (5 points)
- ✅ Account lockout working
- ✅ Login/logout tested
- **Cumulative Points:** 10/21

---

### Day 6: 2FA Setup - Backend (Story 1.3 Start)
**Focus:** TOTP generation, QR code, backup codes

#### Database Agent (DB-003)
**Tasks:**
- **DB-003:** Extend users table for 2FA (1h)
  - Migration: `003_add_2fa_to_users.sql`
  - Columns: totp_secret, totp_enabled, backup_codes_encrypted
  - **Output:** 2FA fields in users table

**Total:** 1h

---

#### Backend Agent (BE-010, BE-011, BE-012)
**Tasks:**
- **BE-010:** Generate TOTP secret endpoint (2h)
  - POST `/api/v1/auth/2fa/setup`
  - Generate secret (otplib)
  - QR code generation (qrcode library)
  - Return: QR code data URL + secret
  - **Output:** TOTP setup endpoint ready

- **BE-011:** Generate backup codes (2h)
  - 10 backup codes (8-digit, bcrypt hashed)
  - Store in database (encrypted)
  - **Output:** Backup codes generation

- **BE-012:** Verify TOTP & enable 2FA endpoint (2h)
  - POST `/api/v1/auth/2fa/verify`
  - Verify TOTP token
  - Set `totp_enabled = true`
  - **Output:** 2FA enablement working

**Total:** 6h

---

#### Frontend Agent (FE-008)
**Tasks:**
- **FE-008:** Create 2FA setup page (4h)
  - `/settings/2fa` page
  - Display QR code
  - Show backup codes (copy to clipboard)
  - Verify TOTP form
  - **Output:** 2FA setup UI ready

**Total:** 4h

---

**Day 6 End:**
- ✅ TOTP setup backend ready
- ✅ 2FA setup UI ready
- **Story Points Completed:** ~3 points (Story 1.3 in progress)

---

### Day 7: 2FA Login Flow (Story 1.3 Continue)
**Focus:** 2FA verification during login

#### Backend Agent (BE-013, BE-014)
**Tasks:**
- **BE-013:** Modify login for 2FA (3h)
  - If user has 2FA → return `requires_2fa: true` (no tokens yet)
  - Temporary 2FA token (5-min expiry)
  - **Output:** Login endpoint updated

- **BE-014:** 2FA verification during login (2h)
  - POST `/api/v1/auth/2fa/verify-login`
  - Verify TOTP or backup code
  - Issue JWT tokens on success
  - **Output:** 2FA login verification working

**Total:** 5h

---

#### Frontend Agent (FE-009, FE-010)
**Tasks:**
- **FE-009:** 2FA prompt during login (2h)
  - Modal/page for 2FA code entry
  - 6-digit TOTP input
  - Backup code option
  - **Output:** 2FA login prompt ready

- **FE-010:** Integrate 2FA login flow (2h)
  - Handle `requires_2fa` response
  - Submit 2FA token
  - Success → redirect to dashboard
  - **Output:** 2FA login end-to-end

**Total:** 4h

---

#### QA Agent (QA-006)
**Tasks:**
- **QA-006:** Test 2FA setup (3h)
  - Setup flow (QR code, backup codes)
  - TOTP validation
  - Backup code usage
  - **Output:** Test report

**Total:** 3h

---

**Day 7 End:**
- ✅ 2FA login flow implemented
- ✅ TOTP + backup codes working
- **Story Points Completed:** ~6 points (Story 1.3 in progress)

---

### Day 8: 2FA Disable & Recovery (Story 1.3 Continue)
**Focus:** Disable 2FA, recovery mechanisms

#### Backend Agent (BE-015, BE-016)
**Tasks:**
- **BE-015:** Disable 2FA endpoint (2h)
  - POST `/api/v1/auth/2fa/disable`
  - Require current password + TOTP/backup code
  - Clear 2FA fields in database
  - **Output:** 2FA disable endpoint ready

- **BE-016:** Recovery flow (lost 2FA device) (3h)
  - Email-based recovery link
  - Temporary disable 2FA with admin approval
  - **Output:** Recovery mechanism ready

**Total:** 5h

---

#### Frontend Agent (FE-011)
**Tasks:**
- **FE-011:** 2FA disable UI (2h)
  - Button to disable 2FA
  - Confirmation modal (password + TOTP)
  - **Output:** Disable 2FA UI ready

**Total:** 2h

---

#### DevOps Agent (DO-006)
**Tasks:**
- **DO-006:** Add 2FA metrics to monitoring (2h)
  - Grafana dashboard: 2FA setup rate, login failures
  - Alerts: High 2FA failures
  - **Output:** 2FA monitoring added

**Total:** 2h

---

#### QA Agent (QA-007)
**Tasks:**
- **QA-007:** Test 2FA disable & recovery (3h)
  - Disable flow
  - Recovery flow
  - Edge cases
  - **Output:** Test report

**Total:** 3h

---

**Day 8 End:**
- ✅ 2FA disable working
- ✅ Recovery mechanism ready
- **Story Points Completed:** ~8 points (Story 1.3 in progress)

---

### Day 9: 2FA Final Testing (Story 1.3 Complete)
**Focus:** Security testing, performance testing, documentation

#### Backend Agent (BE-017)
**Tasks:**
- **BE-017:** 2FA security audit (3h)
  - Review code for vulnerabilities
  - Rate limiting on 2FA attempts
  - Timing attack prevention
  - **Output:** Security hardening complete

**Total:** 3h

---

#### Frontend Agent (FE-012)
**Tasks:**
- **FE-012:** 2FA UX polish (2h)
  - Loading states
  - Error messages
  - Accessibility improvements
  - **Output:** Polished 2FA UI

**Total:** 2h

---

#### QA Agent (QA-008)
**Tasks:**
- **QA-008:** 2FA comprehensive testing (5h)
  - Full 2FA flow (setup → login → disable)
  - Security testing (brute force, timing attacks)
  - Performance testing
  - Accessibility audit
  - **Output:** Story 1.3 sign-off

**Total:** 5h

---

**Day 9 End:**
- ✅ **Story 1.3 COMPLETE** (8 points)
- ✅ 2FA fully functional and secure
- **Cumulative Points:** 18/21

---

### Day 10: KYC Status Check & Sprint Wrap-up (Story 1.6)
**Focus:** Simple KYC status endpoint, sprint retrospective

#### Database Agent (DB-004)
**Tasks:**
- **DB-004:** Create KYC status table (1h)
  - Migration: `004_create_kyc_status.sql`
  - Columns: user_id, status, verified_at
  - **Output:** KYC table ready

**Total:** 1h

---

#### Backend Agent (BE-018)
**Tasks:**
- **BE-018:** KYC status endpoint (2h)
  - GET `/api/v1/users/me/kyc-status`
  - Return: status (pending/verified/rejected)
  - Mock implementation (real KYC in Sprint 2)
  - **Output:** KYC status endpoint ready

**Total:** 2h

---

#### Frontend Agent (FE-013)
**Tasks:**
- **FE-013:** KYC status badge (1h)
  - Display KYC status on dashboard
  - Badge: "Pending", "Verified", "Rejected"
  - **Output:** KYC status UI ready

**Total:** 1h

---

#### QA Agent (QA-009)
**Tasks:**
- **QA-009:** KYC status testing (1h)
  - Test endpoint
  - UI verification
  - **Output:** Story 1.6 sign-off

**Total:** 1h

---

#### Tech Lead Agent (TL-001)
**Tasks:**
- **TL-001:** Sprint 1 retrospective (2h)
  - Review all stories (1.1, 1.2, 1.3, 1.6)
  - Velocity analysis (21 points in 10 days)
  - What went well / What to improve
  - Sprint 2 planning prep
  - **Output:** Retrospective report

**Total:** 2h

---

**Day 10 End:**
- ✅ **Story 1.6 COMPLETE** (3 points)
- ✅ **SPRINT 1 COMPLETE** (21 points)
- ✅ Retrospective done
- **Final Score:** 21/21 🎉

---

## 📈 Sprint Metrics

### Velocity
- **Planned:** 21 story points
- **Completed:** 21 story points
- **Velocity:** 21 points / 10 days = **2.1 points/day**

### Test Coverage
- Backend: ≥80% (target met ✅)
- Frontend: ≥75% (target met ✅)

### Defect Metrics
- Bugs found: ~8-12 (estimated)
- Bugs fixed: 100%
- Critical bugs: 0

### Performance
- Registration: <200ms ✅
- Login: <150ms ✅
- 2FA verification: <100ms ✅

---

## 🎯 Deliverables

### Backend
- 18 endpoints implemented
- OpenAPI spec complete
- Unit tests: ≥80% coverage
- Integration tests: Key flows covered

### Frontend
- 13 pages/components
- Redux state management
- Responsive + accessible
- Component tests: ≥75% coverage

### DevOps
- Kubernetes cluster operational
- CI/CD pipeline (build, test, deploy)
- Monitoring dashboards (Grafana)
- Secrets management (Sealed Secrets)

### Database
- 4 migrations (users, sessions, 2FA, KYC status)
- Indexes optimized
- Up/down migrations tested

---

## 🚀 What's Next?

**Sprint 2 Focus:**
- Story 2.1: User Profile Management
- Story 3.1: Wallet Creation
- Story 4.1: Deposit (Fiat)

**Estimated:** 19 story points, 10 days

---

**Sprint 1 Complete! Ready to proceed to Sprint 2? 🎉**
