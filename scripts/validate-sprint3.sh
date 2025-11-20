#!/bin/bash

# Sprint 3 Infrastructure Validation Script
# Purpose: Verify all new services are configured correctly
# Usage: ./scripts/validate-sprint3.sh

set -e

echo "======================================================================"
echo "Sprint 3 Infrastructure Validation"
echo "======================================================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0

# Helper functions
pass_check() {
  echo -e "${GREEN}✓${NC} $1"
  ((PASS_COUNT++))
}

fail_check() {
  echo -e "${RED}✗${NC} $1"
  ((FAIL_COUNT++))
}

warn_check() {
  echo -e "${YELLOW}⚠${NC} $1"
}

# 1. Docker Compose Configuration
echo "1. Docker Compose Configuration"
echo "================================="

if [ -f docker-compose.yml ]; then
  pass_check "docker-compose.yml exists"

  if docker-compose config > /dev/null 2>&1; then
    pass_check "docker-compose configuration is valid"
  else
    fail_check "docker-compose configuration has errors"
  fi
else
  fail_check "docker-compose.yml not found"
fi

# 2. Required Services in docker-compose
echo ""
echo "2. Service Definitions"
echo "======================"

REQUIRED_SERVICES=("minio" "clamav" "postgres" "redis" "rabbitmq" "auth-service" "wallet-service")

for service in "${REQUIRED_SERVICES[@]}"; do
  if grep -q "^  $service:" docker-compose.yml; then
    pass_check "Service '$service' is defined"
  else
    fail_check "Service '$service' is missing"
  fi
done

# 3. Volume Configuration
echo ""
echo "3. Volume Configuration"
echo "======================="

REQUIRED_VOLUMES=("minio_data" "clamav_data" "postgres_data" "redis_data" "rabbitmq_data")

for volume in "${REQUIRED_VOLUMES[@]}"; do
  if grep -q "$volume:" docker-compose.yml; then
    pass_check "Volume '$volume' is configured"
  else
    fail_check "Volume '$volume' is missing"
  fi
done

# 4. Environment Variables
echo ""
echo "4. Environment Variables"
echo "========================"

if [ -f .env.example ]; then
  pass_check ".env.example exists"

  # Check for new Sprint 3 variables
  SPRINT3_VARS=("S3_ENDPOINT" "S3_BUCKET_KYC" "CLAMAV_HOST" "BLOCKCYPHER_BTC_TOKEN" "BLOCKCYPHER_ETH_TOKEN")

  for var in "${SPRINT3_VARS[@]}"; do
    if grep -q "$var" .env.example; then
      pass_check "Environment variable '$var' documented"
    else
      fail_check "Environment variable '$var' not documented"
    fi
  done
else
  fail_check ".env.example not found"
fi

# 5. Prometheus Configuration
echo ""
echo "5. Prometheus Configuration"
echo "============================"

if [ -f monitoring/prometheus.yml ]; then
  pass_check "monitoring/prometheus.yml exists"

  # Check for new scrape configs
  SCRAPE_JOBS=("minio" "wallet-service" "clamav")

  for job in "${SCRAPE_JOBS[@]}"; do
    if grep -q "job_name: '$job'" monitoring/prometheus.yml; then
      pass_check "Prometheus job '$job' is configured"
    else
      fail_check "Prometheus job '$job' is missing"
    fi
  done
else
  fail_check "monitoring/prometheus.yml not found"
fi

# 6. Documentation
echo ""
echo "6. Documentation"
echo "================="

REQUIRED_DOCS=(
  "docs/SPRINT3_INFRASTRUCTURE.md"
  "docs/BLOCKCHAIN_INTEGRATION.md"
)

for doc in "${REQUIRED_DOCS[@]}"; do
  if [ -f "$doc" ]; then
    pass_check "Documentation file '$doc' exists"
  else
    fail_check "Documentation file '$doc' is missing"
  fi
done

# 7. Health Check Configuration
echo ""
echo "7. Health Check Configuration"
echo "=============================="

SERVICES_WITH_HEALTH=("postgres" "redis" "rabbitmq" "minio" "clamav" "auth-service" "wallet-service")

for service in "${SERVICES_WITH_HEALTH[@]}"; do
  if grep -A 10 "^  $service:" docker-compose.yml | grep -q "healthcheck:"; then
    pass_check "Service '$service' has healthcheck configured"
  else
    fail_check "Service '$service' missing healthcheck"
  fi
done

# 8. Network Configuration
echo ""
echo "8. Network Configuration"
echo "========================"

if grep -q "networks:" docker-compose.yml && grep -q "exchange_network:" docker-compose.yml; then
  pass_check "Network 'exchange_network' is configured"
else
  fail_check "Network configuration is missing"
fi

# 9. Port Conflicts Check
echo ""
echo "9. Port Availability Check"
echo "==========================="

PORTS=(9000 9001 3310 5432 6379 5672 15672 3001 3002 9090)

for port in "${PORTS[@]}"; do
  if ! lsof -i :$port > /dev/null 2>&1; then
    pass_check "Port $port is available"
  else
    SERVICE=$(lsof -i :$port | tail -1 | awk '{print $1}')
    warn_check "Port $port is in use (service: $SERVICE)"
  fi
done

# 10. Docker Daemon Check
echo ""
echo "10. Docker Daemon Check"
echo "======================="

if docker info > /dev/null 2>&1; then
  pass_check "Docker daemon is running"
else
  fail_check "Docker daemon is not running"
fi

# Summary
echo ""
echo "======================================================================"
echo "Validation Summary"
echo "======================================================================"
echo -e "Passed: ${GREEN}${PASS_COUNT}${NC}"
echo -e "Failed: ${RED}${FAIL_COUNT}${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
  echo -e "${GREEN}All checks passed! Infrastructure is ready.${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Run: docker-compose up -d"
  echo "2. Verify services: docker-compose ps"
  echo "3. Access MinIO: http://localhost:9001"
  echo "4. Access Prometheus: http://localhost:9090"
  exit 0
else
  echo -e "${RED}Some checks failed. Please review the errors above.${NC}"
  exit 1
fi
