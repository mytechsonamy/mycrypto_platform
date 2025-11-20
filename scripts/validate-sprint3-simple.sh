#!/bin/bash

echo "======================================================================"
echo "Sprint 3 Infrastructure Validation"
echo "======================================================================"
echo ""

PASS=0
FAIL=0

# Check 1: docker-compose.yml exists
if [ -f docker-compose.yml ]; then
  echo "✓ docker-compose.yml exists"
  ((PASS++))
else
  echo "✗ docker-compose.yml not found"
  ((FAIL++))
fi

# Check 2: Services defined
for service in minio clamav postgres redis rabbitmq auth-service wallet-service; do
  if grep -q "^  $service:" docker-compose.yml; then
    echo "✓ Service '$service' is defined"
    ((PASS++))
  else
    echo "✗ Service '$service' is missing"
    ((FAIL++))
  fi
done

# Check 3: Volumes configured
for volume in minio_data clamav_data postgres_data redis_data; do
  if grep -q "$volume:" docker-compose.yml; then
    echo "✓ Volume '$volume' is configured"
    ((PASS++))
  else
    echo "✗ Volume '$volume' is missing"
    ((FAIL++))
  fi
done

# Check 4: Environment variables
if [ -f .env.example ]; then
  echo "✓ .env.example exists"
  ((PASS++))
  
  for var in S3_ENDPOINT S3_BUCKET_KYC CLAMAV_HOST BLOCKCYPHER_API_KEY; do
    if grep -q "$var" .env.example; then
      echo "✓ Environment variable '$var' documented"
      ((PASS++))
    else
      echo "✗ Environment variable '$var' not documented"
      ((FAIL++))
    fi
  done
else
  echo "✗ .env.example not found"
  ((FAIL++))
fi

# Check 5: Documentation files
for doc in docs/SPRINT3_INFRASTRUCTURE.md docs/BLOCKCHAIN_INTEGRATION.md; do
  if [ -f "$doc" ]; then
    echo "✓ Documentation file '$doc' exists"
    ((PASS++))
  else
    echo "✗ Documentation file '$doc' is missing"
    ((FAIL++))
  fi
done

# Check 6: Prometheus configuration
if grep -q "job_name: 'minio'" monitoring/prometheus.yml; then
  echo "✓ Prometheus job 'minio' is configured"
  ((PASS++))
else
  echo "✗ Prometheus job 'minio' is missing"
  ((FAIL++))
fi

# Check 7: Docker Compose syntax
if docker-compose config > /dev/null 2>&1; then
  echo "✓ Docker Compose configuration is valid"
  ((PASS++))
else
  echo "✗ Docker Compose configuration has errors"
  ((FAIL++))
fi

echo ""
echo "======================================================================"
echo "Validation Summary: $PASS passed, $FAIL failed"
echo "======================================================================"

if [ $FAIL -eq 0 ]; then
  echo "All checks passed! Infrastructure is ready for deployment."
  exit 0
else
  echo "Some checks failed. Please review the errors above."
  exit 1
fi
