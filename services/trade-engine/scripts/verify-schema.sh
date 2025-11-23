#!/bin/bash

# ============================================================================
# Trade Engine Database Schema Verification Script
# ============================================================================
# Purpose: Verify that all database objects are created correctly
# Usage: ./verify-schema.sh
# ============================================================================

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database connection details
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5433}"
DB_NAME="${DB_NAME:-trade_engine_db}"
DB_USER="${DB_USER:-trade_engine_user}"
PGPASSWORD="${DB_PASSWORD:-trade_engine_pass}"

export PGPASSWORD

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to print section header
print_section() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Function to run test
run_test() {
    local test_name="$1"
    local test_query="$2"
    local expected_result="$3"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    local result=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "$test_query" 2>&1 || echo "ERROR")
    result=$(echo "$result" | xargs) # trim whitespace

    if [[ "$result" == "$expected_result" ]] || [[ "$result" =~ $expected_result ]]; then
        echo -e "${GREEN}✓${NC} $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}✗${NC} $test_name"
        echo -e "   Expected: $expected_result"
        echo -e "   Got: $result"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Main verification
echo -e "${YELLOW}"
echo "=============================================="
echo "  Trade Engine Schema Verification"
echo "=============================================="
echo -e "${NC}"
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo ""

# Test database connection
print_section "1. Database Connection"
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Database connection successful"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} Database connection failed"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo ""
    echo -e "${RED}Cannot connect to database. Exiting.${NC}"
    exit 1
fi

# Test ENUM types
print_section "2. ENUM Types"
run_test "order_side_enum exists" "SELECT COUNT(*) FROM pg_type WHERE typname = 'order_side_enum';" "1"
run_test "order_type_enum exists" "SELECT COUNT(*) FROM pg_type WHERE typname = 'order_type_enum';" "1"
run_test "order_status_enum exists" "SELECT COUNT(*) FROM pg_type WHERE typname = 'order_status_enum';" "1"
run_test "time_in_force_enum exists" "SELECT COUNT(*) FROM pg_type WHERE typname = 'time_in_force_enum';" "1"
run_test "symbol_status_enum exists" "SELECT COUNT(*) FROM pg_type WHERE typname = 'symbol_status_enum';" "1"

# Test core tables
print_section "3. Core Tables"
run_test "symbols table exists" "SELECT COUNT(*) FROM pg_tables WHERE tablename = 'symbols';" "1"
run_test "orders table exists" "SELECT COUNT(*) FROM pg_tables WHERE tablename = 'orders';" "1"
run_test "trades table exists" "SELECT COUNT(*) FROM pg_tables WHERE tablename = 'trades';" "1"

# Test auxiliary tables
print_section "4. Auxiliary Tables"
run_test "stop_orders_watchlist table exists" "SELECT COUNT(*) FROM pg_tables WHERE tablename = 'stop_orders_watchlist';" "1"
run_test "order_book_snapshots table exists" "SELECT COUNT(*) FROM pg_tables WHERE tablename = 'order_book_snapshots';" "1"
run_test "partition_retention_config table exists" "SELECT COUNT(*) FROM pg_tables WHERE tablename = 'partition_retention_config';" "1"

# Test order partitions
print_section "5. Order Partitions"
ORDER_PARTITION_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM pg_tables WHERE tablename LIKE 'orders_%';" | xargs)
echo -e "${GREEN}✓${NC} Orders partitions created: $ORDER_PARTITION_COUNT"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
PASSED_TESTS=$((PASSED_TESTS + 1))

if [ "$ORDER_PARTITION_COUNT" -ge 12 ]; then
    echo -e "${GREEN}✓${NC} Expected partition count (≥12) met"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} Expected at least 12 partitions, found $ORDER_PARTITION_COUNT"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Test trade partitions
print_section "6. Trade Partitions"
TRADE_PARTITION_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM pg_tables WHERE tablename LIKE 'trades_%';" | xargs)
echo -e "${GREEN}✓${NC} Trades partitions created: $TRADE_PARTITION_COUNT"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
PASSED_TESTS=$((PASSED_TESTS + 1))

if [ "$TRADE_PARTITION_COUNT" -ge 30 ]; then
    echo -e "${GREEN}✓${NC} Expected partition count (≥30) met"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} Expected at least 30 partitions, found $TRADE_PARTITION_COUNT"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Test indexes
print_section "7. Indexes"
run_test "Orders indexes created" "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'orders' AND schemaname = 'public';" "8"
run_test "Trades indexes created" "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'trades' AND schemaname = 'public';" "6"
run_test "Symbols indexes created" "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'symbols' AND schemaname = 'public';" "3"

# Test views
print_section "8. Views"
run_test "v_active_orders view exists" "SELECT COUNT(*) FROM pg_views WHERE viewname = 'v_active_orders';" "1"
run_test "v_user_order_summary view exists" "SELECT COUNT(*) FROM pg_views WHERE viewname = 'v_user_order_summary';" "1"
run_test "v_symbol_stats_24h view exists" "SELECT COUNT(*) FROM pg_views WHERE viewname = 'v_symbol_stats_24h';" "1"
run_test "v_monitoring_active_orders view exists" "SELECT COUNT(*) FROM pg_views WHERE viewname = 'v_monitoring_active_orders';" "1"
run_test "v_monitoring_trade_volume_24h view exists" "SELECT COUNT(*) FROM pg_views WHERE viewname = 'v_monitoring_trade_volume_24h';" "1"
run_test "v_monitoring_order_status view exists" "SELECT COUNT(*) FROM pg_views WHERE viewname = 'v_monitoring_order_status';" "1"

# Test materialized views
print_section "9. Materialized Views"
run_test "mv_order_book_snapshot matview exists" "SELECT COUNT(*) FROM pg_matviews WHERE matviewname = 'mv_order_book_snapshot';" "1"

# Test functions
print_section "10. Functions"
run_test "create_orders_partition function exists" "SELECT COUNT(*) FROM pg_proc WHERE proname = 'create_orders_partition';" "1"
run_test "create_trades_partition function exists" "SELECT COUNT(*) FROM pg_proc WHERE proname = 'create_trades_partition';" "1"
run_test "maintain_partitions function exists" "SELECT COUNT(*) FROM pg_proc WHERE proname = 'maintain_partitions';" "1"
run_test "update_updated_at_column function exists" "SELECT COUNT(*) FROM pg_proc WHERE proname = 'update_updated_at_column';" "1"
run_test "get_order_book_depth function exists" "SELECT COUNT(*) FROM pg_proc WHERE proname = 'get_order_book_depth';" "1"
run_test "get_user_trade_history function exists" "SELECT COUNT(*) FROM pg_proc WHERE proname = 'get_user_trade_history';" "1"
run_test "get_best_bid_ask function exists" "SELECT COUNT(*) FROM pg_proc WHERE proname = 'get_best_bid_ask';" "1"
run_test "calculate_vwap function exists" "SELECT COUNT(*) FROM pg_proc WHERE proname = 'calculate_vwap';" "1"
run_test "check_db_connections function exists" "SELECT COUNT(*) FROM pg_proc WHERE proname = 'check_db_connections';" "1"
run_test "check_table_sizes function exists" "SELECT COUNT(*) FROM pg_proc WHERE proname = 'check_table_sizes';" "1"
run_test "refresh_order_book_snapshot function exists" "SELECT COUNT(*) FROM pg_proc WHERE proname = 'refresh_order_book_snapshot';" "1"

# Test triggers
print_section "11. Triggers"
run_test "trg_symbols_updated_at trigger exists" "SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'trg_symbols_updated_at';" "1"
run_test "trg_orders_updated_at trigger exists" "SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'trg_orders_updated_at';" "1"
run_test "trg_set_filled_at trigger exists" "SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'trg_set_filled_at';" "1"
run_test "trg_set_cancelled_at trigger exists" "SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'trg_set_cancelled_at';" "1"
run_test "trg_validate_order_status_transition trigger exists" "SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'trg_validate_order_status_transition';" "1"
run_test "trg_add_stop_order_to_watchlist trigger exists" "SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'trg_add_stop_order_to_watchlist';" "1"
run_test "trg_remove_stop_order_from_watchlist trigger exists" "SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'trg_remove_stop_order_from_watchlist';" "1"

# Test default data
print_section "12. Default Data"
SYMBOL_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM symbols;" | xargs)
echo -e "${GREEN}✓${NC} Trading symbols loaded: $SYMBOL_COUNT"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
PASSED_TESTS=$((PASSED_TESTS + 1))

if [ "$SYMBOL_COUNT" -ge 10 ]; then
    echo -e "${GREEN}✓${NC} Expected symbol count (≥10) met"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗${NC} Expected at least 10 symbols, found $SYMBOL_COUNT"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Test retention config
print_section "13. Retention Configuration"
run_test "Retention config for orders" "SELECT COUNT(*) FROM partition_retention_config WHERE table_name = 'orders';" "1"
run_test "Retention config for trades" "SELECT COUNT(*) FROM partition_retention_config WHERE table_name = 'trades';" "1"

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Verification Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Total Tests: ${TOTAL_TESTS}"
echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"

if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"
    echo ""
    echo -e "${RED}Schema verification FAILED${NC}"
    exit 1
else
    echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"
    echo ""
    echo -e "${GREEN}✓ All tests passed! Schema verification SUCCESSFUL${NC}"
    echo ""
    echo "Schema is ready for production use."
    exit 0
fi
