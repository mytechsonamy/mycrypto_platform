# Day 5 Sprint Plan - Story 1.3: Logout & Password Reset

## Sprint Overview
- **Date:** Day 5 (Sprint 1)
- **Story:** 1.3 - Logout & Password Reset Functionality
- **Total Story Points:** 10 (Logout: 2, Password Reset: 5, Session Management: 3)
- **Team Capacity:** 8 hours × 5 agents = 40 agent-hours
- **Critical Path:** Database schema → Backend endpoints → Frontend UI → Testing

## Story 1.3 Requirements Summary

### From MVP Backlog (Story 1.3 & 1.4)
1. **Logout Functionality**
   - JWT token invalidation
   - Session revocation in Redis
   - Clear client-side tokens

2. **Password Reset Request**
   - Email-based reset flow
   - Secure token generation (JWT with reset_password scope)
   - Rate limiting (3 requests per email per hour)
   - Reset link expires in 1 hour

3. **Password Reset Confirmation**
   - Token validation (single-use)
   - Password update with same complexity rules
   - All existing sessions invalidated
   - Email confirmation sent

---

## Task Breakdown

### Database Tasks

#### DB-001: Password Reset Token Schema
**Agent:** database-engineer
**Priority:** P0
**Estimated Time:** 45 minutes
**Dependencies:** None

**Description:**
Design and implement database schema for password reset tokens including token storage, expiration tracking, and usage flags.

**Acceptance Criteria:**
- [ ] Create password_reset_tokens table with columns: id, user_id, token_hash, expires_at, used_at, created_at
- [ ] Add index on token_hash for fast lookups
- [ ] Add foreign key constraint to users table
- [ ] Create migration file with rollback capability
- [ ] Document table structure and relationships

**Design References:**
- File: /Users/musti/Documents/Projects/MyCrypto_Platform/Inputs/crypto-exchange-database-schema-v2.md - Section: Authentication Tables
- File: /Users/musti/Documents/Projects/MyCrypto_Platform/Inputs/mvp-backlog-detailed.md - Lines: 113-132

---

#### DB-002: Session Revocation Schema Updates
**Agent:** database-engineer
**Priority:** P0
**Estimated Time:** 30 minutes
**Dependencies:** None

**Description:**
Update session entity to support revocation tracking and logout timestamps.

**Acceptance Criteria:**
- [ ] Add revoked_at timestamp column to sessions table
- [ ] Add revocation_reason enum column (logout, password_reset, admin_action, security)
- [ ] Create index on user_id + revoked_at for efficient queries
- [ ] Update existing session queries to exclude revoked sessions
- [ ] Test migration with rollback

**Design References:**
- File: /Users/musti/Documents/Projects/MyCrypto_Platform/services/auth-service/src/auth/entities/session.entity.ts

---

### Backend Tasks

#### BE-001: Logout Endpoint Implementation
**Agent:** backend-nestjs-developer
**Priority:** P0
**Estimated Time:** 60 minutes
**Dependencies:** DB-002

**Description:**
Implement POST /api/v1/auth/logout endpoint with JWT invalidation and session revocation.

**Acceptance Criteria:**
- [ ] Extract JWT from Authorization header
- [ ] Validate JWT signature and expiration
- [ ] Revoke session in database with reason='logout'
- [ ] Add token to Redis blacklist with TTL matching original expiration
- [ ] Clear refresh token if provided
- [ ] Return success response with logout confirmation
- [ ] Add unit tests with 80% coverage
- [ ] Update OpenAPI specification

**Design References:**
- File: /Users/musti/Documents/Projects/MyCrypto_Platform/Inputs/crypto-exchange-api-spec-complete.md - Section: Authentication Endpoints
- File: /Users/musti/Documents/Projects/MyCrypto_Platform/services/auth-service/src/auth/auth.controller.ts

---

#### BE-002: Password Reset Request Endpoint
**Agent:** backend-nestjs-developer
**Priority:** P0
**Estimated Time:** 90 minutes
**Dependencies:** DB-001

**Description:**
Implement POST /api/v1/auth/password-reset/request endpoint for initiating password reset flow.

**Acceptance Criteria:**
- [ ] Accept email in request body
- [ ] Verify email exists in database
- [ ] Generate secure reset token (JWT with reset_password scope)
- [ ] Store token hash in database with 1-hour expiration
- [ ] Send reset email with link containing token
- [ ] Implement rate limiting: 3 requests per email per hour
- [ ] Return generic success message (prevent user enumeration)
- [ ] Log reset attempts for security monitoring
- [ ] Add comprehensive unit tests
- [ ] Update OpenAPI specification

**Design References:**
- File: /Users/musti/Documents/Projects/MyCrypto_Platform/Inputs/mvp-backlog-detailed.md - Lines: 119-126
- File: /Users/musti/Documents/Projects/MyCrypto_Platform/Inputs/engineering-guidelines.md - Section: Security Standards

---

#### BE-003: Password Reset Confirmation Endpoint
**Agent:** backend-nestjs-developer
**Priority:** P0
**Estimated Time:** 90 minutes
**Dependencies:** BE-002

**Description:**
Implement POST /api/v1/auth/password-reset/confirm endpoint for completing password reset.

**Acceptance Criteria:**
- [ ] Accept token and new password in request body
- [ ] Validate token signature and expiration
- [ ] Check token hasn't been used (single-use enforcement)
- [ ] Validate password complexity requirements
- [ ] Update user password with Argon2id hashing
- [ ] Mark token as used in database
- [ ] Invalidate all user sessions (revoked_at = now, reason = password_reset)
- [ ] Send confirmation email to user
- [ ] Clear all JWT tokens from Redis blacklist for this user
- [ ] Add comprehensive unit tests
- [ ] Update OpenAPI specification

**Design References:**
- File: /Users/musti/Documents/Projects/MyCrypto_Platform/Inputs/mvp-backlog-detailed.md - Lines: 119-132
- File: /Users/musti/Documents/Projects/MyCrypto_Platform/Inputs/security-audit-checklist.md - Section: Authentication Security

---

#### BE-004: Session Management Service Updates
**Agent:** backend-nestjs-developer
**Priority:** P1
**Estimated Time:** 60 minutes
**Dependencies:** DB-002, BE-001

**Description:**
Update session management service to handle revocation and cleanup.

**Acceptance Criteria:**
- [ ] Implement revokeSession method with reason tracking
- [ ] Implement revokeAllUserSessions for password reset
- [ ] Add scheduled job to clean expired sessions (run every hour)
- [ ] Update session validation to check revoked_at
- [ ] Add metrics for session revocation events
- [ ] Implement session activity logging
- [ ] Add unit tests for all new methods

**Design References:**
- File: /Users/musti/Documents/Projects/MyCrypto_Platform/services/auth-service/src/auth/auth.service.ts

---

### Frontend Tasks

#### FE-001: Logout Button and Flow Implementation
**Agent:** frontend-react-developer
**Priority:** P0
**Estimated Time:** 60 minutes
**Dependencies:** BE-001

**Description:**
Implement logout functionality in the React application header and navigation.

**Acceptance Criteria:**
- [ ] Add Logout button to authenticated user header
- [ ] Call POST /api/v1/auth/logout on click
- [ ] Clear localStorage tokens (access_token, refresh_token)
- [ ] Clear Redux/Context auth state
- [ ] Redirect to login page
- [ ] Show success toast notification
- [ ] Handle logout errors gracefully
- [ ] Add loading state during logout process
- [ ] Write component tests

**Design References:**
- File: /Users/musti/Documents/Projects/MyCrypto_Platform/frontend/src/components/common - Header component location

---

#### FE-002: Forgot Password Page
**Agent:** frontend-react-developer
**Priority:** P0
**Estimated Time:** 90 minutes
**Dependencies:** BE-002

**Description:**
Create forgot password page with email input and request handling.

**Acceptance Criteria:**
- [ ] Create /forgot-password route and page component
- [ ] Add email input field with validation
- [ ] Show clear instructions to user
- [ ] Call POST /api/v1/auth/password-reset/request
- [ ] Display success message after request
- [ ] Implement rate limit error handling
- [ ] Add "Back to Login" link
- [ ] Show loading state during API call
- [ ] Add reCAPTCHA v3 integration
- [ ] Write comprehensive tests
- [ ] Ensure responsive design

**Design References:**
- File: /Users/musti/Documents/Projects/MyCrypto_Platform/frontend/src/pages - Page components location

---

#### FE-003: Reset Password Page
**Agent:** frontend-react-developer
**Priority:** P0
**Estimated Time:** 90 minutes
**Dependencies:** BE-003

**Description:**
Create reset password page for token validation and password update.

**Acceptance Criteria:**
- [ ] Create /reset-password route with token parameter
- [ ] Extract and validate token from URL
- [ ] Add password and confirm password fields
- [ ] Show password strength indicator
- [ ] Validate password complexity (min 8 chars, 1 uppercase, 1 number, 1 special)
- [ ] Call POST /api/v1/auth/password-reset/confirm
- [ ] Show success message and redirect to login
- [ ] Handle expired/invalid token errors
- [ ] Add password visibility toggle
- [ ] Write comprehensive tests
- [ ] Ensure responsive design

**Design References:**
- File: /Users/musti/Documents/Projects/MyCrypto_Platform/frontend/src/pages/RegisterPage.tsx - Password validation reference

---

#### FE-004: Auth State Management Updates
**Agent:** frontend-react-developer
**Priority:** P1
**Estimated Time:** 45 minutes
**Dependencies:** FE-001

**Description:**
Update Redux/Context auth state management for logout and session handling.

**Acceptance Criteria:**
- [ ] Add logout action to auth reducer
- [ ] Clear all auth-related state on logout
- [ ] Implement token blacklist checking
- [ ] Add session expiration handling
- [ ] Update auth interceptor for 401 responses
- [ ] Handle token refresh failure → auto logout
- [ ] Add auth state persistence safeguards
- [ ] Write unit tests for state changes

**Design References:**
- File: /Users/musti/Documents/Projects/MyCrypto_Platform/frontend/src/store - Redux store location

---

### DevOps Tasks

#### DO-001: Password Reset Email Templates
**Agent:** devops-engineer
**Priority:** P0
**Estimated Time:** 60 minutes
**Dependencies:** None

**Description:**
Create and deploy email templates for password reset flow.

**Acceptance Criteria:**
- [ ] Create password-reset-request.html template
- [ ] Create password-reset-success.html template
- [ ] Include company branding and styling
- [ ] Add reset link with token placeholder
- [ ] Include security notice about request origin
- [ ] Add expiration time warning (1 hour)
- [ ] Support Turkish and English languages
- [ ] Test email rendering in major clients
- [ ] Deploy templates to email service

**Design References:**
- File: /Users/musti/Documents/Projects/MyCrypto_Platform/services/auth-service/templates - Email templates location
- File: /Users/musti/Documents/Projects/MyCrypto_Platform/EMAIL_SERVICE_SETUP.md

---

#### DO-002: Redis Blacklist Configuration
**Agent:** devops-engineer
**Priority:** P0
**Estimated Time:** 45 minutes
**Dependencies:** None

**Description:**
Configure Redis for JWT token blacklisting with proper TTL and memory management.

**Acceptance Criteria:**
- [ ] Configure Redis memory policy for token blacklist
- [ ] Set up key expiration notifications
- [ ] Configure persistence for blacklist data
- [ ] Add monitoring for blacklist size
- [ ] Set memory limits and eviction policy
- [ ] Create backup strategy for blacklist
- [ ] Add health check endpoint
- [ ] Document configuration

**Design References:**
- File: /Users/musti/Documents/Projects/MyCrypto_Platform/docker-compose.yml - Redis configuration
- File: /Users/musti/Documents/Projects/MyCrypto_Platform/Inputs/observability-setup.md - Section: Redis Monitoring

---

#### DO-003: Session Cleanup Cron Job
**Agent:** devops-engineer
**Priority:** P1
**Estimated Time:** 45 minutes
**Dependencies:** BE-004

**Description:**
Set up scheduled job for cleaning expired sessions and tokens.

**Acceptance Criteria:**
- [ ] Create cron job to run every hour
- [ ] Clean sessions older than 30 days
- [ ] Clean expired password reset tokens
- [ ] Log cleanup statistics
- [ ] Add monitoring alerts for job failures
- [ ] Implement job lock to prevent concurrent runs
- [ ] Add manual trigger capability
- [ ] Document job configuration

**Design References:**
- File: /Users/musti/Documents/Projects/MyCrypto_Platform/Inputs/deployment-runbook.md - Section: Scheduled Jobs

---

### QA Tasks

#### QA-001: Test Plan for Story 1.3
**Agent:** qa-engineer
**Priority:** P0
**Estimated Time:** 60 minutes
**Dependencies:** None

**Description:**
Create comprehensive test plan for logout and password reset functionality.

**Acceptance Criteria:**
- [ ] Define test scenarios for logout flow
- [ ] Define test scenarios for password reset request
- [ ] Define test scenarios for password reset confirmation
- [ ] Include positive and negative test cases
- [ ] Add security test cases (token reuse, expiration)
- [ ] Include rate limiting test scenarios
- [ ] Define performance test criteria
- [ ] Create test data requirements
- [ ] Document expected results

**Design References:**
- File: /Users/musti/Documents/Projects/MyCrypto_Platform/QA_TestPlans - Test plan templates
- File: /Users/musti/Documents/Projects/MyCrypto_Platform/Inputs/mvp-backlog-detailed.md - Story 1.3 & 1.4 acceptance criteria

---

#### QA-002: E2E Test Automation - Logout
**Agent:** qa-engineer
**Priority:** P1
**Estimated Time:** 75 minutes
**Dependencies:** BE-001, FE-001

**Description:**
Implement end-to-end automated tests for logout functionality.

**Acceptance Criteria:**
- [ ] Test successful logout flow
- [ ] Test token invalidation after logout
- [ ] Test session cleanup verification
- [ ] Test multiple device logout scenarios
- [ ] Test logout with expired token
- [ ] Test concurrent logout requests
- [ ] Verify redirect to login page
- [ ] Test logout analytics tracking
- [ ] Add tests to CI pipeline

**Design References:**
- File: /Users/musti/Documents/Projects/MyCrypto_Platform/cypress - E2E test location
- File: /Users/musti/Documents/Projects/MyCrypto_Platform/services/auth-service/test - Integration tests

---

#### QA-003: E2E Test Automation - Password Reset
**Agent:** qa-engineer
**Priority:** P1
**Estimated Time:** 90 minutes
**Dependencies:** BE-002, BE-003, FE-002, FE-003

**Description:**
Implement end-to-end automated tests for password reset flow.

**Acceptance Criteria:**
- [ ] Test complete password reset flow
- [ ] Test rate limiting (3 requests per hour)
- [ ] Test token expiration (after 1 hour)
- [ ] Test single-use token enforcement
- [ ] Test invalid/malformed tokens
- [ ] Test password complexity validation
- [ ] Test session invalidation after reset
- [ ] Test email delivery simulation
- [ ] Test concurrent reset requests
- [ ] Verify all error scenarios

**Design References:**
- File: /Users/musti/Documents/Projects/MyCrypto_Platform/cypress - E2E test location

---

#### QA-004: Security Testing
**Agent:** qa-engineer
**Priority:** P0
**Estimated Time:** 90 minutes
**Dependencies:** All BE and FE tasks

**Description:**
Perform security testing on logout and password reset functionality.

**Acceptance Criteria:**
- [ ] Test token replay attacks
- [ ] Test session fixation vulnerabilities
- [ ] Test user enumeration via reset endpoint
- [ ] Test brute force protection
- [ ] Test CSRF protection
- [ ] Test XSS in password reset form
- [ ] Test timing attacks on email validation
- [ ] Verify secure token generation
- [ ] Test authorization bypass attempts
- [ ] Document all findings with severity

**Design References:**
- File: /Users/musti/Documents/Projects/MyCrypto_Platform/Inputs/security-audit-checklist.md
- OWASP Authentication Testing Guide

---

#### QA-005: Performance Testing
**Agent:** qa-engineer
**Priority:** P2
**Estimated Time:** 60 minutes
**Dependencies:** All BE tasks

**Description:**
Perform performance testing on authentication endpoints.

**Acceptance Criteria:**
- [ ] Test logout endpoint response time (<200ms)
- [ ] Test password reset request response time (<500ms)
- [ ] Test concurrent user load (100 users)
- [ ] Test Redis blacklist performance with 10k tokens
- [ ] Test session cleanup job performance
- [ ] Monitor memory usage during tests
- [ ] Test database query performance
- [ ] Generate performance report
- [ ] Identify bottlenecks

**Design References:**
- File: /Users/musti/Documents/Projects/MyCrypto_Platform/Inputs/performance-testing-plan.md

---

## Dependency Graph

```
Start
  │
  ├─[PARALLEL TRACK 1: Database]
  │   ├─ DB-001: Password Reset Token Schema (45m)
  │   └─ DB-002: Session Revocation Schema (30m)
  │
  ├─[PARALLEL TRACK 2: DevOps Prep]
  │   ├─ DO-001: Email Templates (60m)
  │   └─ DO-002: Redis Configuration (45m)
  │
  └─[PARALLEL TRACK 3: QA Planning]
      └─ QA-001: Test Plan Creation (60m)

[SEQUENTIAL TRACK: Backend - Starts after DB tasks]
  │
  ├─ BE-001: Logout Endpoint (60m) [Depends on: DB-002]
  ├─ BE-002: Password Reset Request (90m) [Depends on: DB-001]
  ├─ BE-003: Password Reset Confirm (90m) [Depends on: BE-002]
  └─ BE-004: Session Management (60m) [Depends on: DB-002, BE-001]

[SEQUENTIAL TRACK: Frontend - Starts after Backend endpoints]
  │
  ├─ FE-001: Logout Implementation (60m) [Depends on: BE-001]
  ├─ FE-002: Forgot Password Page (90m) [Depends on: BE-002]
  ├─ FE-003: Reset Password Page (90m) [Depends on: BE-003]
  └─ FE-004: Auth State Updates (45m) [Depends on: FE-001]

[PARALLEL TRACK: DevOps Completion]
  │
  └─ DO-003: Session Cleanup Job (45m) [Depends on: BE-004]

[FINAL TRACK: QA Testing - After Features Complete]
  │
  ├─ QA-002: E2E Tests - Logout (75m) [Depends on: FE-001]
  ├─ QA-003: E2E Tests - Password Reset (90m) [Depends on: FE-002, FE-003]
  ├─ QA-004: Security Testing (90m) [Depends on: All BE/FE tasks]
  └─ QA-005: Performance Testing (60m) [Depends on: All BE tasks]
```

---

## Critical Path Analysis

**Critical Path:** DB-001 → BE-002 → BE-003 → FE-003 → QA-003
**Total Duration:** 6 hours 15 minutes

**Parallel Execution Opportunities:**
1. Database tasks (DB-001, DB-002) can run in parallel
2. DevOps tasks (DO-001, DO-002) can run in parallel with database tasks
3. QA test planning (QA-001) can start immediately
4. Frontend tasks can begin as soon as their backend dependencies are complete

---

## Task Execution Timeline

### Morning Block (9:00 AM - 12:00 PM)
- **09:00-09:45:** DB-001, DB-002, DO-001, DO-002, QA-001 [PARALLEL]
- **09:45-10:45:** BE-001, BE-002 start
- **10:45-12:00:** BE-002 continues, BE-003 starts

### Afternoon Block (1:00 PM - 6:00 PM)
- **13:00-14:30:** BE-003 complete, BE-004, FE-001, FE-002 start
- **14:30-16:00:** FE-003, FE-004, DO-003
- **16:00-18:00:** QA-002, QA-003, QA-004, QA-005

---

## Risk Mitigation

### Identified Risks
1. **Email Service Integration Delays**
   - Mitigation: Use mock email service for development
   - Fallback: Log reset links to console in dev environment

2. **Redis Blacklist Performance**
   - Mitigation: Implement memory limits and monitoring
   - Fallback: Use database-backed blacklist if needed

3. **Token Security Vulnerabilities**
   - Mitigation: Comprehensive security testing (QA-004)
   - Fallback: Additional security review if issues found

4. **Frontend-Backend Integration Issues**
   - Mitigation: Clear API contracts and early integration testing
   - Fallback: Mock API responses for frontend development

---

## Success Criteria

### Story Completion Checklist
- [ ] All users can successfully logout
- [ ] Tokens are properly invalidated on logout
- [ ] Password reset emails are sent within 60 seconds
- [ ] Reset tokens expire after 1 hour
- [ ] Reset tokens are single-use only
- [ ] Rate limiting prevents abuse (3 requests/hour)
- [ ] All sessions invalidated after password reset
- [ ] 80% code coverage on all new code
- [ ] All E2E tests passing
- [ ] Security tests show no critical vulnerabilities
- [ ] Performance metrics meet SLA requirements

### Deliverables
1. Logout endpoint (POST /api/v1/auth/logout)
2. Password reset request endpoint (POST /api/v1/auth/password-reset/request)
3. Password reset confirm endpoint (POST /api/v1/auth/password-reset/confirm)
4. Forgot Password page UI
5. Reset Password page UI
6. Email templates (reset request, reset success)
7. Comprehensive test suite
8. Updated API documentation

---

## Agent Utilization Summary

| Agent | Total Tasks | Total Hours | Utilization % |
|-------|------------|-------------|---------------|
| Database Engineer | 2 | 1.25 hrs | 78% |
| Backend Developer | 4 | 5.00 hrs | 100% |
| Frontend Developer | 4 | 4.75 hrs | 95% |
| DevOps Engineer | 3 | 2.50 hrs | 83% |
| QA Engineer | 5 | 6.25 hrs | 100% |

**Team Utilization:** 92% (optimal range)

---

## Communication Points

### Morning Standup Topics (9:00 AM)
1. Review Day 4 completion status
2. Confirm Story 1.3 requirements understanding
3. Identify any blocking dependencies
4. Assign tasks per this plan

### Midday Sync (1:00 PM)
1. Backend endpoints status check
2. Frontend readiness confirmation
3. Address any integration issues
4. Adjust timeline if needed

### Evening Report (6:00 PM)
1. Story 1.3 completion percentage
2. Test execution results
3. Any security findings
4. Day 6 preparation needs

---

## Notes for Tech Lead

1. **Priority Focus:** Password reset flow is critical for user retention
2. **Security Emphasis:** Extra attention on token security and rate limiting
3. **Integration Points:** Early API testing between frontend and backend
4. **Documentation:** Ensure API specs are updated in real-time
5. **Monitoring:** Set up alerts for failed password reset attempts

This plan achieves 92% team utilization while maintaining clear dependencies and allowing for parallel execution where possible. The critical path is well-defined and risk mitigation strategies are in place.