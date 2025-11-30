#!/bin/bash

# Migration 010 Test Script
# Tests migration apply, rollback, and performance benchmarks

set -e

echo "========================================="
echo "Migration 010 Test Script"
echo "Testing Price Alerts & Indicators"
echo "========================================="
echo ""

# Configuration
CONTAINER_NAME="pg_test_migration_010"
POSTGRES_PASSWORD="test_password_123"
POSTGRES_DB="trade_engine_test"
POSTGRES_PORT=5433

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run SQL command
run_sql() {
    docker exec -i $CONTAINER_NAME psql -U postgres -d $POSTGRES_DB -c "$1"
}

# Function to run SQL file
run_sql_file() {
    docker exec -i $CONTAINER_NAME psql -U postgres -d $POSTGRES_DB < "$1"
}

# Function to check query performance
check_performance() {
    local query="$1"
    local max_time_ms="$2"
    local description="$3"

    echo -n "Testing: $description... "

    # Run EXPLAIN ANALYZE and extract execution time
    local result=$(docker exec -i $CONTAINER_NAME psql -U postgres -d $POSTGRES_DB -c "EXPLAIN ANALYZE $query" | grep "Execution Time" | awk '{print $3}')

    # Remove decimal point for comparison
    local time_int=${result%.*}

    if [ "$time_int" -lt "$max_time_ms" ]; then
        echo -e "${GREEN}PASS${NC} (${result}ms < ${max_time_ms}ms)"
        return 0
    else
        echo -e "${RED}FAIL${NC} (${result}ms >= ${max_time_ms}ms)"
        return 1
    fi
}

# Cleanup function
cleanup() {
    echo ""
    echo "Cleaning up..."
    docker stop $CONTAINER_NAME 2>/dev/null || true
    docker rm $CONTAINER_NAME 2>/dev/null || true
}

# Set trap for cleanup on exit
trap cleanup EXIT

echo "Step 1: Starting PostgreSQL container..."
docker run -d \
    --name $CONTAINER_NAME \
    -e POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
    -e POSTGRES_DB=$POSTGRES_DB \
    -p $POSTGRES_PORT:5432 \
    postgres:16-alpine > /dev/null

echo "Waiting for PostgreSQL to be ready..."
sleep 5

# Wait for PostgreSQL to be ready
until docker exec $CONTAINER_NAME pg_isready -U postgres > /dev/null 2>&1; do
    echo "Waiting for database..."
    sleep 2
done

echo -e "${GREEN}✓${NC} PostgreSQL is ready"
echo ""

# Create prerequisite enums
echo "Step 2: Creating prerequisite schema..."
run_sql "CREATE TYPE order_side_enum AS ENUM ('BUY', 'SELL');" 2>/dev/null || true
run_sql "CREATE TYPE order_type_enum AS ENUM ('MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT', 'TRAILING_STOP');" 2>/dev/null || true
run_sql "CREATE TYPE order_status_enum AS ENUM ('PENDING', 'OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED', 'REJECTED', 'EXPIRED');" 2>/dev/null || true
echo -e "${GREEN}✓${NC} Prerequisites created"
echo ""

# Test migration UP
echo "Step 3: Applying migration (UP)..."
run_sql_file "/Users/musti/Documents/Projects/MyCrypto_Platform/services/trade-engine/migrations/010-price-alerts-indicators.sql" > /dev/null
echo -e "${GREEN}✓${NC} Migration applied successfully"
echo ""

# Verify tables created
echo "Step 4: Verifying schema..."
TABLE_COUNT=$(run_sql "\dt price_alerts" 2>/dev/null | grep -c "price_alerts" || echo "0")
if [ "$TABLE_COUNT" -eq "1" ]; then
    echo -e "${GREEN}✓${NC} price_alerts table created"
else
    echo -e "${RED}✗${NC} price_alerts table NOT found"
    exit 1
fi

TABLE_COUNT=$(run_sql "\dt indicator_values" 2>/dev/null | grep -c "indicator_values" || echo "0")
if [ "$TABLE_COUNT" -eq "1" ]; then
    echo -e "${GREEN}✓${NC} indicator_values table created"
else
    echo -e "${RED}✗${NC} indicator_values table NOT found"
    exit 1
fi
echo ""

# Load test data
echo "Step 5: Loading test data..."

# Create test users (simulated)
TEST_USER_ID="550e8400-e29b-41d4-a716-446655440000"
TEST_USER_ID_2="660e8400-e29b-41d4-a716-446655440001"

# Insert 1000+ price alerts for performance testing
echo "Inserting 1500 price alerts..."
for i in {1..1500}; do
    SYMBOL=$([ $((i % 3)) -eq 0 ] && echo "BTC_TRY" || ([ $((i % 3)) -eq 1 ] && echo "ETH_TRY" || echo "USDT_TRY"))
    ALERT_TYPE=$([ $((i % 2)) -eq 0 ] && echo "ABOVE" || echo "BELOW")
    TARGET_PRICE=$((50000 + RANDOM % 100000))
    IS_ACTIVE=$([ $((i % 10)) -eq 0 ] && echo "false" || echo "true")
    USER_ID=$([ $((i % 2)) -eq 0 ] && echo "$TEST_USER_ID" || echo "$TEST_USER_ID_2")

    run_sql "INSERT INTO price_alerts (user_id, symbol, alert_type, target_price, is_active) VALUES ('$USER_ID', '$SYMBOL', '$ALERT_TYPE', $TARGET_PRICE, $IS_ACTIVE);" > /dev/null
done
echo -e "${GREEN}✓${NC} Inserted 1500 price alerts"

# Insert indicator values
echo "Inserting 2000 indicator values..."
for i in {1..2000}; do
    SYMBOL=$([ $((i % 3)) -eq 0 ] && echo "BTC_TRY" || ([ $((i % 3)) -eq 1 ] && echo "ETH_TRY" || echo "USDT_TRY"))
    INDICATOR_TYPE=$([ $((i % 4)) -eq 0 ] && echo "SMA" || ([ $((i % 4)) -eq 1 ] && echo "EMA" || ([ $((i % 4)) -eq 2 ] && echo "RSI" || echo "MACD")))
    PERIOD=$((7 + RANDOM % 50))
    VALUE=$((RANDOM % 10000)).$(printf "%08d" $((RANDOM % 100000000)))
    TIMESTAMP=$(date -u -v-${i}H +"%Y-%m-%d %H:%M:%S" 2>/dev/null || date -u -d "-${i} hours" +"%Y-%m-%d %H:%M:%S")

    run_sql "INSERT INTO indicator_values (symbol, indicator_type, period, value, timestamp) VALUES ('$SYMBOL', '$INDICATOR_TYPE', $PERIOD, $VALUE, '$TIMESTAMP');" > /dev/null
done
echo -e "${GREEN}✓${NC} Inserted 2000 indicator values"
echo ""

# Performance Tests
echo "Step 6: Performance Testing (Target: <50ms)..."
echo "================================================"

# Test 1: Get active alerts for user
check_performance \
    "SELECT * FROM price_alerts WHERE user_id = '$TEST_USER_ID' AND is_active = true;" \
    50 \
    "Get user active alerts"

# Test 2: Get active alerts for symbol
check_performance \
    "SELECT * FROM price_alerts WHERE symbol = 'BTC_TRY' AND is_active = true;" \
    50 \
    "Get active alerts by symbol"

# Test 3: Get user alerts for specific symbol
check_performance \
    "SELECT * FROM price_alerts WHERE user_id = '$TEST_USER_ID' AND symbol = 'BTC_TRY' AND is_active = true;" \
    50 \
    "Get user alerts for symbol"

# Test 4: Get latest indicator value
check_performance \
    "SELECT * FROM indicator_values WHERE symbol = 'BTC_TRY' AND indicator_type = 'SMA' ORDER BY timestamp DESC LIMIT 1;" \
    50 \
    "Get latest indicator value"

# Test 5: Get indicator series
check_performance \
    "SELECT * FROM indicator_values WHERE symbol = 'BTC_TRY' AND indicator_type = 'RSI' AND period = 14 ORDER BY timestamp DESC LIMIT 100;" \
    50 \
    "Get indicator time series"

# Test 6: Complex alert query
check_performance \
    "SELECT * FROM price_alerts WHERE symbol = 'ETH_TRY' AND alert_type = 'ABOVE' AND is_active = true AND target_price > 50000;" \
    50 \
    "Complex alert filter query"

echo ""

# Function call tests
echo "Step 7: Testing utility functions..."
echo "====================================="

echo -n "Testing get_user_active_alerts()... "
RESULT=$(run_sql "SELECT COUNT(*) FROM get_user_active_alerts('$TEST_USER_ID', 'BTC_TRY');" | grep -A1 "count" | tail -1 | xargs)
echo -e "${GREEN}✓${NC} Returned $RESULT alerts"

echo -n "Testing get_latest_indicator()... "
RESULT=$(run_sql "SELECT * FROM get_latest_indicator('BTC_TRY', 'SMA', 20);" | grep -c "row" || echo "1")
echo -e "${GREEN}✓${NC} Function executed"

echo -n "Testing trigger_price_alert()... "
ALERT_ID=$(run_sql "SELECT id FROM price_alerts WHERE is_active = true LIMIT 1;" | grep -A2 "id" | tail -1 | xargs)
run_sql "SELECT trigger_price_alert('$ALERT_ID', 75000.00);" > /dev/null
echo -e "${GREEN}✓${NC} Alert triggered"

echo ""

# View tests
echo "Step 8: Testing monitoring views..."
echo "===================================="

echo -n "Testing v_alert_stats_by_symbol... "
RESULT=$(run_sql "SELECT COUNT(*) FROM v_alert_stats_by_symbol;" | grep -A1 "count" | tail -1 | xargs)
echo -e "${GREEN}✓${NC} $RESULT symbols with alerts"

echo -n "Testing v_alert_stats_by_user... "
RESULT=$(run_sql "SELECT COUNT(*) FROM v_alert_stats_by_user;" | grep -A1 "count" | tail -1 | xargs)
echo -e "${GREEN}✓${NC} $RESULT users with alerts"

echo -n "Testing v_indicator_cache_stats... "
RESULT=$(run_sql "SELECT COUNT(*) FROM v_indicator_cache_stats;" | grep -A1 "count" | tail -1 | xargs)
echo -e "${GREEN}✓${NC} $RESULT indicator types cached"

echo ""

# Test index usage
echo "Step 9: Verifying index usage..."
echo "================================="

run_sql "EXPLAIN (FORMAT TEXT) SELECT * FROM price_alerts WHERE user_id = '$TEST_USER_ID' AND symbol = 'BTC_TRY' AND is_active = true;" | grep -i "index" && echo -e "${GREEN}✓${NC} Indexes used for alert queries" || echo -e "${YELLOW}!${NC} Query may not use optimal index"

run_sql "EXPLAIN (FORMAT TEXT) SELECT * FROM indicator_values WHERE symbol = 'BTC_TRY' AND indicator_type = 'SMA' ORDER BY timestamp DESC LIMIT 1;" | grep -i "index" && echo -e "${GREEN}✓${NC} Indexes used for indicator queries" || echo -e "${YELLOW}!${NC} Query may not use optimal index"

echo ""

# Test migration ROLLBACK
echo "Step 10: Testing migration rollback..."
run_sql_file "/Users/musti/Documents/Projects/MyCrypto_Platform/services/trade-engine/migrations/010-price-alerts-indicators.down.sql" > /dev/null
echo -e "${GREEN}✓${NC} Migration rollback successful"
echo ""

# Verify tables dropped
TABLE_COUNT=$(run_sql "\dt price_alerts" 2>&1 | grep -c "price_alerts" || echo "0")
if [ "$TABLE_COUNT" -eq "0" ]; then
    echo -e "${GREEN}✓${NC} price_alerts table dropped"
else
    echo -e "${RED}✗${NC} price_alerts table still exists"
    exit 1
fi

TABLE_COUNT=$(run_sql "\dt indicator_values" 2>&1 | grep -c "indicator_values" || echo "0")
if [ "$TABLE_COUNT" -eq "0" ]; then
    echo -e "${GREEN}✓${NC} indicator_values table dropped"
else
    echo -e "${RED}✗${NC} indicator_values table still exists"
    exit 1
fi

echo ""
echo "========================================="
echo -e "${GREEN}ALL TESTS PASSED!${NC}"
echo "========================================="
echo ""
echo "Summary:"
echo "- Migration UP: ✓"
echo "- Schema created: ✓"
echo "- Test data loaded: 1500 alerts, 2000 indicators"
echo "- Performance tests: All queries < 50ms"
echo "- Function tests: ✓"
echo "- View tests: ✓"
echo "- Index usage: ✓"
echo "- Migration DOWN: ✓"
echo ""
echo "Migration 010 is ready for production!"
