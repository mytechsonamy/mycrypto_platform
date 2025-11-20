#!/bin/bash

# MyCrypto Platform - Quick Start Script
# This script sets up the development environment in 5 minutes

set -e

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}MyCrypto Platform - Quick Start${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Step 1: Check prerequisites
echo -e "${YELLOW}Step 1: Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker is not installed${NC}"
    echo "  Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
    exit 1
fi
echo -e "${GREEN}✓ Docker installed${NC}"

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}✗ Docker Compose is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose installed${NC}"

if ! command -v make &> /dev/null; then
    echo -e "${RED}✗ Make is not installed${NC}"
    echo "  macOS: brew install make"
    echo "  Linux: apt-get install make"
    exit 1
fi
echo -e "${GREEN}✓ Make installed${NC}"

# Step 2: Setup environment file
echo ""
echo -e "${YELLOW}Step 2: Setting up environment...${NC}"

if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file${NC}"
else
    echo -e "${YELLOW}⚠ .env file already exists (skipping)${NC}"
fi

# Step 3: Start services
echo ""
echo -e "${YELLOW}Step 3: Starting services (this may take 1-2 minutes)...${NC}"
docker-compose up -d
echo -e "${GREEN}✓ Services starting in background${NC}"

# Step 4: Wait for services to be healthy
echo ""
echo -e "${YELLOW}Step 4: Waiting for services to be healthy...${NC}"

RETRIES=0
MAX_RETRIES=30

while [ $RETRIES -lt $MAX_RETRIES ]; do
    if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1 && \
       docker-compose exec -T redis redis-cli -a redis_dev_password ping > /dev/null 2>&1 && \
       docker-compose exec -T rabbitmq rabbitmq-diagnostics ping > /dev/null 2>&1; then
        break
    fi
    RETRIES=$((RETRIES + 1))
    echo -n "."
    sleep 2
done

if [ $RETRIES -ge $MAX_RETRIES ]; then
    echo -e "${RED}✗ Services failed to start${NC}"
    echo "  Run 'docker-compose logs' for more information"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ All services are healthy${NC}"

# Step 5: Display service information
echo ""
echo -e "${YELLOW}Step 5: Service Information${NC}"
echo ""
echo -e "${BLUE}PostgreSQL:${NC}"
echo "  URL: postgresql://postgres:postgres@localhost:5432/exchange_dev"
echo "  Connect: make db-connect"
echo ""
echo -e "${BLUE}Redis:${NC}"
echo "  URL: redis://:redis_dev_password@localhost:6379"
echo "  Connect: make redis-connect"
echo ""
echo -e "${BLUE}RabbitMQ:${NC}"
echo "  AMQP: amqp://rabbitmq:rabbitmq_dev_password@localhost:5672"
echo "  UI: http://localhost:15672 (rabbitmq / rabbitmq_dev_password)"
echo ""
echo -e "${BLUE}Auth Service:${NC}"
echo "  URL: http://localhost:3001"
echo "  Health: curl http://localhost:3001/health"
echo ""

# Step 6: Final instructions
echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. View service logs:"
echo "   make logs"
echo ""
echo "2. Run code quality checks:"
echo "   make lint"
echo "   make format"
echo ""
echo "3. Run tests:"
echo "   make test"
echo "   make coverage"
echo ""
echo "4. Stop services:"
echo "   make down"
echo ""
echo "5. View all available commands:"
echo "   make help"
echo ""
echo -e "${YELLOW}Documentation:${NC}"
echo "  - README.md              - Full documentation"
echo "  - .env.example           - Environment variables"
echo "  - docker-compose.yml     - Service definitions"
echo "  - k8s/base/auth-service/ - Kubernetes manifests"
echo ""
