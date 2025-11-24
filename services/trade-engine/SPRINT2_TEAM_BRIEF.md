# Sprint 2 Team Brief
## Trade Engine - Quick Reference & Team Guide

**Sprint:** Sprint 2 (December 3-14, 2025)
**Status:** Ready to Start
**Team:** Backend Agent, QA Agent, Tech Lead

---

## Quick Summary

**Goal:** Achieve 100% production readiness
**Duration:** 10 days
**Story Points:** 9.0
**Focus:** Hardening, Testing, Operations

---

## Your Tasks This Sprint

### Backend Agent Tasks

**TASK-BACKEND-013: Production Hardening (2.5 pts, 5h)**
- **Days 1-3**
- Fix IOC auto-cancel bug
- Add stop order persistence
- Optimize connection pool
- Implement circuit breaker

**TASK-BACKEND-014: Admin API (2.0 pts, 4h)**
- **Days 3-5**
- Health endpoints
- Trading limits API
- Risk controls
- Metrics API

**TASK-BACKEND-015: Advanced Orders (1.5 pts, 3h)**
- **Days 6-8**
- Improve post-only validation
- Fix mixed order types
- Optimize stop triggers

**Total:** 12 hours over 8 days

---

### QA Agent Tasks

**TASK-QA-007: Test Coverage (1.5 pts, 3h)**
- **Days 5-7**
- Add repository tests (38% → 70%)
- Add WebSocket tests (76% → 80%)
- Add domain tests (47% → 70%)
- Consolidate mocks

**TASK-QA-008: Extended Testing (1.5 pts, 3h)**
- **Days 8-10**
- 24-hour stress test
- Failure recovery tests
- Security penetration tests

**Total:** 6 hours over 6 days

---

### Tech Lead Tasks

- Sprint planning & coordination
- Code review & approval
- Daily standups
- Stakeholder communication
- Final sign-off

**Total:** 6 hours over 10 days

---

## Daily Schedule

### Week 1

**Day 1 (Dec 3) - Planning**
- 9:00 AM: Standup
- 9:30 AM: Sprint planning
- 2:00 PM: Start TASK-BACKEND-013

**Day 2 (Dec 4) - Hardening**
- 9:00 AM: Standup
- 9:30 AM: Continue TASK-BACKEND-013
- 6:00 PM: Daily report

**Day 3 (Dec 5) - Completion**
- 9:00 AM: Standup
- 12:00 PM: Finish TASK-BACKEND-013
- 1:00 PM: Start TASK-BACKEND-014

**Day 4 (Dec 6) - Admin API**
- 9:00 AM: Standup
- All day: TASK-BACKEND-014

**Day 5 (Dec 7) - Transition**
- 9:00 AM: Standup
- 12:00 PM: Finish TASK-BACKEND-014
- 1:00 PM: Start TASK-QA-007

### Week 2

**Day 6 (Dec 8) - Testing**
- 9:00 AM: Standup
- Morning: Finish TASK-QA-007
- Afternoon: Start TASK-BACKEND-015

**Day 7 (Dec 9) - Refinement**
- 9:00 AM: Standup
- All day: TASK-BACKEND-015

**Day 8 (Dec 10) - Extended Testing**
- 9:00 AM: Standup
- 12:00 PM: Finish TASK-BACKEND-015
- 1:00 PM: Start TASK-QA-008 (stress test)

**Day 9 (Dec 11) - Validation**
- 9:00 AM: Standup
- All day: TASK-QA-008 continues

**Day 10 (Dec 12) - Review**
- 9:00 AM: Standup
- 12:00 PM: Finish TASK-QA-008
- 1:00 PM: Sprint review meeting

---

## Communication Protocols

### Daily Standup (9:00 AM)
**Format:**
- Yesterday's progress
- Today's plan
- Blockers (if any)

**Duration:** 15 minutes max

### Blocker Escalation
1. Identify blocker immediately
2. Post in team channel
3. Tech Lead responds <30 min
4. Resolution target: <4 hours

### Code Review
**Process:**
1. Create PR when task complete
2. Request review in team channel
3. Tech Lead reviews <6 hours
4. Address feedback immediately
5. Approval required before next task

---

## Success Criteria

### Sprint Complete When:
- [ ] All 9.0 points delivered
- [ ] Test coverage >90%
- [ ] All PRs approved
- [ ] 24-hour stress test passed
- [ ] Zero critical bugs
- [ ] Production ready

---

## Important Links

**Documentation:**
- Sprint 1 Report: `/SPRINT1_SIGN_OFF_REPORT.md`
- Sprint 2 Plan: `/SPRINT2_COMPREHENSIVE_PLAN.md`
- API Docs: `/API-ENDPOINTS-REFERENCE.md`

**Code:**
- Repository: `services/trade-engine/`
- Main branch: `main`
- Feature branches: `feature/sprint2-*`

**Monitoring:**
- Metrics: `http://localhost:8080/api/v1/admin/metrics`
- Health: `http://localhost:8080/health`

---

## Quick Reference

### Task Priorities
- P0: Production hardening, Admin API
- P1: Test coverage, Extended testing
- P2: Advanced order refinement

### Definition of Done
1. Code complete and reviewed
2. Tests passing (>85% coverage)
3. No linting errors
4. Documentation updated
5. PR approved
6. Deployed to staging

### Contact Info
- Tech Lead: @tech-lead (Slack)
- Backend Agent: @backend (Slack)
- QA Agent: @qa (Slack)
- Emergency: #trade-engine-alerts

---

**Ready to Start!**

Questions? Ask in #trade-engine-sprint2 channel.

Let's build something great! 🚀
