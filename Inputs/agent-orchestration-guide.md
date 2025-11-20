# 🤖 Claude Agent Orchestration Guide
## Multi-Agent Development Strategy

**Version:** 1.0  
**Last Updated:** 2025-11-19  
**Purpose:** Coordinate multiple Claude agents for parallel development

---

## 🎯 Agent Architecture Overview

```
                    ┌─────────────────┐
                    │  Tech Lead      │
                    │  Agent          │
                    │  (Orchestrator) │
                    └────────┬────────┘
                             │
        ┏━━━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━━━┓
        ┃                                        ┃
   ┌────▼─────┐  ┌──────────┐  ┌──────────┐  ┌─▼────────┐
   │ Backend  │  │ Frontend │  │ DevOps   │  │ Database │
   │ Agent    │  │ Agent    │  │ Agent    │  │ Agent    │
   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
        │             │              │             │
        └─────────────┴──────────────┴─────────────┘
                      │
                 ┌────▼────┐
                 │   QA    │
                 │  Agent  │
                 └─────────┘
```

---

## 👥 Agent Roster

### 1. Tech Lead Agent (Orchestrator)
**Role:** Coordinator, Architect, Reviewer

### 2. Backend Agent
**Role:** API Development (NestJS, Go, Rust)

### 3. Frontend Agent
**Role:** UI/UX Development (React, React Native)

### 4. DevOps Agent
**Role:** Infrastructure, CI/CD, Monitoring

### 5. Database Agent
**Role:** Schema Design, Migrations, Optimization

### 6. QA Agent
**Role:** Testing, Validation, Bug Reports

---

## 🎭 Agent 1: Tech Lead Agent

### Responsibilities
- 📋 Sprint planning & task breakdown
- 🏗️ Architecture decisions
- 👀 Code review & approval
- 🔄 Agent coordination
- 📊 Progress tracking
- 🚨 Blocker resolution
- 📝 Documentation review

### Skills Required
- Deep understanding of all tech stacks
- System design expertise
- Leadership & communication
- Risk assessment

### Working Protocol

**Input Format:**
```markdown
## Current Sprint: Sprint 1
## Sprint Goal: User Registration, Login, 2FA

### Available Resources:
- Backend Agent: Available
- Frontend Agent: Available
- DevOps Agent: Available
- Database Agent: Available
- QA Agent: Available

### Backlog (Priority Order):
1. User Story 1.1: User Registration (5 points)
2. User Story 1.2: User Login (5 points)
3. User Story 1.3: Two-Factor Authentication (8 points)

### Current Status:
- Sprint Day: 1 of 10
- Completed: 0 points
- In Progress: 0 points
- Blocked: 0
```

**Output Format:**
```markdown
## Sprint 1 - Day 1 Task Assignments

### Database Agent
**Task:** DB-001 - Create User Schema
**Priority:** P0 (Blocking)
**Estimated:** 2 hours
**Dependencies:** None
**Acceptance Criteria:**
- [ ] Users table created with fields: id, email, password_hash, created_at, updated_at
- [ ] Email unique constraint
- [ ] Migration script in /migrations/001_create_users.sql
- [ ] Rollback script tested
**Handoff:** Backend Agent (after completion)

### Backend Agent
**Task:** BE-001 - Implement Auth Service Registration Endpoint
**Priority:** P0
**Estimated:** 4 hours
**Dependencies:** DB-001
**Acceptance Criteria:**
- [ ] POST /api/v1/auth/register endpoint
- [ ] Email validation (regex)
- [ ] Password hashing (Argon2id)
- [ ] Email verification token generation
- [ ] Unit tests (80% coverage)
- [ ] OpenAPI spec updated
**Handoff:** Frontend Agent, QA Agent

### Frontend Agent
**Task:** FE-001 - Create Registration Form UI
**Priority:** P1
**Estimated:** 3 hours
**Dependencies:** None (can work in parallel with mock)
**Acceptance Criteria:**
- [ ] Form with email, password, confirm password fields
- [ ] Client-side validation
- [ ] Password strength indicator
- [ ] Loading & error states
- [ ] Responsive design (mobile + desktop)
**Handoff:** QA Agent

### DevOps Agent
**Task:** DO-001 - Setup Dev Environment
**Priority:** P0 (Blocking)
**Estimated:** 6 hours
**Dependencies:** None
**Acceptance Criteria:**
- [ ] Kubernetes cluster ready
- [ ] PostgreSQL deployed
- [ ] Redis deployed
- [ ] CI/CD pipeline for auth-service
- [ ] Health check endpoints working
**Handoff:** Backend Agent

---

## Daily Standup Format (For Tech Lead)
**Yesterday:**
- Completed: [list tasks]
- Blockers: [list blockers]

**Today:**
- Planned: [list tasks]
- Assignments: [agent assignments]

**Notes:**
- [any architectural decisions, risks, etc.]
```

### Definition of Done (for Tech Lead)
- [ ] All sprint tasks assigned to agents
- [ ] Dependencies clearly marked
- [ ] No agent is idle (if work available)
- [ ] Blockers resolved within 4 hours
- [ ] Daily progress report generated
- [ ] Code reviews completed within 24h
- [ ] Sprint demo prepared (last day)

### Sample Prompts

**Sprint Planning:**
```
You are the Tech Lead Agent. Review Sprint 1 backlog (User Stories 1.1, 1.2, 1.3 from mvp-backlog-detailed.md). Break down into tasks for 6 agents (Backend, Frontend, DevOps, Database, QA). Identify dependencies. Create day-by-day task assignments for 10-day sprint. Format output as markdown with clear acceptance criteria per task.
```

**Daily Coordination:**
```
Tech Lead Agent: It's Day 3 of Sprint 1. Review completed tasks:
- DB-001: ✅ Done
- BE-001: 🔄 In Progress (50%)
- FE-001: ✅ Done
- DO-001: ✅ Done

Backend Agent reports: "BE-001 blocked by Redis connection issues"
DevOps Agent reports: "Redis deployed but connection pool config missing"

Actions:
1. Assign DevOps Agent to fix Redis config (Priority P0)
2. Reassign Backend Agent to BE-002 (Login endpoint) temporarily
3. Update task board
4. Estimate: Redis fix 1 hour, BE-001 can resume after

Provide updated task assignments for Day 3 afternoon.
```

**Code Review:**
```
Tech Lead Agent: Review pull request from Backend Agent:
- PR: feat(auth): add user registration endpoint
- Files: src/auth/auth.controller.ts, src/auth/auth.service.ts, test/auth.spec.ts
- Checklist:
  * Code follows engineering-guidelines.md naming conventions
  * Error handling implemented
  * Tests have 80%+ coverage
  * OpenAPI spec updated
  * No security issues

Provide feedback: Approve or Request Changes with specific comments.
```

---

## 🎭 Agent 2: Backend Agent

### Responsibilities
- 🔧 API endpoint development
- 🧪 Unit & integration tests
- 📄 OpenAPI spec updates
- 🔐 Security implementation
- 🐛 Bug fixes (backend)

### Tech Stack
- NestJS (Auth, Wallet)
- Go (Trading)
- Rust (Matching Engine - if needed)
- PostgreSQL, Redis

### Working Protocol

**Input Format (from Tech Lead):**
```markdown
## Task: BE-001 - Implement User Registration Endpoint

### User Story Reference
User Story 1.1 from mvp-backlog-detailed.md

### Technical Requirements
- Endpoint: POST /api/v1/auth/register
- Framework: NestJS
- Database: PostgreSQL (users table already exists)
- Validation: class-validator
- Password Hashing: Argon2id (min 12 rounds)
- Email: Send verification link (use notification service queue)

### Acceptance Criteria
- [ ] Endpoint accepts: email, password
- [ ] Email validation (format + unique check)
- [ ] Password validation (min 8 chars, 1 uppercase, 1 number, 1 special)
- [ ] User created in database
- [ ] Verification token generated (JWT, 24h expiry)
- [ ] Email queued for sending
- [ ] Returns: 201 Created with success message
- [ ] Errors: 400 (validation), 409 (duplicate email)
- [ ] Unit tests: UserService.register() (80% coverage)
- [ ] Integration test: POST /auth/register (happy path + error cases)
- [ ] OpenAPI spec updated

### Files to Create/Modify
- src/auth/dto/register.dto.ts (new)
- src/auth/auth.service.ts (new method)
- src/auth/auth.controller.ts (new endpoint)
- test/auth.service.spec.ts (new tests)
- test/auth.e2e.spec.ts (new tests)
- openapi-specification.yaml (update)

### Dependencies
- ✅ DB-001: Users table exists
- ✅ DO-001: Dev environment ready

### Estimated Time: 4 hours

### Handoff After Completion
- Frontend Agent (for UI integration)
- QA Agent (for testing)
```

**Output Format:**
```markdown
## Task BE-001: COMPLETED ✅

### Implementation Summary
- Created RegisterDto with validation decorators
- Implemented AuthService.register() with:
  * Email format validation
  * Duplicate check (try-catch on unique constraint)
  * Argon2id password hashing (12 rounds)
  * JWT token generation (24h expiry)
  * RabbitMQ message to notification-service
- Added POST /auth/register endpoint in AuthController
- Error handling: 400, 409, 500 with proper error format

### Test Results
- Unit tests: 12 tests, 85% coverage ✅
- Integration tests: 5 scenarios (happy + 4 error cases) ✅
- All tests passing ✅

### Files Modified
- src/auth/dto/register.dto.ts (created)
- src/auth/auth.service.ts (+50 lines)
- src/auth/auth.controller.ts (+30 lines)
- test/auth.service.spec.ts (+80 lines)
- test/auth.e2e.spec.ts (+60 lines)
- openapi-specification.yaml (updated)

### OpenAPI Spec
- Endpoint documented: POST /api/v1/auth/register
- Request schema: RegisterDto
- Responses: 201, 400, 409, 500

### Code Review Checklist
- [x] Follows engineering-guidelines.md conventions
- [x] Error messages in Turkish (user-facing)
- [x] Logging added (JSON format)
- [x] No secrets in code
- [x] Database transactions used
- [x] Rate limiting considered (controller level)

### Pull Request
- Branch: feature/SHORT-001-user-registration
- PR Link: https://github.com/org/repo/pull/123
- Status: Ready for Review

### Blockers/Notes
- None

### Time Spent: 3.5 hours (under estimate ✅)

### Handoff
- 👉 Frontend Agent: API ready for integration
- 👉 QA Agent: Ready for testing
- 👉 Tech Lead: Ready for code review
```

### Definition of Done (Backend Agent)
- [ ] Code written and committed
- [ ] Unit tests ≥ 80% coverage
- [ ] Integration tests pass
- [ ] OpenAPI spec updated
- [ ] Error handling implemented
- [ ] Logging added (JSON format)
- [ ] No linting errors
- [ ] Security best practices followed
- [ ] Pull request created
- [ ] Self-reviewed (code review checklist)

### Sample Prompts

**Starting a Task:**
```
Backend Agent: You are assigned task BE-001 (User Registration Endpoint). 

Context:
- Sprint 1, Day 2
- NestJS project structure: /services/auth-service
- Database users table exists (DB-001 completed)
- Engineering guidelines: engineering-guidelines.md
- User Story: mvp-backlog-detailed.md (Story 1.1)

Steps:
1. Read engineering-guidelines.md for NestJS conventions
2. Create RegisterDto with validation
3. Implement AuthService.register()
4. Add controller endpoint
5. Write unit tests (target 80% coverage)
6. Write integration tests
7. Update openapi-specification.yaml

Start with step 1. Show me the RegisterDto with proper validation decorators.
```

**Handling Blockers:**
```
Backend Agent: Task BE-003 blocked. Issue: Redis connection failing in dev environment.

Error: "ECONNREFUSED 127.0.0.1:6379"

Environment: dev
Redis expected: redis:6379 (docker-compose)

Actions:
1. Check docker-compose.yml (is Redis running?)
2. Check connection string in .env
3. Test manual connection: redis-cli -h redis ping
4. Report findings to Tech Lead if infra issue
5. If config issue, fix and retry

What do you find?
```

**Code Review Feedback:**
```
Backend Agent: Tech Lead provided code review feedback on PR #123:

Comments:
1. "Use enum for error codes instead of strings" (auth.service.ts:45)
2. "Add JSDoc comment for register() method" (auth.service.ts:30)
3. "Test case missing: email with uppercase letters" (auth.service.spec.ts)

Actions:
1. Address all comments
2. Push updates to feature branch
3. Reply to each comment with "Fixed in commit abc123"
4. Re-request review

Show me the updated code addressing comment #1.
```

---

## 🎭 Agent 3: Frontend Agent

### Responsibilities
- 🎨 UI component development
- ⚡ State management (Redux)
- 🔌 API integration
- 📱 Responsive design
- ♿ Accessibility

### Tech Stack
- React 18 + TypeScript
- Redux Toolkit
- Material-UI v5
- React Native (mobile)
- Axios (API client)

### Working Protocol

**Input Format:**
```markdown
## Task: FE-001 - Create Registration Form UI

### User Story Reference
User Story 1.1 from mvp-backlog-detailed.md

### Technical Requirements
- Framework: React + TypeScript
- UI Library: Material-UI v5
- Validation: Client-side (before API call)
- State: Redux Toolkit slice
- API: POST /api/v1/auth/register (mock initially, real after BE-001)

### Design Specs
- Form fields: Email, Password, Confirm Password
- Checkbox: Terms & Conditions, KVKK Consent
- Button: "Kayıt Ol" (Register)
- Success: Redirect to /verify-email page
- Error: Show toast notification (red)

### Acceptance Criteria
- [ ] Form renders on /register page
- [ ] Email validation: format check
- [ ] Password validation: min 8 chars, 1 uppercase, 1 number, 1 special
- [ ] Password match validation (confirm password)
- [ ] Checkboxes required
- [ ] Loading state (button disabled, spinner)
- [ ] Error state (toast notification)
- [ ] Success state (redirect)
- [ ] Responsive (mobile + desktop)
- [ ] Accessibility (ARIA labels, keyboard navigation)

### Files to Create
- src/pages/RegisterPage.tsx
- src/components/RegisterForm.tsx
- src/store/slices/authSlice.ts
- src/api/authApi.ts
- src/pages/RegisterPage.test.tsx

### Dependencies
- None (can use mock API)

### Estimated Time: 3 hours
```

**Output Format:**
```markdown
## Task FE-001: COMPLETED ✅

### Implementation Summary
- Created RegisterPage with Material-UI form
- Implemented client-side validation (Formik + Yup)
- Redux slice for auth state (loading, error, user)
- API client with Axios interceptors
- Success/error toast notifications (react-toastify)
- Responsive design (mobile-first)

### Components Created
- RegisterPage.tsx (container)
- RegisterForm.tsx (presentational)
- PasswordStrengthIndicator.tsx (reusable)

### Redux State
```typescript
interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}
```

### Test Results
- Component tests: 8 tests ✅
- Integration test: Registration flow (mock API) ✅
- Accessibility audit: 0 violations ✅

### Files Modified
- src/pages/RegisterPage.tsx (created)
- src/components/RegisterForm.tsx (created)
- src/components/PasswordStrengthIndicator.tsx (created)
- src/store/slices/authSlice.ts (created)
- src/api/authApi.ts (created)
- src/App.tsx (added route)

### Screenshots
- Desktop: ![register-desktop.png]
- Mobile: ![register-mobile.png]
- Loading state: ![register-loading.png]
- Error state: ![register-error.png]

### Pull Request
- Branch: feature/SHORT-001-registration-ui
- PR Link: https://github.com/org/repo/pull/124
- Status: Ready for Review

### Handoff
- 👉 QA Agent: Ready for UI/UX testing
- 👉 Backend Agent: Will integrate real API after BE-001

### Time Spent: 3 hours ✅
```

### Definition of Done (Frontend Agent)
- [ ] Component renders without errors
- [ ] Client-side validation works
- [ ] API integration tested (mock or real)
- [ ] Loading/error/success states handled
- [ ] Responsive (tested on mobile + desktop)
- [ ] Accessibility: 0 violations (axe-core)
- [ ] Component tests ≥ 70% coverage
- [ ] No console errors/warnings
- [ ] Pull request created

---

## 🎭 Agent 4: DevOps Agent

### Responsibilities
- 🏗️ Infrastructure setup
- 🚀 CI/CD pipelines
- 📊 Monitoring & alerting
- 🐳 Docker & Kubernetes
- 🔐 Secrets management

### Tech Stack
- Kubernetes 1.28
- Docker
- GitHub Actions
- ArgoCD
- Prometheus + Grafana
- AWS (EKS, RDS, S3)

### Working Protocol

**Input Format:**
```markdown
## Task: DO-001 - Setup Dev Environment

### Requirements
- Kubernetes cluster (EKS or local minikube)
- PostgreSQL 16 (RDS or helm chart)
- Redis 7 (helm chart)
- RabbitMQ 3.12 (helm chart)
- Auth Service deployment (placeholder, health check only)

### Acceptance Criteria
- [ ] Kubernetes cluster accessible (kubectl get nodes)
- [ ] PostgreSQL deployed, accessible from pods
- [ ] Redis deployed, accessible from pods
- [ ] RabbitMQ deployed, management UI accessible
- [ ] Auth service deployed (health check returns 200)
- [ ] CI/CD pipeline: GitHub Actions workflow for auth-service
- [ ] Monitoring: Prometheus scraping auth-service metrics
- [ ] Logs: Fluent Bit shipping logs to Elasticsearch

### Files to Create
- k8s/base/auth-service/deployment.yaml
- k8s/base/auth-service/service.yaml
- k8s/base/postgres/deployment.yaml (or helm values)
- k8s/base/redis/deployment.yaml (or helm values)
- .github/workflows/auth-service-ci.yml
- prometheus/scrape-configs/auth-service.yaml

### Estimated Time: 6 hours
```

**Output Format:**
```markdown
## Task DO-001: COMPLETED ✅

### Infrastructure Summary
- Kubernetes: EKS cluster (3 nodes, t3.medium)
- PostgreSQL: RDS instance (db.t3.micro, dev-postgres)
- Redis: Helm chart (bitnami/redis)
- RabbitMQ: Helm chart (bitnami/rabbitmq)
- Auth Service: Deployed (v0.1.0-health-check)

### Access Details
- Kubernetes: `kubectl config use-context dev-eks`
- PostgreSQL: `dev-postgres.rds.amazonaws.com:5432`
- Redis: `redis-master.default.svc.cluster.local:6379`
- RabbitMQ Management: http://rabbitmq.dev.exchange.com:15672 (admin/password)
- Auth Service: http://auth.dev.exchange.com/health

### CI/CD Pipeline
- Workflow: .github/workflows/auth-service-ci.yml
- Triggers: Push to develop, PRs to develop
- Steps: Lint → Test → Build → Push to ECR → Deploy to dev
- Status: ✅ First run successful (build #1)

### Monitoring
- Prometheus: Scraping auth-service on /metrics
- Grafana: System Overview dashboard deployed
- Alerts: ServiceDown alert configured

### Logs
- Fluent Bit: Deployed as DaemonSet
- Elasticsearch: dev-elasticsearch.us-east-1.es.amazonaws.com
- Kibana: http://kibana.dev.exchange.com

### Secrets
- Database URL: AWS Secrets Manager (dev/database/url)
- Redis Password: Kubernetes Secret (redis-secret)
- JWT Secret: Kubernetes Secret (jwt-secret)

### Files Created
- k8s/base/auth-service/deployment.yaml
- k8s/base/auth-service/service.yaml
- k8s/base/auth-service/hpa.yaml
- helm/postgres/values.yaml
- helm/redis/values.yaml
- .github/workflows/auth-service-ci.yml
- prometheus/alerts/dev.yml

### Validation
- [x] kubectl get pods (all running)
- [x] psql -h dev-postgres (connection successful)
- [x] redis-cli -h redis-master ping (PONG)
- [x] curl http://auth.dev.exchange.com/health (200 OK)
- [x] GitHub Actions build #1 (passed)

### Pull Request
- Branch: infra/setup-dev-environment
- PR Link: https://github.com/org/repo/pull/125
- Status: Merged (no review needed for infra)

### Handoff
- 👉 Backend Agent: Dev environment ready for deployment
- 👉 Database Agent: PostgreSQL accessible

### Time Spent: 5.5 hours ✅
```

### Definition of Done (DevOps Agent)
- [ ] Infrastructure provisioned
- [ ] All services healthy
- [ ] CI/CD pipeline working
- [ ] Monitoring enabled
- [ ] Logs flowing to ELK
- [ ] Secrets properly managed
- [ ] Documentation updated (README, runbook)
- [ ] Validation tests pass

---

## 🎭 Agent 5: Database Agent

### Responsibilities
- 📊 Schema design
- 🔄 Migration scripts
- 🔍 Query optimization
- 📈 Index management
- 🔧 Database tuning

### Tech Stack
- PostgreSQL 16
- TypeORM / Prisma
- SQL
- pgAdmin

### Working Protocol

**Input Format:**
```markdown
## Task: DB-001 - Create User Schema

### User Story Reference
User Stories 1.1, 1.2 (Registration & Login)

### Requirements
- Table: users
- Fields: id (UUID), email (unique), password_hash, email_verified (boolean), created_at, updated_at
- Constraints: email unique, email format check
- Indexes: email (for login queries)

### Acceptance Criteria
- [ ] Migration script: 001_create_users.sql
- [ ] Rollback script: 001_create_users.down.sql
- [ ] Email constraint: UNIQUE, NOT NULL
- [ ] Index on email (btree)
- [ ] Default: email_verified = false
- [ ] Timestamps: created_at, updated_at (auto)
- [ ] Migration tested (up + down)

### Estimated Time: 2 hours
```

**Output Format:**
```markdown
## Task DB-001: COMPLETED ✅

### Schema Created
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- Trigger for updated_at
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

### Migration Files
- migrations/001_create_users.sql (up)
- migrations/001_create_users.down.sql (rollback)

### Validation
- [x] Migration applied successfully
- [x] Rollback tested
- [x] Unique constraint works (duplicate insert fails)
- [x] Index created (EXPLAIN shows index scan)

### Performance Notes
- Email index: btree, ~O(log n) lookup
- Expected rows: 100K (MVP)
- Index size: ~5MB (estimated)

### Handoff
- 👉 Backend Agent: Schema ready for user registration

### Time Spent: 1.5 hours ✅
```

### Definition of Done (Database Agent)
- [ ] Migration script written
- [ ] Rollback script written
- [ ] Constraints added
- [ ] Indexes created
- [ ] Migration tested (up + down)
- [ ] Performance validated (EXPLAIN)
- [ ] Documentation updated (schema diagram)

---

## 🎭 Agent 6: QA Agent

### Responsibilities
- 🧪 Test case creation
- ✅ Manual testing
- 🤖 Automated test scripts
- 🐛 Bug reporting
- 📊 Test coverage reports

### Tech Stack
- Jest (unit/integration)
- Cypress (E2E)
- Postman (API)
- Accessibility tools (axe-core)

### Working Protocol

**Input Format:**
```markdown
## Task: QA-001 - Test User Registration Flow

### Features to Test
- Backend: POST /api/v1/auth/register (BE-001)
- Frontend: Registration form (FE-001)

### Test Scenarios (from mvp-backlog-detailed.md, Story 1.1)
1. Happy path: Valid email + password → Success
2. Invalid email format → 400 error
3. Duplicate email → 409 error
4. Weak password → 400 error
5. Password mismatch → 400 error (frontend only)
6. Missing terms checkbox → Frontend validation error

### Acceptance Criteria
- [ ] All 6 scenarios tested manually
- [ ] Postman collection created (API tests)
- [ ] Cypress E2E test written
- [ ] Bugs reported (if any)
- [ ] Test report generated

### Estimated Time: 2 hours
```

**Output Format:**
```markdown
## Task QA-001: COMPLETED ✅

### Test Results

#### API Tests (Postman)
- Total: 6 scenarios
- Passed: 5 ✅
- Failed: 1 ❌

#### Failed Test
- **Scenario 3:** Duplicate email
- **Expected:** 409 Conflict with message "Bu email zaten kayıtlı"
- **Actual:** 500 Internal Server Error
- **Bug:** Backend not handling unique constraint exception
- **Bug Report:** BUG-001 (created in Jira)

#### Frontend Tests (Manual)
- Total: 6 scenarios
- Passed: 6 ✅
- Failed: 0

#### E2E Test (Cypress)
- File: cypress/e2e/registration.spec.ts
- Tests: 4 (happy path + 3 error cases)
- Status: 3 passing, 1 failing (depends on BUG-001)

### Test Coverage
- API: 100% of AC covered
- Frontend: 100% of AC covered
- E2E: 75% (blocked by bug)

### Postman Collection
- File: postman/auth-endpoints.json
- Environment: dev.postman_environment.json

### Bug Reports
1. **BUG-001:** Duplicate email returns 500 instead of 409
   - Severity: Medium
   - Assigned: Backend Agent
   - Expected Fix: 1 hour

### Handoff
- 👉 Backend Agent: Fix BUG-001
- 👉 Tech Lead: 1 bug blocking QA sign-off

### Time Spent: 2.5 hours
```

### Definition of Done (QA Agent)
- [ ] All test scenarios executed
- [ ] Test results documented
- [ ] Bugs reported (with repro steps)
- [ ] Automated tests created (where applicable)
- [ ] Test coverage ≥ 80% of AC
- [ ] Sign-off given (if all pass)

---

## 🔄 Agent Coordination Patterns

### Pattern 1: Sequential Handoff

```
Database Agent (DB-001) 
  → Completes schema
  ↓
Backend Agent (BE-001)
  → Uses schema, builds API
  ↓
Frontend Agent (FE-001)
  → Integrates API
  ↓
QA Agent (QA-001)
  → Tests end-to-end
  ↓
Tech Lead Agent
  → Reviews & approves
```

### Pattern 2: Parallel Work

```
Day 1:
├─ DevOps Agent: Setup infrastructure (6h)
├─ Database Agent: Design schema (2h)
├─ Frontend Agent: Build UI with mock API (3h)
└─ Backend Agent: Research/spike (1h)

Day 2:
├─ Backend Agent: Build API (4h) [blocked until DevOps done]
└─ QA Agent: Prepare test cases (2h)
```

### Pattern 3: Bug Fix Loop

```
QA Agent finds bug (BUG-001)
  ↓
Tech Lead assigns to Backend Agent (Priority P0)
  ↓
Backend Agent fixes bug (1h)
  ↓
Backend Agent creates PR
  ↓
Tech Lead reviews (15min)
  ↓
QA Agent re-tests (30min)
  ↓
QA Agent confirms fix ✅
```

---

## 📋 Daily Workflow (Tech Lead Orchestration)

### Morning (9:00 AM)

**Tech Lead Agent Prompt:**
```
Tech Lead: Generate Daily Standup Report for Sprint 1, Day 3.

Input:
- Yesterday's completed tasks: DB-001 ✅, FE-001 ✅, DO-001 ✅
- In progress: BE-001 (50%, blocked by Redis config)
- Blockers: Redis connection issue (DO-001 needs fix)

Actions:
1. Review completed tasks
2. Identify blocker (Redis)
3. Assign DevOps Agent: DO-002 (Fix Redis config, P0, 1h)
4. Reassign Backend Agent: BE-002 (Login endpoint, can work parallel)
5. Assign QA Agent: QA-001 (Test FE-001 with mock API)

Output:
- Daily standup report
- Updated task board
- Agent assignments for today
```

### Afternoon (2:00 PM)

**Tech Lead Check-in:**
```
Tech Lead: Mid-day status check.

Agent Reports:
- DevOps: DO-002 completed ✅ (Redis fixed)
- Backend: BE-001 unblocked, resuming now
- Backend: BE-002 at 80%
- QA: QA-001 found 1 bug (BUG-001)

Actions:
1. Assign Backend Agent: Fix BUG-001 (urgent, 1h)
2. Backend Agent: Finish BE-002 after bug fix
3. QA Agent: Re-test after bug fix
4. Frontend Agent: Start FE-002 (Login form)

Estimated EOD status:
- BE-001: ✅ (with bug fix)
- BE-002: ✅
- FE-002: 50%
```

### Evening (6:00 PM)

**Tech Lead Sprint Progress:**
```
Tech Lead: Generate Sprint Progress Report (Day 3).

Completed Today:
- DO-002: Redis config fix ✅
- BE-001: User registration API ✅ (with BUG-001 fix)
- BE-002: User login API ✅
- QA-001: Registration tests ✅

In Progress:
- FE-002: Login form UI (50%)

Blockers: None

Sprint Burndown:
- Day 3: 12 points completed (cumulative)
- Remaining: 9 points
- On track: Yes ✅

Tomorrow's Plan:
- Frontend: Complete FE-002
- Backend: Start BE-003 (2FA setup)
- QA: Test login flow (QA-002)
```

---

## 🚨 Common Scenarios & Handling

### Scenario 1: Agent Stuck/Blocked

**Tech Lead Detection:**
```
Backend Agent reports: "BE-001 blocked for 3 hours. Missing API key for email service."

Tech Lead Actions:
1. Identify blocker: Missing email service API key
2. Escalate to external team (or use mock)
3. Assign Backend Agent to different task (BE-002)
4. Create ticket: BLOCK-001 (track blocker resolution)
5. Update sprint risk register

Resolution Time: 4 hours (from external team)
Impact: 4 hours lost, but agent productive on BE-002
```

### Scenario 2: Conflicting Changes

**Tech Lead Mediation:**
```
Frontend Agent: "FE-001 expects API response format: { data: {...}, success: true }"
Backend Agent: "BE-001 returns format: { result: {...}, ok: true }"

Conflict: Response format mismatch

Tech Lead Decision:
- Consult engineering-guidelines.md (canonical format)
- Canonical: { success: boolean, data: object, meta: object }
- Action: Backend Agent updates BE-001 to match
- Lesson learned: Frontend + Backend agents should sync on API contract first
```

### Scenario 3: Test Failures

**QA Agent Escalation:**
```
QA Agent: "E2E test failing: Registration flow times out after 30 seconds"

Tech Lead Investigation:
1. Check recent changes (BE-001 deployed)
2. Review logs (500 error on /api/v1/auth/register)
3. Assign Backend Agent: Debug BE-001 (P0)

Backend Agent finds: Database connection pool exhausted (20/20 connections)
DevOps Agent fixes: Increase connection pool to 50

QA Agent re-tests: E2E test passes ✅
```

---

## 📊 Success Metrics (Agent Performance)

### Agent Efficiency
- **Task Completion Rate:** ≥ 90% on first attempt
- **Handoff Smoothness:** ≤ 15min delay between agent handoffs
- **Bug Introduction Rate:** ≤ 2 bugs per agent per sprint
- **Documentation Quality:** All tasks have clear handoff notes

### Tech Lead Effectiveness
- **Blocker Resolution Time:** < 4 hours average
- **Sprint Predictability:** ±10% of planned points
- **Agent Utilization:** ≥ 80% (agents productive, not idle)
- **Code Review Turnaround:** ≤ 24 hours

---

## 🎯 Sprint 1 Day 1 - Starter Kit

### Tech Lead: Sprint Kickoff

```markdown
## Sprint 1 Kickoff - Day 1

### Sprint Goal
"Enable users to register, login, and setup 2FA"

### User Stories (21 points)
1. Story 1.1: User Registration (5 points)
2. Story 1.2: User Login (5 points)
3. Story 1.3: 2FA Setup (8 points)
4. Story 1.6: KYC Status Check (3 points)

### Day 1 Assignments

#### DevOps Agent: DO-001 (Priority P0, 6h)
Setup dev environment (K8s, PostgreSQL, Redis, RabbitMQ, CI/CD)

#### Database Agent: DB-001 (Priority P0, 2h)
Create users table schema + migration

#### Frontend Agent: FE-001 (Priority P1, 3h)
Build registration form UI (can use mock API)

#### Backend Agent: Spike (Priority P2, 2h)
Research TOTP library for 2FA (prepare for Story 1.3)

#### QA Agent: Prep (Priority P2, 2h)
Create test case templates for Stories 1.1-1.3

### Dependencies
- BE-001 blocked by DO-001, DB-001
- All other tasks can proceed in parallel

### Expected EOD Status
- DO-001: 80% (deploy PostgreSQL, Redis pending)
- DB-001: 100% ✅
- FE-001: 100% ✅
- Backend spike: 100% ✅
- QA prep: 100% ✅
```

---

## 📝 Templates for Each Agent

### Backend Agent Task Template
```markdown
## Task: BE-XXX - [Task Name]

**User Story:** [Reference]  
**Priority:** [P0/P1/P2]  
**Estimated:** [Xh]  
**Dependencies:** [List]

### Requirements
- [Requirement 1]
- [Requirement 2]

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

### Files to Modify
- [file1.ts]
- [file2.ts]

### Testing
- [ ] Unit tests (≥80% coverage)
- [ ] Integration tests

---

## Completion Report

### Implementation
[What you built]

### Test Results
[Test summary]

### Files Changed
[List files]

### Pull Request
- Branch: [name]
- PR: [link]

### Handoff
- [Agent]: [Note]

### Time: [Xh]
```

---

## 🎓 Best Practices

### For All Agents

1. **Always Read Context First**
   - Review engineering-guidelines.md
   - Check user story in mvp-backlog-detailed.md
   - Understand dependencies

2. **Clear Handoffs**
   - Document what's done
   - Note what's needed next
   - Tag the next agent

3. **Test Before Handoff**
   - Backend: Run tests locally
   - Frontend: Test in browser
   - DevOps: Validate deployments

4. **Report Blockers Immediately**
   - Don't wait 4 hours
   - Report to Tech Lead within 30 minutes
   - Suggest workarounds

5. **Follow Standards**
   - Code: engineering-guidelines.md
   - Git: cicd-branch-strategy.md
   - API: openapi-validation-checklist.md

---

## 🚀 Getting Started

### Step 1: Create Agent Instances
Create 6 separate Claude conversations, each with role-specific system prompts.

### Step 2: Initialize Tech Lead
Start with Tech Lead agent, provide Sprint 1 backlog.

### Step 3: Daily Coordination
Tech Lead assigns tasks every morning (9 AM).

### Step 4: Agent Execution
Each agent completes assigned tasks, reports back.

### Step 5: Review & Iterate
Tech Lead reviews, provides feedback, assigns next tasks.

---

**Document Owner:** Tech Lead  
**Review Frequency:** After each sprint  
**Next Review Date:** End of Sprint 1
