.PHONY: help setup up down logs ps health lint test coverage security build deploy clean

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
RED := \033[0;31m
YELLOW := \033[1;33m
NC := \033[0m # No Color

help:
	@echo "$(BLUE)MyCrypto Platform - Development Commands$(NC)"
	@echo ""
	@echo "$(YELLOW)Setup & Environment$(NC)"
	@echo "  make setup              - Initial setup (copy .env, install deps)"
	@echo ""
	@echo "$(YELLOW)Docker Compose$(NC)"
	@echo "  make up                 - Start all services"
	@echo "  make down               - Stop all services"
	@echo "  make ps                 - Show running services"
	@echo "  make logs               - View logs (all services)"
	@echo "  make logs-auth          - View auth-service logs"
	@echo "  make logs-postgres      - View PostgreSQL logs"
	@echo "  make logs-redis         - View Redis logs"
	@echo "  make logs-rabbitmq      - View RabbitMQ logs"
	@echo ""
	@echo "$(YELLOW)Database$(NC)"
	@echo "  make db-connect         - Connect to PostgreSQL"
	@echo "  make db-reset           - Reset database (WARNING: deletes data)"
	@echo "  make db-seed            - Seed database with test data"
	@echo "  make db-backup          - Backup database"
	@echo ""
	@echo "$(YELLOW)Redis$(NC)"
	@echo "  make redis-connect      - Connect to Redis CLI"
	@echo "  make redis-clear        - Clear Redis data"
	@echo ""
	@echo "$(YELLOW)RabbitMQ$(NC)"
	@echo "  make rabbitmq-ui        - Open RabbitMQ Management UI"
	@echo "  make rabbitmq-queues    - List RabbitMQ queues"
	@echo ""
	@echo "$(YELLOW)Code Quality$(NC)"
	@echo "  make lint               - Run ESLint"
	@echo "  make format             - Format code with Prettier"
	@echo "  make test               - Run unit tests"
	@echo "  make coverage           - Run tests with coverage"
	@echo "  make security           - Run security scans"
	@echo ""
	@echo "$(YELLOW)Build & Deploy$(NC)"
	@echo "  make build              - Build Docker images"
	@echo "  make build-auth         - Build auth-service image"
	@echo ""
	@echo "$(YELLOW)Kubernetes$(NC)"
	@echo "  make k8s-create-ns      - Create Kubernetes namespace"
	@echo "  make k8s-deploy         - Deploy to local Kubernetes"
	@echo "  make k8s-logs           - View Kubernetes pod logs"
	@echo "  make k8s-status         - Show Kubernetes deployment status"
	@echo "  make k8s-delete         - Delete Kubernetes resources"
	@echo ""
	@echo "$(YELLOW)Health & Monitoring$(NC)"
	@echo "  make health             - Check health of all services"
	@echo "  make health-detailed    - Detailed health check"
	@echo ""
	@echo "$(YELLOW)Cleanup$(NC)"
	@echo "  make clean              - Stop services and remove volumes"
	@echo "  make clean-all          - Clean everything (including unused images)"

# ============================================================================
# SETUP
# ============================================================================

setup:
	@echo "$(BLUE)Setting up development environment...$(NC)"
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(GREEN)✓ Created .env file$(NC)"; \
	else \
		echo "$(YELLOW)⚠ .env file already exists$(NC)"; \
	fi
	@echo "$(GREEN)✓ Setup complete! Run 'make up' to start services$(NC)"

# ============================================================================
# DOCKER COMPOSE
# ============================================================================

up:
	@echo "$(BLUE)Starting services...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✓ Services started$(NC)"
	@sleep 5
	@make health

down:
	@echo "$(BLUE)Stopping services...$(NC)"
	docker-compose down
	@echo "$(GREEN)✓ Services stopped$(NC)"

ps:
	@echo "$(BLUE)Running services:$(NC)"
	docker-compose ps

logs:
	docker-compose logs -f

logs-auth:
	docker-compose logs -f auth-service

logs-postgres:
	docker-compose logs -f postgres

logs-redis:
	docker-compose logs -f redis

logs-rabbitmq:
	docker-compose logs -f rabbitmq

# ============================================================================
# DATABASE
# ============================================================================

db-connect:
	@echo "$(BLUE)Connecting to PostgreSQL...$(NC)"
	docker-compose exec postgres psql -U postgres -d exchange_dev

db-reset:
	@echo "$(RED)WARNING: This will delete all data in the database!$(NC)"
	@read -p "Are you sure? Type 'yes' to continue: " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		docker-compose down -v postgres; \
		docker-compose up -d postgres; \
		echo "$(GREEN)✓ Database reset$(NC)"; \
	else \
		echo "$(YELLOW)Cancelled$(NC)"; \
	fi

db-seed:
	@echo "$(BLUE)Seeding database...$(NC)"
	npm run db:seed --prefix services/auth-service
	@echo "$(GREEN)✓ Database seeded$(NC)"

db-backup:
	@echo "$(BLUE)Backing up database...$(NC)"
	docker-compose exec postgres pg_dump -U postgres exchange_dev > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✓ Database backed up$(NC)"

# ============================================================================
# REDIS
# ============================================================================

redis-connect:
	@echo "$(BLUE)Connecting to Redis...$(NC)"
	docker-compose exec redis redis-cli -a redis_dev_password

redis-clear:
	@echo "$(YELLOW)Clearing Redis...$(NC)"
	docker-compose exec redis redis-cli -a redis_dev_password FLUSHDB
	@echo "$(GREEN)✓ Redis cleared$(NC)"

# ============================================================================
# RABBITMQ
# ============================================================================

rabbitmq-ui:
	@echo "$(BLUE)Opening RabbitMQ Management UI...$(NC)"
	open http://localhost:15672 || xdg-open http://localhost:15672

rabbitmq-queues:
	@echo "$(BLUE)RabbitMQ Queues:$(NC)"
	docker-compose exec rabbitmq rabbitmqctl list_queues

# ============================================================================
# CODE QUALITY
# ============================================================================

lint:
	@echo "$(BLUE)Running ESLint...$(NC)"
	npm run lint --prefix services/auth-service

format:
	@echo "$(BLUE)Formatting code...$(NC)"
	npm run format --prefix services/auth-service

test:
	@echo "$(BLUE)Running unit tests...$(NC)"
	npm run test --prefix services/auth-service

coverage:
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	npm run test:cov --prefix services/auth-service

security:
	@echo "$(BLUE)Running security scans...$(NC)"
	npm audit --prefix services/auth-service --audit-level=moderate || true

# ============================================================================
# BUILD
# ============================================================================

build:
	@echo "$(BLUE)Building Docker images...$(NC)"
	docker-compose build

build-auth:
	@echo "$(BLUE)Building auth-service image...$(NC)"
	docker build -t exchange/auth-service:latest ./services/auth-service
	@echo "$(GREEN)✓ Image built: exchange/auth-service:latest$(NC)"

# ============================================================================
# KUBERNETES
# ============================================================================

k8s-create-ns:
	@echo "$(BLUE)Creating Kubernetes namespace...$(NC)"
	kubectl create namespace exchange --dry-run=client -o yaml | kubectl apply -f -
	@echo "$(GREEN)✓ Namespace created$(NC)"

k8s-deploy: k8s-create-ns
	@echo "$(BLUE)Deploying to Kubernetes...$(NC)"
	kubectl apply -f k8s/base/auth-service/service.yaml -n exchange
	kubectl apply -f k8s/base/auth-service/deployment.yaml -n exchange
	@echo "$(GREEN)✓ Deployment complete$(NC)"
	@sleep 5
	@make k8s-status

k8s-logs:
	kubectl logs -f deployment/auth-service -n exchange

k8s-status:
	@echo "$(BLUE)Kubernetes Deployment Status:$(NC)"
	kubectl get deployments -n exchange
	@echo ""
	kubectl get pods -n exchange
	@echo ""
	kubectl get svc -n exchange

k8s-delete:
	@echo "$(RED)Deleting Kubernetes resources...$(NC)"
	kubectl delete deployment auth-service -n exchange || true
	kubectl delete svc auth-service -n exchange || true
	kubectl delete namespace exchange || true
	@echo "$(GREEN)✓ Resources deleted$(NC)"

# ============================================================================
# HEALTH CHECKS
# ============================================================================

health:
	@echo "$(BLUE)Checking service health...$(NC)"
	@echo -n "PostgreSQL: "
	@docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1 && echo "$(GREEN)✓$(NC)" || echo "$(RED)✗$(NC)"
	@echo -n "Redis: "
	@docker-compose exec -T redis redis-cli -a redis_dev_password ping > /dev/null 2>&1 && echo "$(GREEN)✓$(NC)" || echo "$(RED)✗$(NC)"
	@echo -n "RabbitMQ: "
	@docker-compose exec -T rabbitmq rabbitmq-diagnostics ping > /dev/null 2>&1 && echo "$(GREEN)✓$(NC)" || echo "$(RED)✗$(NC)"
	@echo -n "Auth Service: "
	@curl -s http://localhost:3001/health > /dev/null 2>&1 && echo "$(GREEN)✓$(NC)" || echo "$(RED)✗$(NC)"

health-detailed:
	@echo "$(BLUE)Detailed Health Check:$(NC)"
	@echo ""
	@echo "$(YELLOW)PostgreSQL:$(NC)"
	@docker-compose exec postgres pg_isready -U postgres || echo "Not ready"
	@echo ""
	@echo "$(YELLOW)Redis:$(NC)"
	@docker-compose exec redis redis-cli -a redis_dev_password ping || echo "Not responding"
	@echo ""
	@echo "$(YELLOW)RabbitMQ:$(NC)"
	@docker-compose exec rabbitmq rabbitmq-diagnostics ping || echo "Not responding"
	@echo ""
	@echo "$(YELLOW)Auth Service Health:$(NC)"
	@curl -s http://localhost:3001/health | jq . || echo "Service not responding"
	@echo ""
	@echo "$(YELLOW)Auth Service Readiness:$(NC)"
	@curl -s http://localhost:3001/health/ready | jq . || echo "Service not ready"

# ============================================================================
# CLEANUP
# ============================================================================

clean:
	@echo "$(BLUE)Cleaning up...$(NC)"
	docker-compose down
	docker-compose volume remove -f postgres_data redis_data rabbitmq_data || true
	@echo "$(GREEN)✓ Cleanup complete$(NC)"

clean-all: clean
	@echo "$(BLUE)Removing all Docker resources...$(NC)"
	docker system prune -f
	@echo "$(GREEN)✓ All resources cleaned$(NC)"
