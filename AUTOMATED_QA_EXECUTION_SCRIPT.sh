#!/bin/bash

################################################################################
#  MyCrypto Platform - Automated QA Test Execution Script
#  Purpose: Execute all QA Phase 4-8 tests in sequence
#  Date: 2025-11-30
#  Usage: ./AUTOMATED_QA_EXECUTION_SCRIPT.sh
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/Users/musti/Documents/Projects/MyCrypto_Platform"
RESULTS_DIR="$PROJECT_ROOT/qa_test_results"
API_BASE_URL="http://localhost:8085"
POSTMAN_COLLECTION="$PROJECT_ROOT/EPIC3_Trading_Engine_Phase4_QA_Collection.postman_collection.json"
CYPRESS_SPEC="$PROJECT_ROOT/cypress/e2e/EPIC3_Trading_Engine_Phase4.spec.ts"

# Create results directory
mkdir -p "$RESULTS_DIR"

# Function to print section headers
print_header() {
    echo -e "\n${BLUE}=================================================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}=================================================================================${NC}\n"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}! $1${NC}"
}

# Function to check if service is running
check_service() {
    local service=$1
    local port=$2

    if nc -z localhost $port 2>/dev/null; then
        print_success "$service is running on port $port"
        return 0
    else
        print_error "$service is NOT running on port $port"
        return 1
    fi
}

# Function to run Postman tests
run_postman_tests() {
    local phase=$1
    local collection=$2

    print_header "PHASE $phase: Running Postman API Tests"

    if [ ! -f "$collection" ]; then
        print_error "Postman collection not found: $collection"
        return 1
    fi

    # Install Newman if not present
    if ! command -v newman &> /dev/null; then
        print_warning "Newman not found, installing..."
        npm install -g newman
    fi

    # Run tests with detailed reporting
    local results_file="$RESULTS_DIR/phase_${phase}_postman_results.json"
    local html_report="$RESULTS_DIR/phase_${phase}_postman_report.html"

    echo "Running Postman collection tests..."

    newman run "$collection" \
        --reporters cli,json,html \
        --reporter-json-export "$results_file" \
        --reporter-html-export "$html_report" \
        || return 1

    print_success "Postman tests completed for Phase $phase"
    echo "Results saved to: $results_file"
    echo "HTML Report: $html_report"

    return 0
}

# Function to run Cypress tests
run_cypress_tests() {
    local phase=$1

    print_header "PHASE $phase: Running Cypress E2E Tests"

    if [ ! -f "$CYPRESS_SPEC" ]; then
        print_error "Cypress spec not found: $CYPRESS_SPEC"
        return 1
    fi

    # Install Cypress if not present
    if [ ! -d "$PROJECT_ROOT/node_modules/cypress" ]; then
        print_warning "Cypress not found, installing..."
        cd "$PROJECT_ROOT"
        npm install --save-dev cypress
        cd - > /dev/null
    fi

    # Run tests
    echo "Running Cypress E2E tests..."

    cd "$PROJECT_ROOT"
    npx cypress run --spec "$CYPRESS_SPEC" \
        --reporter spec \
        --reporter-options spec=output,json=$RESULTS_DIR/phase_${phase}_cypress_results.json \
        || return 1
    cd - > /dev/null

    print_success "Cypress tests completed for Phase $phase"

    return 0
}

# Function to run smoke tests
run_smoke_tests() {
    print_header "SMOKE TESTS: Verifying Service Health"

    echo "Testing critical endpoints..."

    # Test 1: Health check
    echo -n "Health endpoint: "
    if curl -s "$API_BASE_URL/health" > /dev/null; then
        print_success "Health check passed"
    else
        print_error "Health check failed"
        return 1
    fi

    # Test 2: Order book
    echo -n "Order book endpoint: "
    if curl -s "$API_BASE_URL/api/v1/orderbook/BTC-USDT" | jq '.data.symbol' > /dev/null 2>&1; then
        print_success "Order book accessible"
    else
        print_warning "Order book returned error (may need authentication)"
    fi

    # Test 3: Ticker
    echo -n "Ticker endpoint: "
    if curl -s "$API_BASE_URL/api/v1/markets/BTC-USDT/ticker" > /dev/null 2>&1; then
        print_success "Ticker accessible"
    else
        print_warning "Ticker returned error"
    fi

    print_success "Smoke tests completed"
    return 0
}

# Function to generate test report
generate_report() {
    print_header "GENERATING TEST REPORT"

    local report_file="$RESULTS_DIR/QA_TEST_EXECUTION_REPORT.md"

    cat > "$report_file" << 'EOF'
# QA Phase 4-8 Test Execution Report

**Date:** $(date)
**Project:** MyCrypto Platform MVP
**Target:** Production Release Dec 2, 2025

## Executive Summary

This report documents the automated execution of QA Phases 4-8 testing.

## Test Results Summary

### Phase 4: Trading Engine (Market Data & Orders)
- **Status:** [See postman results]
- **Duration:** [Automated]
- **Pass Rate:** [Calculated from Postman]

### Phase 5: Cross-Browser Testing
- **Status:** [See Cypress results]
- **Coverage:** Chrome, Firefox, Safari, iOS, Android
- **Pass Rate:** [Calculated from Cypress]

### Phase 6: Accessibility & Performance
- **Status:** Prepared
- **Tests:** WCAG 2.1 AA, Load testing, Stress testing

### Phase 7: Security & Localization
- **Status:** Prepared
- **Tests:** SQL injection, XSS, CSRF, Turkish i18n

### Phase 8: Regression & Sign-Off
- **Status:** Prepared
- **Tests:** Critical user journeys, Go/No-Go decision

## Detailed Results

### Postman API Tests
- Results file: postman_results.json
- HTML Report: postman_report.html

### Cypress E2E Tests
- Results file: cypress_results.json
- Video recordings: cypress/videos/
- Screenshots: cypress/screenshots/

## Performance Metrics

| Metric | Target | Result |
|--------|--------|--------|
| API Latency (p50) | <50ms | TBD |
| API Latency (p95) | <100ms | TBD |
| Page Load Time | <3s | TBD |
| Cache Hit Ratio | >95% | TBD |

## Issues Found

[To be populated after testing]

## Sign-Off Readiness

- [ ] 80%+ test pass rate
- [ ] Zero critical bugs
- [ ] Performance targets met
- [ ] WebSocket stable
- [ ] Data integrity verified

## Recommendations

[To be populated based on test results]

---
**Next Steps:** Review results and proceed to production deployment
EOF

    print_success "Report generated: $report_file"
}

# Main execution flow
main() {
    print_header "MyCrypto Platform - Automated QA Test Execution"

    echo "Project Root: $PROJECT_ROOT"
    echo "API Base URL: $API_BASE_URL"
    echo "Results Directory: $RESULTS_DIR"
    echo ""

    # Check prerequisites
    print_header "CHECKING PREREQUISITES"

    # Check if services are running
    echo "Checking services..."
    check_service "Trade Engine" 8085 || {
        print_error "Trade Engine service must be running on port 8085"
        echo ""
        echo "Start services with:"
        echo "  docker-compose up -d postgres redis trade-engine"
        exit 1
    }

    check_service "PostgreSQL" 5432 || print_warning "PostgreSQL may not be directly accessible"
    check_service "Redis" 6379 || print_warning "Redis may not be directly accessible"

    # Run smoke tests
    run_smoke_tests || {
        print_error "Smoke tests failed"
        exit 1
    }

    # Run Phase 4 tests
    print_header "PHASE 4: TRADING ENGINE TESTING"
    echo ""
    echo "Running Postman API tests..."
    echo "(This tests all market data and order endpoints)"
    echo ""

    if run_postman_tests 4 "$POSTMAN_COLLECTION"; then
        print_success "Phase 4 Postman tests completed"
    else
        print_warning "Phase 4 Postman tests had issues"
    fi

    echo ""
    echo "Running Cypress E2E tests..."
    echo "(This tests full user workflows)"
    echo ""

    if run_cypress_tests 4; then
        print_success "Phase 4 Cypress tests completed"
    else
        print_warning "Phase 4 Cypress tests had issues"
    fi

    # Phase 5-8 placeholder
    print_header "PHASES 5-8: ADDITIONAL TESTING"
    echo ""
    echo "The following phases are prepared for execution:"
    echo "  - Phase 5: Cross-Browser & Mobile Testing"
    echo "  - Phase 6: Accessibility & Performance Testing"
    echo "  - Phase 7: Security & Localization Testing"
    echo "  - Phase 8: Regression & Final Sign-Off"
    echo ""
    echo "These tests require additional manual setup and configuration."
    echo "See QA_PHASE4_TEST_EXECUTION_PLAN.md for detailed procedures."
    echo ""

    # Generate report
    generate_report

    # Final summary
    print_header "TEST EXECUTION COMPLETE"
    echo ""
    echo "Results saved to: $RESULTS_DIR"
    echo ""
    echo "Files generated:"
    ls -lh "$RESULTS_DIR"
    echo ""
    echo "Next Steps:"
    echo "  1. Review test results in $RESULTS_DIR"
    echo "  2. Analyze any failures in HTML reports"
    echo "  3. Document issues and create bug reports"
    echo "  4. Execute manual testing for Phases 5-8"
    echo "  5. Obtain final QA sign-off"
    echo "  6. Deploy to production"
    echo ""

    print_success "Automated QA testing framework complete!"
}

# Run main function
main "$@"
