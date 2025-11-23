#!/bin/bash

# Trade Engine - Day 1 Verification Script
# Comprehensive smoke tests for all Day 1 deliverables
# Execute this after all agents complete their tasks

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Tracking variables
PASSED=0
FAILED=0
WARNINGS=0
TESTS_RUN=0

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                     Trade Engine Day 1 Verification Script                     ║${NC}"
echo -e "${BLUE}║                      Comprehensive Smoke Test Suite                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Start Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Project Directory: $PROJECT_DIR"
echo ""

# Function to print test result
print_test_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}[TEST] $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_result() {
    TESTS_RUN=$((TESTS_RUN + 1))
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC} - $2"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC} - $2"
        FAILED=$((FAILED + 1))
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠ WARN${NC} - $1"
    WARNINGS=$((WARNINGS + 1))
}

print_info() {
    echo -e "${BLUE}ℹ INFO${NC} - $1"
}

# ============================================================================
# SECTION 1: DOCKER SERVICES VERIFICATION
# ============================================================================

print_test_header "SECTION 1: Docker Services Verification"
echo ""

# Test 1.1: Docker Compose availability
echo "[1.1] Checking Docker Compose availability..."
which docker-compose > /dev/null 2>&1
print_result $? "Docker Compose is installed"
echo ""

# Test 1.2: Check if services are running
echo "[1.2] Checking if all services are running..."
cd "$PROJECT_DIR"

# Check each service
for service in postgres redis rabbitmq pgbouncer; do
    docker-compose ps "$service" 2>/dev/null | grep -q "Up" && {
        print_result 0 "$service service is running"
    } || {
        print_result 1 "$service service is running"
    }
done
echo ""

# Test 1.3: Verify all services are healthy
echo "[1.3] Checking health status of all services..."
docker-compose ps 2>/dev/null | tail -n +2 | while read -r line; do
    if echo "$line" | grep -q "(healthy)"; then
        SERVICE_NAME=$(echo "$line" | awk '{print $1}')
        print_result 0 "$SERVICE_NAME is healthy"
    elif echo "$line" | grep -q "Up"; then
        SERVICE_NAME=$(echo "$line" | awk '{print $1}')
        print_warning "$SERVICE_NAME is running but health check not yet passed"
    fi
done
echo ""

# ============================================================================
# SECTION 2: DATABASE VERIFICATION
# ============================================================================

print_test_header "SECTION 2: Database Schema Verification"
echo ""

# Test 2.1: PostgreSQL connectivity
echo "[2.1] Testing PostgreSQL connectivity..."
docker-compose exec -T postgres pg_isready -U trade_engine_user > /dev/null 2>&1
print_result $? "PostgreSQL connection successful"
echo ""

# Test 2.2: Database selection
echo "[2.2] Verifying trade_engine_db database exists..."
docker-compose exec -T postgres psql -U trade_engine_user -d trade_engine_db -c "SELECT 1;" > /dev/null 2>&1
print_result $? "Database selection successful"
echo ""

# Test 2.3: ENUM types verification
echo "[2.3] Checking ENUM types existence..."
ENUM_TYPES=("order_side_enum" "order_type_enum" "order_status_enum" "time_in_force_enum")
for enum_type in "${ENUM_TYPES[@]}"; do
    docker-compose exec -T postgres psql -U trade_engine_user -d trade_engine_db \
        -tc "SELECT 1 FROM pg_type WHERE typname='$enum_type';" 2>/dev/null | grep -q "1" && {
        print_result 0 "ENUM type '$enum_type' exists"
    } || {
        print_result 1 "ENUM type '$enum_type' exists"
    }
done
echo ""

# Test 2.4: Core tables verification
echo "[2.4] Checking core tables existence..."
TABLES=("symbols" "orders" "trades")
for table in "${TABLES[@]}"; do
    docker-compose exec -T postgres psql -U trade_engine_user -d trade_engine_db \
        -tc "SELECT 1 FROM information_schema.tables WHERE table_name='$table';" 2>/dev/null | grep -q "1" && {
        print_result 0 "Table '$table' exists"
    } || {
        print_result 1 "Table '$table' exists"
    }
done
echo ""

# Test 2.5: Auxiliary tables verification
echo "[2.5] Checking auxiliary tables..."
AUX_TABLES=("stop_orders_watchlist" "order_book_snapshots" "partition_retention_config")
for table in "${AUX_TABLES[@]}"; do
    docker-compose exec -T postgres psql -U trade_engine_user -d trade_engine_db \
        -tc "SELECT 1 FROM information_schema.tables WHERE table_name='$table';" 2>/dev/null | grep -q "1" && {
        print_result 0 "Auxiliary table '$table' exists"
    } || {
        print_result 1 "Auxiliary table '$table' exists"
    }
done
echo ""

# Test 2.6: Orders table partitions
echo "[2.6] Checking orders table partitions..."
PARTITION_COUNT=$(docker-compose exec -T postgres psql -U trade_engine_user -d trade_engine_db \
    -tc "SELECT COUNT(*) FROM pg_tables WHERE tablename LIKE 'orders_%';" 2>/dev/null | tr -d ' ')
if [ "$PARTITION_COUNT" -ge 12 ]; then
    print_result 0 "Orders table has $PARTITION_COUNT partitions (expected >= 12)"
else
    print_result 1 "Orders table has only $PARTITION_COUNT partitions (expected >= 12)"
fi
echo ""

# Test 2.7: Trades table partitions
echo "[2.7] Checking trades table partitions..."
PARTITION_COUNT=$(docker-compose exec -T postgres psql -U trade_engine_user -d trade_engine_db \
    -tc "SELECT COUNT(*) FROM pg_tables WHERE tablename LIKE 'trades_%';" 2>/dev/null | tr -d ' ')
if [ "$PARTITION_COUNT" -ge 30 ]; then
    print_result 0 "Trades table has $PARTITION_COUNT partitions (expected >= 30)"
else
    print_result 1 "Trades table has only $PARTITION_COUNT partitions (expected >= 30)"
fi
echo ""

# Test 2.8: Indexes verification
echo "[2.8] Checking database indexes..."
INDEX_COUNT=$(docker-compose exec -T postgres psql -U trade_engine_user -d trade_engine_db \
    -tc "SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public';" 2>/dev/null | tr -d ' ')
if [ "$INDEX_COUNT" -ge 10 ]; then
    print_result 0 "Database has $INDEX_COUNT indexes (expected >= 10)"
else
    print_result 1 "Database has only $INDEX_COUNT indexes (expected >= 10)"
fi
echo ""

# Test 2.9: Default symbols data
echo "[2.9] Checking default trading symbols..."
SYMBOL_COUNT=$(docker-compose exec -T postgres psql -U trade_engine_user -d trade_engine_db \
    -tc "SELECT COUNT(*) FROM symbols;" 2>/dev/null | tr -d ' ')
if [ "$SYMBOL_COUNT" -gt 0 ]; then
    print_result 0 "Symbols table has $SYMBOL_COUNT records"
else
    print_result 1 "Symbols table is empty"
fi
echo ""

# ============================================================================
# SECTION 3: REDIS VERIFICATION
# ============================================================================

print_test_header "SECTION 3: Redis Service Verification"
echo ""

# Test 3.1: Redis connectivity
echo "[3.1] Testing Redis connectivity..."
docker-compose exec -T redis redis-cli PING | grep -q "PONG" && {
    print_result 0 "Redis connection successful (PONG received)"
} || {
    print_result 1 "Redis connection failed"
}
echo ""

# Test 3.2: Redis version
echo "[3.2] Checking Redis version..."
REDIS_VERSION=$(docker-compose exec -T redis redis-cli INFO | grep redis_version | cut -d: -f2 | tr -d '\r')
if [[ "$REDIS_VERSION" == 7.* ]]; then
    print_result 0 "Redis version is $REDIS_VERSION (v7.x as expected)"
else
    print_warning "Redis version is $REDIS_VERSION (expected v7.x)"
fi
echo ""

# Test 3.3: Redis persistence
echo "[3.3] Checking Redis persistence..."
docker-compose exec -T redis ls /data/dump.rdb > /dev/null 2>&1 && {
    print_result 0 "Redis persistence file exists"
} || {
    print_warning "Redis persistence file not found yet (will be created on first save)"
}
echo ""

# Test 3.4: Redis SET/GET
echo "[3.4] Testing Redis SET/GET operations..."
docker-compose exec -T redis redis-cli SET test_key "test_value" > /dev/null 2>&1
docker-compose exec -T redis redis-cli GET test_key | grep -q "test_value" && {
    print_result 0 "Redis SET/GET operations working"
} || {
    print_result 1 "Redis SET/GET operations failed"
}
docker-compose exec -T redis redis-cli DEL test_key > /dev/null 2>&1
echo ""

# ============================================================================
# SECTION 4: RABBITMQ VERIFICATION
# ============================================================================

print_test_header "SECTION 4: RabbitMQ Service Verification"
echo ""

# Test 4.1: RabbitMQ AMQP connectivity
echo "[4.1] Testing RabbitMQ AMQP connectivity..."
docker-compose exec -T rabbitmq rabbitmq-diagnostics -q ping > /dev/null 2>&1
print_result $? "RabbitMQ AMQP ping successful"
echo ""

# Test 4.2: RabbitMQ Management API
echo "[4.2] Testing RabbitMQ Management API..."
curl -s -u admin:changeme http://localhost:15673/api/overview > /dev/null 2>&1
print_result $? "RabbitMQ Management API accessible"
echo ""

# Test 4.3: RabbitMQ version
echo "[4.3] Checking RabbitMQ version..."
RABBITMQ_VERSION=$(docker-compose exec -T rabbitmq rabbitmqctl status 2>/dev/null | grep "RabbitMQ version:" | sed 's/.*RabbitMQ version: //' | sed 's/}.*//' || echo "unknown")
if [[ "$RABBITMQ_VERSION" == 3.* ]]; then
    print_result 0 "RabbitMQ version is $RABBITMQ_VERSION (v3.x as expected)"
else
    print_warning "RabbitMQ version is $RABBITMQ_VERSION (expected v3.x)"
fi
echo ""

# ============================================================================
# SECTION 5: PGBOUNCER VERIFICATION
# ============================================================================

print_test_header "SECTION 5: PgBouncer Connection Pooling Verification"
echo ""

# Test 5.1: PgBouncer connectivity
echo "[5.1] Testing PgBouncer connectivity..."
docker-compose exec -T pgbouncer pg_isready -h localhost > /dev/null 2>&1
print_result $? "PgBouncer is responding"
echo ""

# Test 5.2: PgBouncer database query
echo "[5.2] Testing PgBouncer database query..."
docker-compose exec -T pgbouncer psql -h localhost -U trade_engine_user -d trade_engine_db -c "SELECT 1;" > /dev/null 2>&1
print_result $? "PgBouncer can forward queries to PostgreSQL"
echo ""

# ============================================================================
# SECTION 6: HTTP SERVER VERIFICATION
# ============================================================================

print_test_header "SECTION 6: HTTP Server Verification"
echo ""

# Test 6.1: Server starts successfully
echo "[6.1] Starting HTTP server (background)..."
cd "$PROJECT_DIR"
timeout 10 go run cmd/server/main.go > /tmp/server.log 2>&1 &
SERVER_PID=$!
sleep 2  # Wait for server to start
echo "Server PID: $SERVER_PID"
echo ""

# Test 6.2: Health endpoint
echo "[6.2] Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:8080/health)
echo "Response: $HEALTH_RESPONSE"
if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
    print_result 0 "Health endpoint returns correct response"
else
    print_result 1 "Health endpoint returns unexpected response"
fi
echo ""

# Test 6.3: Readiness endpoint
echo "[6.3] Testing readiness endpoint..."
READY_RESPONSE=$(curl -s http://localhost:8080/ready)
echo "Response: $READY_RESPONSE"
if echo "$READY_RESPONSE" | grep -q '"status":"ready"'; then
    print_result 0 "Readiness endpoint indicates ready"
elif echo "$READY_RESPONSE" | grep -q '"status":"not_ready"'; then
    print_warning "Readiness endpoint indicates not_ready (services may still be initializing)"
else
    print_result 1 "Readiness endpoint returns unexpected response"
fi
echo ""

# Test 6.4: Request ID header
echo "[6.4] Testing request ID header..."
HEADERS=$(curl -s -i http://localhost:8080/health)
if echo "$HEADERS" | grep -q "X-Request-ID"; then
    print_result 0 "Request ID header present"
else
    print_result 1 "Request ID header missing"
fi
echo ""

# Test 6.5: CORS headers
echo "[6.5] Testing CORS headers..."
HEADERS=$(curl -s -i http://localhost:8080/health)
if echo "$HEADERS" | grep -q "Access-Control-Allow"; then
    print_result 0 "CORS headers present"
else
    print_result 1 "CORS headers missing"
fi
echo ""

# Test 6.6: Server graceful shutdown
echo "[6.6] Testing server graceful shutdown..."
kill -SIGTERM $SERVER_PID > /dev/null 2>&1
sleep 1
if ! kill -0 $SERVER_PID > /dev/null 2>&1; then
    print_result 0 "Server shut down gracefully"
else
    print_result 1 "Server did not shut down gracefully"
    kill -9 $SERVER_PID > /dev/null 2>&1
fi
echo ""

# ============================================================================
# SECTION 7: GO TESTS VERIFICATION
# ============================================================================

print_test_header "SECTION 7: Go Unit Tests Verification"
echo ""

# Test 7.1: Run all tests
echo "[7.1] Running all Go tests..."
cd "$PROJECT_DIR"
if go test -v ./... > /tmp/go_tests.log 2>&1; then
    print_result 0 "All Go tests pass"
else
    print_result 1 "Some Go tests failed (see /tmp/go_tests.log)"
fi
echo ""

# Test 7.2: Test coverage
echo "[7.2] Checking test coverage..."
go test -cover ./... > /tmp/coverage.log 2>&1
TOTAL_COVERAGE=$(grep "total coverage" /tmp/coverage.log | head -1 | sed 's/.*coverage: //' | sed 's/%.*//')
if [ -n "$TOTAL_COVERAGE" ]; then
    if (( $(echo "$TOTAL_COVERAGE >= 80" | awk '{print ($1 >= 80)}') )); then
        print_result 0 "Test coverage is $TOTAL_COVERAGE% (meets 80% target)"
    else
        print_warning "Test coverage is $TOTAL_COVERAGE% (below 80% target)"
    fi
else
    print_warning "Could not determine overall test coverage"
fi
echo ""

# ============================================================================
# SECTION 8: FILE STRUCTURE VERIFICATION
# ============================================================================

print_test_header "SECTION 8: Project File Structure Verification"
echo ""

# Test 8.1: Required directories
echo "[8.1] Checking required directories..."
REQUIRED_DIRS=("cmd/server" "internal/server" "pkg/config" "pkg/logger" "pkg/clients" "tests/unit" "tests/integration" "tests/e2e" "docs" "scripts" "config" "migrations")
for dir in "${REQUIRED_DIRS[@]}"; do
    [ -d "$PROJECT_DIR/$dir" ] && {
        print_result 0 "Directory exists: $dir"
    } || {
        print_result 1 "Directory missing: $dir"
    }
done
echo ""

# Test 8.2: Required files
echo "[8.2] Checking required configuration files..."
REQUIRED_FILES=(".env" ".gitignore" "docker-compose.yml" "Dockerfile" "go.mod" "go.sum" "Makefile" "README.md" "config/config.yaml")
for file in "${REQUIRED_FILES[@]}"; do
    [ -f "$PROJECT_DIR/$file" ] && {
        print_result 0 "File exists: $file"
    } || {
        print_result 1 "File missing: $file"
    }
done
echo ""

# Test 8.3: Source code files
echo "[8.3] Checking required source code files..."
REQUIRED_GO_FILES=("cmd/server/main.go" "pkg/config/config.go" "pkg/logger/logger.go" "pkg/clients/database.go" "pkg/clients/redis.go" "internal/server/router.go" "internal/server/handler.go" "internal/server/health.go" "internal/server/middleware.go")
for file in "${REQUIRED_GO_FILES[@]}"; do
    [ -f "$PROJECT_DIR/$file" ] && {
        print_result 0 "Source file exists: $file"
    } || {
        print_result 1 "Source file missing: $file"
    }
done
echo ""

# Test 8.4: Test files
echo "[8.4] Checking test files..."
GO_TEST_FILES=$(find "$PROJECT_DIR" -name "*_test.go" -type f | wc -l)
if [ "$GO_TEST_FILES" -gt 0 ]; then
    print_result 0 "Found $GO_TEST_FILES test files"
else
    print_result 1 "No test files found"
fi
echo ""

# ============================================================================
# SECTION 9: DOCUMENTATION VERIFICATION
# ============================================================================

print_test_header "SECTION 9: Documentation Verification"
echo ""

# Test 9.1: Documentation files
echo "[9.1] Checking documentation files..."
DOC_FILES=("docs/database-schema.md" "docs/test-plan-template.md" "docs/test-case-template.md")
for file in "${DOC_FILES[@]}"; do
    [ -f "$PROJECT_DIR/$file" ] && {
        print_result 0 "Documentation exists: $file"
    } || {
        print_result 1 "Documentation missing: $file"
    }
done
echo ""

# Test 9.2: Completion reports
echo "[9.2] Checking agent completion reports..."
REPORTS=("TASK-DB-001-COMPLETION-REPORT.md" "TASK-DEVOPS-001-COMPLETION-REPORT.md" "TASK-BACKEND-001-COMPLETION-REPORT.md")
for report in "${REPORTS[@]}"; do
    [ -f "$PROJECT_DIR/$report" ] && {
        print_result 0 "Completion report exists: $report"
    } || {
        print_warning "Completion report missing: $report"
    }
done
echo ""

# ============================================================================
# SUMMARY
# ============================================================================

print_test_header "SUMMARY AND RESULTS"
echo ""

TOTAL_TESTS=$PASSED
TOTAL_FAILURES=$FAILED

echo "Test Execution Summary:"
echo "├─ Total Tests Run: $TESTS_RUN"
echo "├─ Passed: ${GREEN}$PASSED${NC}"
if [ $FAILED -gt 0 ]; then
    echo "├─ Failed: ${RED}$FAILED${NC}"
else
    echo "├─ Failed: $FAILED"
fi
echo "└─ Warnings: $WARNINGS"
echo ""

if [ $FAILED -eq 0 ]; then
    SUCCESS_RATE=100
else
    SUCCESS_RATE=$((PASSED * 100 / TESTS_RUN))
fi
echo "Success Rate: ${SUCCESS_RATE}%"
echo ""

echo "End Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Final result
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════════════════╗${NC}"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}║                  ✓ ALL DAY 1 VERIFICATION TESTS PASSED                        ║${NC}"
    echo -e "${BLUE}║                                                                                ║${NC}"
    echo -e "${GREEN}║ Infrastructure is healthy and ready for development                           ║${NC}"
else
    echo -e "${RED}║                  ✗ SOME DAY 1 VERIFICATION TESTS FAILED                        ║${NC}"
    echo -e "${BLUE}║                                                                                ║${NC}"
    echo -e "${RED}║ Please address the failures listed above before proceeding                    ║${NC}"
fi
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Generate report file
REPORT_FILE="/tmp/day1-verification-report.txt"
{
    echo "Trade Engine - Day 1 Verification Report"
    echo "Generated: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    echo "Summary:"
    echo "Total Tests: $TESTS_RUN"
    echo "Passed: $PASSED"
    echo "Failed: $FAILED"
    echo "Warnings: $WARNINGS"
    echo "Success Rate: ${SUCCESS_RATE}%"
    echo ""
    echo "Status: $([ $FAILED -eq 0 ] && echo 'PASSED' || echo 'FAILED')"
} > "$REPORT_FILE"

echo "Detailed report saved to: $REPORT_FILE"
echo ""

# Exit with appropriate code
exit $FAILED
