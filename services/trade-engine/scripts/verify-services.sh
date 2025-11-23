#!/bin/bash

# Trade Engine Services Verification Script
# Verifies that all Docker services are running and healthy

set -e

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

# Exit status tracking
FAILED=0

# Function to print results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
        FAILED=1
    fi
}

# Function to print info
print_info() {
    echo -e "${YELLOW}→${NC} $1"
}

echo "========================================="
echo "Trade Engine Services Verification"
echo "========================================="
echo "Time: $(date)"
echo ""

# Check Docker Compose is available
print_info "Checking Docker Compose..."
if command -v docker-compose &> /dev/null; then
    print_result 0 "Docker Compose is installed"
else
    print_result 1 "Docker Compose not found"
    exit 1
fi

# Navigate to project directory
cd "$PROJECT_DIR"

echo ""
echo "--- Docker Services Status ---"

# Test 1: Docker Compose services running
print_info "Checking Docker services..."
if docker-compose ps | grep -q "Up"; then
    print_result 0 "Docker Compose services are running"
else
    print_result 1 "Some Docker services are not running"
fi

# Test 2: PostgreSQL Connection
echo ""
echo "--- Database Connectivity ---"

print_info "Testing PostgreSQL..."
if docker-compose exec -T postgres pg_isready -U trade_engine_user -d trade_engine_db > /dev/null 2>&1; then
    print_result 0 "PostgreSQL connection successful"
else
    print_result 1 "PostgreSQL connection failed"
fi

# Test 3: Database accessibility from host
print_info "Testing PostgreSQL from host (port 5433)..."
if timeout 5 bash -c 'cat < /dev/null > /dev/tcp/127.0.0.1/5433' > /dev/null 2>&1; then
    print_result 0 "PostgreSQL accessible on port 5433"
else
    print_result 1 "PostgreSQL not accessible on port 5433"
fi

# Test 4: Redis Connection
echo ""
echo "--- Cache Service ---"

print_info "Testing Redis..."
if docker-compose exec -T redis redis-cli ping | grep -q "PONG"; then
    print_result 0 "Redis connection successful"
else
    print_result 1 "Redis connection failed"
fi

# Test 5: Redis accessibility from host
print_info "Testing Redis from host (port 6380)..."
if timeout 5 bash -c 'cat < /dev/null > /dev/tcp/127.0.0.1/6380' > /dev/null 2>&1; then
    print_result 0 "Redis accessible on port 6380"
else
    print_result 1 "Redis not accessible on port 6380"
fi

# Test 6: RabbitMQ Connection
echo ""
echo "--- Message Broker ---"

print_info "Testing RabbitMQ..."
if docker-compose exec -T rabbitmq rabbitmq-diagnostics -q ping > /dev/null 2>&1; then
    print_result 0 "RabbitMQ connection successful"
else
    print_result 1 "RabbitMQ connection failed"
fi

# Test 7: RabbitMQ Management API
print_info "Testing RabbitMQ Management API (port 15673)..."
if timeout 5 bash -c 'cat < /dev/null > /dev/tcp/127.0.0.1/15673' > /dev/null 2>&1; then
    print_result 0 "RabbitMQ Management UI accessible on port 15673"
else
    print_result 1 "RabbitMQ Management UI not accessible on port 15673"
fi

# Test 8: PgBouncer Connection
echo ""
echo "--- Connection Pooling ---"

print_info "Testing PgBouncer..."
if docker-compose exec -T pgbouncer pg_isready -h localhost > /dev/null 2>&1; then
    print_result 0 "PgBouncer connection successful"
else
    print_result 1 "PgBouncer connection failed"
fi

# Test 9: PgBouncer accessibility from host
print_info "Testing PgBouncer from host (port 6433)..."
if timeout 5 bash -c 'cat < /dev/null > /dev/tcp/127.0.0.1/6433' > /dev/null 2>&1; then
    print_result 0 "PgBouncer accessible on port 6433"
else
    print_result 1 "PgBouncer not accessible on port 6433"
fi

# Test 10: Network connectivity
echo ""
echo "--- Network Configuration ---"

print_info "Checking Docker network..."
if docker network ls | grep -q "trade-engine-network"; then
    print_result 0 "Docker network 'trade-engine-network' exists"
else
    print_result 1 "Docker network 'trade-engine-network' not found"
fi

# Test 11: Volume persistence
echo ""
echo "--- Data Persistence ---"

print_info "Checking data volumes..."
VOLUMES=("postgres-data" "redis-data" "rabbitmq-data")
for volume in "${VOLUMES[@]}"; do
    if docker volume ls | grep -q "$volume"; then
        print_result 0 "Volume '$volume' exists"
    else
        print_result 1 "Volume '$volume' not found"
    fi
done

# Test 12: Environment configuration
echo ""
echo "--- Environment Configuration ---"

if [ -f ".env" ]; then
    print_result 0 ".env file exists"
else
    print_result 1 ".env file not found (run: cp .env.example .env)"
fi

if [ -f ".env.example" ]; then
    print_result 0 ".env.example file exists"
else
    print_result 1 ".env.example file not found"
fi

# Summary
echo ""
echo "========================================="

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}=== All Verification Tests Passed ===${NC}"
    echo ""
    echo "Services are healthy and ready for use:"
    echo "  PostgreSQL:  localhost:5433"
    echo "  Redis:       localhost:6380"
    echo "  RabbitMQ:    localhost:5673 (AMQP)"
    echo "               localhost:15673 (Management UI)"
    echo "  PgBouncer:   localhost:6433"
    echo ""
    echo "Next steps:"
    echo "  1. Run migrations: make migrate"
    echo "  2. Start the application: make run"
    echo "  3. Check health: curl http://localhost:8080/health"
    exit 0
else
    echo -e "${RED}=== Some Verification Tests Failed ===${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check Docker is running: docker ps"
    echo "  2. Check service logs: docker-compose logs -f"
    echo "  3. Ensure ports are available: lsof -i :5433"
    echo "  4. Restart services: docker-compose down && docker-compose up -d"
    exit 1
fi
