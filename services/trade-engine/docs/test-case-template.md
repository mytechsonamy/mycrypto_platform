# Test Case Template

## TC-XXX: [Descriptive Title]

**Feature:** [Feature Name] (Story TE-XXX)
**Type:** Unit / Integration / E2E / API
**Priority:** P0 (Critical) / P1 (High) / P2 (Medium) / P3 (Low)
**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed / ⏭ Skipped
**Created Date:** [Date]
**Executed Date:** [Date]
**Executed By:** [QA Agent]
**Duration:** [X minutes]

---

## Test Objective
Clear statement of what this test validates and why it's important.

## Preconditions
All required setup that must be in place before executing this test:
- [ ] Service requirement 1 (e.g., PostgreSQL running)
- [ ] Service requirement 2 (e.g., Redis running)
- [ ] Test data setup (e.g., test user created with ID: 123)
- [ ] Configuration state (e.g., log level set to debug)
- [ ] Environment state (e.g., database in clean state)

## Test Steps

### Step 1: [Action Description]
**What:** Describe the action being performed
**How:** Command, API endpoint, or UI action
```bash
# Example command
curl -X POST http://localhost:8080/api/endpoint \
  -H "Content-Type: application/json" \
  -d '{"field": "value"}'
```
**Expected:** Immediate response or observable behavior

### Step 2: [Next Action Description]
**What:** Next action in the workflow
**How:** [How to perform it]
```bash
# Example command
curl -X GET http://localhost:8080/api/endpoint/123
```
**Expected:** [Expected response/behavior]

### Step 3: [Verification Step]
**What:** How to verify the result
**How:** [How to verify]
```bash
# Example verification
curl -X GET http://localhost:8080/health | grep -q '"status":"ok"' && echo "PASS" || echo "FAIL"
```
**Expected:** [Specific result indicating success]

---

## Expected Result
Detailed description of what should happen if the test passes:
- Specific response status code (e.g., HTTP 200)
- Response body content or structure
- Database state changes (if applicable)
- Logs or events generated
- Side effects or confirmations

### Response Format (if API)
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "field": "value"
  },
  "timestamp": "2025-11-23T12:00:00Z"
}
```

### Database State
- Table: [table_name]
- Records: [number of records]
- State: [final state description]

---

## Actual Result

### Initial Execution
```
[Actual output when executed]
```

**Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

**Notes:** [Any deviations from expected]

### Error Output (if failed)
```
[Error message or unexpected output]
```

### Evidence/Screenshots
- [Link to log file]
- [Link to screenshot]
- [JSON response captured]

---

## Pass Criteria
For this test to pass, ALL of the following must be true:
- [ ] HTTP status code is 200 (or expected code)
- [ ] Response JSON structure matches expected format
- [ ] [Specific field] has value [expected value]
- [ ] Database record was created/updated correctly
- [ ] [Any other specific requirement]

---

## Fail Criteria
The test FAILS if ANY of the following occur:
- [ ] HTTP status code is not 200 (or expected code)
- [ ] Response is empty or malformed
- [ ] Database state did not change as expected
- [ ] Error message indicates failure
- [ ] Timeout or connection refused

---

## Edge Cases to Test

### Variant 1: [Edge Case Description]
- **Condition:** [What makes this edge case]
- **Steps:** [Modified steps for this variant]
- **Expected:** [Different expected result]
- **Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

### Variant 2: [Another Edge Case]
- **Condition:** [What makes this edge case]
- **Steps:** [Modified steps for this variant]
- **Expected:** [Different expected result]
- **Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

---

## Error Scenarios

### Scenario 1: Missing Required Field
- **Input:** Request missing [field name]
- **Expected:** HTTP 400 with error message "Field [name] is required"
- **Actual:** [Result when tested]
- **Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

### Scenario 2: Invalid Data Type
- **Input:** Field [name] with value [invalid value]
- **Expected:** HTTP 400 with error message "Field [name] must be [type]"
- **Actual:** [Result when tested]
- **Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

### Scenario 3: Duplicate Record
- **Input:** Create record with duplicate [field]
- **Expected:** HTTP 409 with error message "Record already exists"
- **Actual:** [Result when tested]
- **Status:** ⬜ Not Tested / ✅ Passed / ❌ Failed

---

## Performance Metrics (if applicable)

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Response Time | < 100ms | [X]ms | ✅ / ❌ |
| Database Query Time | < 50ms | [X]ms | ✅ / ❌ |
| Memory Usage | < 50MB | [X]MB | ✅ / ❌ |

---

## Post-Test Cleanup

Steps to restore environment to clean state:
```bash
# Example cleanup commands
docker-compose exec postgres psql -U trade_engine_user -d trade_engine_db \
  -c "DELETE FROM orders WHERE id = 'test-id';"
```

---

## Artifacts and Logs

### Test Logs
- **Log File:** [Path to log file]
- **Timestamp:** [Start time - End time]
- **Relevant Entries:** [Key log lines]

### Screenshots/Output
- [Link to screenshot 1]
- [Link to JSON response capture]
- [Link to database query result]

### Related Bugs
- [BUG-XXX]: [Title] - [Link]
- [BUG-XXX]: [Title] - [Link]

---

## Dependencies

### Blocked By
- [ ] [TC-XXX]: [Description]
- [ ] [BUG-XXX]: [Description]

### Blocks
- [ ] [TC-XXX]: [Description]
- [ ] Feature deployment

---

## Notes and Comments

### Technical Notes
- [Implementation detail that affects testing]
- [Workaround used during test]
- [Known limitation]

### Test Execution Notes
- Executed on [date] by [QA Agent]
- Retry #[X] after [previous issue]
- [Any environmental factors affecting results]

### Recommendations
- Suggested improvement to test
- Potential optimization for feature
- Additional test cases needed

---

## Automation Details

### Test Automation Code
Can this test be automated? **Yes / No**

**Rationale:** [Why or why not]

### Automated Test Implementation
```go
// Example Go test implementation
func TestXXX(t *testing.T) {
    // Setup
    // Execute
    // Assert
}
```

### CI/CD Integration
- **Pipeline:** [Which CI/CD pipeline]
- **Frequency:** On every commit / Daily / Manual
- **Timeout:** [X minutes]

---

## Regression Testing

### Previous Issues
- [Historical bug fixed by this feature]
- [Previous similar test that failed]

### Regression Tests Included
- [ ] Test to prevent previous bug from recurring
- [ ] Test to ensure related functionality still works
- [ ] Test to verify performance not degraded

---

## Sign-off

**Test Execution:** ✅ Complete / ❌ Incomplete

**Result:** ✅ Passed / ❌ Failed / ⏭ Skipped

**Issues Found:** [Number] (Critical: [X], High: [X], Medium: [X])

**QA Agent:** ________________

**Date:** __________

**Comments:**
[Final comments on test execution and results]

---

## Test Case History

| Date | Version | Status | Notes |
|------|---------|--------|-------|
| 2025-11-23 | 1.0 | Passed | Initial execution |
| [Date] | [Version] | [Status] | [Notes] |
