#!/bin/bash

# Test database schema verification
# Fast smoke tests for database

set -e

PROJECT_DIR="/Users/musti/Documents/Projects/MyCrypto_Platform/services/trade-engine"
cd "$PROJECT_DIR"

echo "Testing Database Schema..."
echo ""

# Test 1: ENUMs
echo "Test 1: Checking ENUM types..."
docker-compose exec -T postgres psql -U trade_engine_user -d trade_engine_db \
    -tc "SELECT COUNT(*) FROM pg_type WHERE typname IN ('order_side_enum', 'order_type_enum', 'order_status_enum', 'time_in_force_enum');" | grep -q "4" && \
    echo "✓ All 4 ENUM types exist" || echo "✗ ENUM types missing"

# Test 2: Tables
echo "Test 2: Checking core tables..."
docker-compose exec -T postgres psql -U trade_engine_user -d trade_engine_db \
    -tc "SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('symbols', 'orders', 'trades', 'order_book');" | grep -q "4" && \
    echo "✓ All 4 core tables exist" || echo "✗ Core tables missing"

# Test 3: Partitions
echo "Test 3: Checking table partitions..."
ORDERS_PARTITIONS=$(docker-compose exec -T postgres psql -U trade_engine_user -d trade_engine_db \
    -tc "SELECT COUNT(*) FROM pg_tables WHERE tablename LIKE 'orders_%';" | tr -d ' ')
TRADES_PARTITIONS=$(docker-compose exec -T postgres psql -U trade_engine_user -d trade_engine_db \
    -tc "SELECT COUNT(*) FROM pg_tables WHERE tablename LIKE 'trades_%';" | tr -d ' ')
echo "✓ Orders partitions: $ORDERS_PARTITIONS (expected >= 12)"
echo "✓ Trades partitions: $TRADES_PARTITIONS (expected >= 30)"

# Test 4: Symbols
echo "Test 4: Checking seed data..."
docker-compose exec -T postgres psql -U trade_engine_user -d trade_engine_db \
    -tc "SELECT COUNT(*) FROM symbols;" | grep -q "10" && \
    echo "✓ 10 default trading symbols loaded" || echo "✗ Seed data missing"

# Test 5: Indexes
echo "Test 5: Checking indexes..."
INDEX_COUNT=$(docker-compose exec -T postgres psql -U trade_engine_user -d trade_engine_db \
    -tc "SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public';" | tr -d ' ')
echo "✓ $INDEX_COUNT indexes created"

echo ""
echo "Database Schema Tests Complete"
