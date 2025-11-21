#!/bin/bash

##############################################################################
# Automated QA Pre-Check Script - Sprint 3 Story 2.4
# Purpose: Quick automated verification before manual QA testing
# Usage: ./automated_qa_checks.sh
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3002}"
PASSED=0
FAILED=0

echo "========================================="
echo "Sprint 3 - Automated QA Pre-Check"
echo "========================================="
echo "Base URL: $BASE_URL"
echo ""

# Function to print test result
print_result() {
    local test_name=$1
    local status=$2
    local message=$3

    if [ "$status" == "PASS" ]; then
        echo -e "${GREEN}✓${NC} $test_name: PASS"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $test_name: FAIL - $message"
        ((FAILED++))
    fi
}

##############################################################################
# TEST 1: Service Health Check
##############################################################################
echo "TEST 1: Checking service health..."
if curl -s -f "$BASE_URL/health" > /dev/null 2>&1; then
    print_result "Service Health" "PASS" ""
else
    print_result "Service Health" "FAIL" "Service not responding"
fi

##############################################################################
# TEST 2: TypeScript Build
##############################################################################
echo ""
echo "TEST 2: Checking TypeScript compilation..."
cd /Users/musti/Documents/Projects/MyCrypto_Platform/services/wallet-service
if npx tsc --noEmit 2>&1 | grep -q "error"; then
    print_result "TypeScript Compilation" "FAIL" "Type errors found"
else
    print_result "TypeScript Compilation" "PASS" ""
fi

##############################################################################
# TEST 3: Unit Tests
##############################################################################
echo ""
echo "TEST 3: Running unit tests..."
if npm test 2>&1 | grep -q "Tests:.*114 passed"; then
    print_result "Unit Tests" "PASS" "114/114 tests passed"
else
    print_result "Unit Tests" "FAIL" "Some tests failed"
fi

##############################################################################
# TEST 4: Database Connection
##############################################################################
echo ""
echo "TEST 4: Checking database connectivity..."
# This would need DATABASE_URL from .env
if [ -n "$DATABASE_URL" ]; then
    if psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
        print_result "Database Connection" "PASS" ""
    else
        print_result "Database Connection" "FAIL" "Cannot connect to database"
    fi
else
    echo -e "${YELLOW}⚠${NC} Database Connection: SKIPPED (DATABASE_URL not set)"
fi

##############################################################################
# TEST 5: Redis Connection
##############################################################################
echo ""
echo "TEST 5: Checking Redis connectivity..."
if [ -n "$REDIS_URL" ]; then
    if redis-cli -u "$REDIS_URL" ping > /dev/null 2>&1; then
        print_result "Redis Connection" "PASS" ""
    else
        print_result "Redis Connection" "FAIL" "Cannot connect to Redis"
    fi
else
    echo -e "${YELLOW}⚠${NC} Redis Connection: SKIPPED (REDIS_URL not set)"
fi

##############################################################################
# TEST 6: Environment Variables
##############################################################################
echo ""
echo "TEST 6: Checking required environment variables..."
REQUIRED_VARS=(
    "HD_WALLET_MNEMONIC"
    "BLOCKCYPHER_WEBHOOK_TOKEN"
    "AUTH_SERVICE_URL"
    "DATABASE_URL"
    "REDIS_URL"
)

MISSING_VARS=0
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "  ${RED}✗${NC} Missing: $var"
        ((MISSING_VARS++))
    else
        echo -e "  ${GREEN}✓${NC} Found: $var"
    fi
done

if [ $MISSING_VARS -eq 0 ]; then
    print_result "Environment Variables" "PASS" ""
else
    print_result "Environment Variables" "FAIL" "$MISSING_VARS variables missing"
fi

##############################################################################
# TEST 7: Database Tables
##############################################################################
echo ""
echo "TEST 7: Checking database tables exist..."
if [ -n "$DATABASE_URL" ]; then
    REQUIRED_TABLES=(
        "user_wallets"
        "ledger_entries"
        "blockchain_addresses"
        "blockchain_transactions"
    )

    MISSING_TABLES=0
    for table in "${REQUIRED_TABLES[@]}"; do
        if psql "$DATABASE_URL" -c "SELECT 1 FROM $table LIMIT 1" > /dev/null 2>&1; then
            echo -e "  ${GREEN}✓${NC} Table exists: $table"
        else
            echo -e "  ${RED}✗${NC} Table missing: $table"
            ((MISSING_TABLES++))
        fi
    done

    if [ $MISSING_TABLES -eq 0 ]; then
        print_result "Database Tables" "PASS" ""
    else
        print_result "Database Tables" "FAIL" "$MISSING_TABLES tables missing"
    fi
else
    echo -e "${YELLOW}⚠${NC} Database Tables: SKIPPED (DATABASE_URL not set)"
fi

##############################################################################
# TEST 8: API Endpoints
##############################################################################
echo ""
echo "TEST 8: Checking critical API endpoints..."

# Health endpoint
if curl -s -f "$BASE_URL/health" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} /health endpoint responding"
else
    echo -e "  ${RED}✗${NC} /health endpoint not responding"
fi

# Wallet balance endpoint (requires auth, expect 401)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/wallet/balance")
if [ "$STATUS" == "401" ]; then
    echo -e "  ${GREEN}✓${NC} /wallet/balance requires authentication"
else
    echo -e "  ${RED}✗${NC} /wallet/balance unexpected status: $STATUS"
fi

# Address generation endpoint (requires auth, expect 401)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/wallet/deposit/crypto/address/generate")
if [ "$STATUS" == "401" ]; then
    echo -e "  ${GREEN}✓${NC} /wallet/deposit/crypto/address/generate requires authentication"
else
    echo -e "  ${RED}✗${NC} /wallet/deposit/crypto/address/generate unexpected status: $STATUS"
fi

# Webhook endpoint (without token, expect 401)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/wallet/deposit/crypto/webhook")
if [ "$STATUS" == "401" ]; then
    echo -e "  ${GREEN}✓${NC} /wallet/deposit/crypto/webhook requires token"
    print_result "API Endpoints" "PASS" ""
else
    echo -e "  ${RED}✗${NC} /wallet/deposit/crypto/webhook unexpected status: $STATUS"
    print_result "API Endpoints" "FAIL" "Webhook endpoint not secured"
fi

##############################################################################
# TEST 9: Log Files
##############################################################################
echo ""
echo "TEST 9: Checking for recent errors in logs..."
if docker ps | grep -q wallet-service; then
    ERROR_COUNT=$(docker-compose logs --tail=100 wallet-service 2>/dev/null | grep -c "ERROR" || echo "0")
    if [ "$ERROR_COUNT" -lt 5 ]; then
        print_result "Log Files" "PASS" "$ERROR_COUNT errors in last 100 lines"
    else
        print_result "Log Files" "FAIL" "$ERROR_COUNT errors in last 100 lines"
    fi
else
    echo -e "${YELLOW}⚠${NC} Log Files: SKIPPED (wallet-service container not running)"
fi

##############################################################################
# TEST 10: Test Coverage
##############################################################################
echo ""
echo "TEST 10: Verifying test coverage..."
if npm run test:cov 2>&1 | grep -q "Statements.*4[5-9]%\|Statements.*[5-9][0-9]%"; then
    print_result "Test Coverage" "PASS" "Coverage >= 45%"
else
    print_result "Test Coverage" "FAIL" "Coverage < 45%"
fi

##############################################################################
# SUMMARY
##############################################################################
echo ""
echo "========================================="
echo "Summary"
echo "========================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
TOTAL=$((PASSED + FAILED))
PASS_RATE=$((PASSED * 100 / TOTAL))
echo "Pass Rate: $PASS_RATE%"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All automated checks passed!${NC}"
    echo "Ready for manual QA testing."
    exit 0
else
    echo -e "${RED}✗ Some checks failed.${NC}"
    echo "Please fix issues before manual QA testing."
    exit 1
fi
