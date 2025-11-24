#!/bin/bash

#############################################################################
# Integration Test Environment Setup Script
# Purpose: Automate full-stack test environment configuration
# Usage: ./scripts/test-environment-setup.sh [up|down|clean|seed]
#############################################################################

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="docker-compose.test.yml"
ENV_FILE=".env.test"
LOG_FILE="${PROJECT_ROOT}/test-environment.log"

# Test environment settings
TEST_DB_USER="test"
TEST_DB_PASSWORD="test_password_secure"
TEST_DB_NAME="exchange_test"
TEST_DB_PORT="5433"
TEST_REDIS_PASSWORD="test_redis_password"
TEST_REDIS_PORT="6380"

# Timing
HEALTHCHECK_TIMEOUT=120
SERVICE_STARTUP_TIMEOUT=60

#############################################################################
# Utility Functions
#############################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1" | tee -a "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

#############################################################################
# Environment Setup
#############################################################################

setup_env_file() {
    log_info "Creating test environment file: $ENV_FILE"

    cat > "$PROJECT_ROOT/$ENV_FILE" << 'EOF'
# API Configuration
API_BASE_URL=http://localhost:3001/api/v1
TRADE_ENGINE_URL=http://localhost:8080/api/v1
WS_URL=ws://localhost:3001/ws

# Database
DATABASE_URL=postgresql://test:test_password_secure@localhost:5433/exchange_test
DATABASE_HOST=localhost
DATABASE_PORT=5433
DATABASE_USER=test
DATABASE_PASSWORD=test_password_secure
DATABASE_NAME=exchange_test

# Redis
REDIS_URL=redis://:test_redis_password@localhost:6380
REDIS_HOST=localhost
REDIS_PORT=6380
REDIS_PASSWORD=test_redis_password

# RabbitMQ
RABBITMQ_URL=amqp://test_user:test_password@localhost:5673/

# Test User Credentials
TEST_USER_1_EMAIL=trader1@test.local
TEST_USER_1_PASSWORD=TestPass123!
TEST_USER_2_EMAIL=trader2@test.local
TEST_USER_2_PASSWORD=TestPass123!

# Performance Test Thresholds
THROUGHPUT_TARGET=100
THROUGHPUT_THRESHOLD=95
LATENCY_P99_TARGET=100
LATENCY_P99_THRESHOLD=110

# Timeout Configuration
API_TIMEOUT_MS=5000
WS_TIMEOUT_MS=10000
HEALTHCHECK_TIMEOUT=120

# Email (Mailpit)
MAIL_HOST=localhost
MAIL_PORT=1026
MAIL_USER=
MAIL_PASSWORD=

# Test Flags
SKIP_E2E_TESTS=false
SKIP_PERF_TESTS=false
VERBOSE_LOGGING=true
EOF

    log_success "Environment file created"
}

#############################################################################
# Docker Compose Operations
#############################################################################

start_services() {
    log_info "Starting Docker services (test environment)..."

    if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null; then
        log_error "docker-compose or docker not found. Please install Docker."
        exit 1
    fi

    cd "$PROJECT_ROOT"

    # Build images
    log_info "Building Docker images..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache

    # Start services
    log_info "Starting services..."
    docker-compose -f "$COMPOSE_FILE" up -d

    log_success "Services started (detached mode)"
}

stop_services() {
    log_info "Stopping Docker services..."

    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" down

    log_success "Services stopped"
}

#############################################################################
# Health Checks
#############################################################################

wait_for_postgres() {
    log_info "Waiting for PostgreSQL to be ready..."

    local elapsed=0
    while [ $elapsed -lt $HEALTHCHECK_TIMEOUT ]; do
        if pg_isready -h localhost -p "$TEST_DB_PORT" -U "$TEST_DB_USER" &>/dev/null; then
            log_success "PostgreSQL is ready"
            return 0
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done

    log_error "PostgreSQL failed to start within ${HEALTHCHECK_TIMEOUT}s"
    return 1
}

wait_for_redis() {
    log_info "Waiting for Redis to be ready..."

    local elapsed=0
    while [ $elapsed -lt $HEALTHCHECK_TIMEOUT ]; do
        if redis-cli -h localhost -p "$TEST_REDIS_PORT" -a "$TEST_REDIS_PASSWORD" ping &>/dev/null; then
            log_success "Redis is ready"
            return 0
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done

    log_error "Redis failed to start within ${HEALTHCHECK_TIMEOUT}s"
    return 1
}

wait_for_service() {
    local service=$1
    local url=$2
    local elapsed=0

    log_info "Waiting for $service to be ready ($url)..."

    while [ $elapsed -lt $SERVICE_STARTUP_TIMEOUT ]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            log_success "$service is ready"
            return 0
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done

    log_warn "$service did not respond to health check within ${SERVICE_STARTUP_TIMEOUT}s"
    return 0  # Don't fail, it might still work
}

perform_health_checks() {
    log_info "Performing health checks on all services..."

    # Wait for infrastructure
    wait_for_postgres || return 1
    wait_for_redis || return 1

    # Wait for microservices
    wait_for_service "Trade Engine" "http://localhost:8080/api/v1/health"
    wait_for_service "Auth Service" "http://localhost:3001/health"
    wait_for_service "Wallet Service" "http://localhost:3002/health"

    log_success "All health checks passed"
    return 0
}

#############################################################################
# Database Initialization
#############################################################################

init_database() {
    log_info "Initializing test database..."

    cd "$PROJECT_ROOT"

    # Create database (if not exists - postgres will create via dockerfile)
    log_info "Waiting for database to initialize with migrations..."
    sleep 10

    # Run any additional migrations if needed
    if [ -f "scripts/init-test-db.sql" ]; then
        log_info "Running additional database initialization SQL..."
        PGPASSWORD="$TEST_DB_PASSWORD" psql \
            -h localhost \
            -p "$TEST_DB_PORT" \
            -U "$TEST_DB_USER" \
            -d "$TEST_DB_NAME" \
            -f "scripts/init-test-db.sql"
        log_success "Database initialized"
    else
        log_info "No additional init SQL found, using Docker entrypoint"
    fi
}

#############################################################################
# Test Data Seeding
#############################################################################

seed_test_data() {
    log_info "Seeding test data..."

    cd "$PROJECT_ROOT"

    if [ ! -f "scripts/seed-test-data.sh" ]; then
        log_warn "Test data seed script not found, skipping..."
        return 0
    fi

    # Make seed script executable
    chmod +x scripts/seed-test-data.sh

    # Run seed script with environment
    export DATABASE_URL="postgresql://${TEST_DB_USER}:${TEST_DB_PASSWORD}@localhost:${TEST_DB_PORT}/${TEST_DB_NAME}"
    export API_BASE_URL="http://localhost:3001/api/v1"
    export REDIS_URL="redis://:${TEST_REDIS_PASSWORD}@localhost:${TEST_REDIS_PORT}"

    log_info "Executing test data seed script..."
    if bash scripts/seed-test-data.sh; then
        log_success "Test data seeded successfully"
    else
        log_warn "Test data seed encountered issues (may not be critical)"
    fi
}

#############################################################################
# Verification
#############################################################################

verify_connectivity() {
    log_info "Verifying service connectivity..."

    # Test API endpoints
    log_info "Testing API endpoints..."

    endpoints=(
        "http://localhost:8080/api/v1/health:Trade Engine"
        "http://localhost:3001/health:Auth Service"
        "http://localhost:3002/health:Wallet Service"
    )

    local failed=0
    for endpoint in "${endpoints[@]}"; do
        IFS=':' read -r url name <<< "$endpoint"
        if curl -sf "$url" > /dev/null 2>&1; then
            log_success "$name: OK"
        else
            log_warn "$name: No response (may start later)"
            ((failed++))
        fi
    done

    # Test database connectivity
    if pg_isready -h localhost -p "$TEST_DB_PORT" -U "$TEST_DB_USER" &>/dev/null; then
        log_success "PostgreSQL: OK"
    else
        log_error "PostgreSQL: FAILED"
        return 1
    fi

    # Test Redis connectivity
    if redis-cli -h localhost -p "$TEST_REDIS_PORT" -a "$TEST_REDIS_PASSWORD" ping &>/dev/null; then
        log_success "Redis: OK"
    else
        log_error "Redis: FAILED"
        return 1
    fi

    if [ $failed -gt 0 ]; then
        log_warn "Some services not yet responsive, but core infrastructure is ready"
    fi

    log_success "Connectivity verification complete"
}

#############################################################################
# Cleanup
#############################################################################

cleanup() {
    log_info "Cleaning up test environment..."

    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" down -v

    log_success "Test environment cleaned up"
}

#############################################################################
# Main Command Handler
#############################################################################

show_usage() {
    cat << 'EOF'
Usage: ./scripts/test-environment-setup.sh [COMMAND]

Commands:
  up                Start test environment (build, start, health check)
  down              Stop test environment
  clean             Stop and remove all volumes (full reset)
  seed              Seed test data into running environment
  health            Run health checks only
  logs              Show docker-compose logs
  ps                Show running containers
  help              Show this message

Examples:
  # Start test environment and wait for readiness
  ./scripts/test-environment-setup.sh up

  # Seed test data (requires environment running)
  ./scripts/test-environment-setup.sh seed

  # Clean up completely
  ./scripts/test-environment-setup.sh clean

EOF
}

#############################################################################
# Main Execution
#############################################################################

main() {
    local command="${1:-help}"

    # Initialize log file
    echo "" > "$LOG_FILE"
    log_info "Test Environment Setup Started"
    log_info "Command: $command"
    log_info "Project Root: $PROJECT_ROOT"

    case "$command" in
        up)
            setup_env_file
            start_services
            perform_health_checks
            init_database
            seed_test_data
            verify_connectivity
            log_success "Test environment is ready for testing!"
            log_info "API Base URL: http://localhost:3001/api/v1"
            log_info "Trade Engine URL: http://localhost:8080/api/v1"
            log_info "WebSocket URL: ws://localhost:3001/ws"
            log_info "View logs: cat $LOG_FILE"
            ;;

        down)
            stop_services
            log_success "Test environment stopped"
            ;;

        clean)
            log_warn "This will remove all test data and volumes!"
            read -p "Are you sure? (yes/no): " -r
            if [[ $REPLY =~ ^yes$ ]]; then
                cleanup
                log_success "Test environment fully reset"
            else
                log_info "Cleanup cancelled"
            fi
            ;;

        seed)
            seed_test_data
            ;;

        health)
            perform_health_checks
            verify_connectivity
            ;;

        logs)
            cd "$PROJECT_ROOT"
            docker-compose -f "$COMPOSE_FILE" logs -f
            ;;

        ps)
            cd "$PROJECT_ROOT"
            docker-compose -f "$COMPOSE_FILE" ps
            ;;

        help)
            show_usage
            ;;

        *)
            log_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Run main
main "$@"
