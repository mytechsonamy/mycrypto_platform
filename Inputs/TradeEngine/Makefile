# ============================================================================
# MYTRADER TRADE ENGINE - MAKEFILE
# ============================================================================

.PHONY: help
help: ## Show this help message
	@echo "MyTrader Trade Engine - Available Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ============================================================================
# Development
# ============================================================================

.PHONY: setup
setup: ## Setup development environment
	@echo "🔧 Setting up development environment..."
	go mod download
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	@echo "✅ Setup complete!"

.PHONY: run
run: ## Run the application locally
	@echo "🚀 Starting Trade Engine..."
	go run cmd/server/main.go

.PHONY: build
build: ## Build the binary
	@echo "🔨 Building Trade Engine..."
	go build -o bin/trade-engine cmd/server/main.go
	@echo "✅ Binary created: bin/trade-engine"

.PHONY: test
test: ## Run all tests
	@echo "🧪 Running tests..."
	go test -v -race -coverprofile=coverage.out ./...
	@echo "✅ Tests complete!"

.PHONY: test-coverage
test-coverage: test ## Run tests with coverage report
	@echo "📊 Generating coverage report..."
	go tool cover -html=coverage.out -o coverage.html
	@echo "✅ Coverage report: coverage.html"

.PHONY: bench
bench: ## Run benchmarks
	@echo "⚡ Running benchmarks..."
	go test -bench=. -benchmem ./internal/matching/
	@echo "✅ Benchmarks complete!"

.PHONY: lint
lint: ## Run linter
	@echo "🔍 Running linter..."
	golangci-lint run
	@echo "✅ Linting complete!"

# ============================================================================
# Docker
# ============================================================================

.PHONY: docker-build
docker-build: ## Build Docker image
	@echo "🐳 Building Docker image..."
	docker build -t mytrader/trade-engine:latest .
	@echo "✅ Docker image built!"

.PHONY: docker-up
docker-up: ## Start all services with Docker Compose
	@echo "🐳 Starting services..."
	docker-compose up -d
	@echo "✅ Services started!"
	@echo ""
	@echo "📍 Service URLs:"
	@echo "  - Trade Engine API: http://localhost:8080"
	@echo "  - Kafka UI: http://localhost:8090"
	@echo "  - Prometheus: http://localhost:9090"
	@echo "  - Grafana: http://localhost:3000 (admin/admin)"

.PHONY: docker-down
docker-down: ## Stop all services
	@echo "🛑 Stopping services..."
	docker-compose down
	@echo "✅ Services stopped!"

.PHONY: docker-logs
docker-logs: ## View logs from all services
	docker-compose logs -f

.PHONY: docker-clean
docker-clean: ## Stop services and remove volumes (⚠️  deletes data)
	@echo "⚠️  WARNING: This will delete all data!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		echo "✅ Cleanup complete!"; \
	else \
		echo "❌ Cancelled"; \
	fi

# ============================================================================
# Database
# ============================================================================

.PHONY: db-setup
db-setup: ## Setup database with DDL scripts
	@echo "🗄️  Setting up database..."
	psql -h localhost -U trade_engine_app -d mytrader_trade_engine -f migrations/001_initial_schema.sql
	@echo "✅ Database setup complete!"

.PHONY: db-migrate
db-migrate: ## Run database migrations
	@echo "🗄️  Running migrations..."
	# TODO: Add migration tool (e.g., golang-migrate)
	@echo "✅ Migrations complete!"

.PHONY: db-seed
db-seed: ## Seed database with test data
	@echo "🌱 Seeding database..."
	# TODO: Add seed script
	@echo "✅ Seeding complete!"

# ============================================================================
# Testing & Quality
# ============================================================================

.PHONY: test-unit
test-unit: ## Run unit tests only
	go test -v -short ./...

.PHONY: test-integration
test-integration: ## Run integration tests
	go test -v -run Integration ./...

.PHONY: test-e2e
test-e2e: ## Run end-to-end tests
	@echo "🔄 Running E2E tests..."
	# TODO: Add E2E test suite
	@echo "✅ E2E tests complete!"

.PHONY: load-test
load-test: ## Run load tests (requires k6)
	@echo "⚡ Running load tests..."
	k6 run tests/load/order_placement.js
	@echo "✅ Load tests complete!"

# ============================================================================
# Code Quality
# ============================================================================

.PHONY: fmt
fmt: ## Format code
	@echo "🎨 Formatting code..."
	go fmt ./...
	@echo "✅ Formatting complete!"

.PHONY: vet
vet: ## Run go vet
	@echo "🔍 Running go vet..."
	go vet ./...
	@echo "✅ Vet complete!"

.PHONY: security
security: ## Run security scanner
	@echo "🔒 Running security scanner..."
	gosec ./...
	@echo "✅ Security scan complete!"

# ============================================================================
# Documentation
# ============================================================================

.PHONY: docs
docs: ## Generate documentation
	@echo "📚 Generating documentation..."
	godoc -http=:6060
	@echo "📍 Documentation: http://localhost:6060"

.PHONY: api-docs
api-docs: ## Open API documentation (Swagger UI)
	@echo "📖 Opening API documentation..."
	@echo "📍 Swagger UI: http://localhost:8080/swagger/index.html"

# ============================================================================
# Monitoring
# ============================================================================

.PHONY: metrics
metrics: ## View Prometheus metrics
	@open http://localhost:9090 || xdg-open http://localhost:9090

.PHONY: dashboard
dashboard: ## Open Grafana dashboard
	@open http://localhost:3000 || xdg-open http://localhost:3000

# ============================================================================
# Utilities
# ============================================================================

.PHONY: clean
clean: ## Clean build artifacts
	@echo "🧹 Cleaning..."
	rm -rf bin/
	rm -f coverage.out coverage.html
	@echo "✅ Cleanup complete!"

.PHONY: deps
deps: ## Download dependencies
	@echo "📦 Downloading dependencies..."
	go mod download
	@echo "✅ Dependencies downloaded!"

.PHONY: deps-update
deps-update: ## Update dependencies
	@echo "📦 Updating dependencies..."
	go get -u ./...
	go mod tidy
	@echo "✅ Dependencies updated!"

# ============================================================================
# Quick Start
# ============================================================================

.PHONY: quick-start
quick-start: ## Quick start (setup + docker-up + test)
	@echo "🚀 MyTrader Trade Engine - Quick Start"
	@echo ""
	@$(MAKE) setup
	@$(MAKE) docker-up
	@echo ""
	@echo "⏳ Waiting for services to be ready..."
	@sleep 10
	@echo ""
	@echo "🧪 Running smoke tests..."
	@curl -s http://localhost:8080/health | jq .
	@echo ""
	@echo "✅ Quick start complete!"
	@echo ""
	@echo "📍 Next steps:"
	@echo "  1. View API: http://localhost:8080/api/v1/stats"
	@echo "  2. Run tests: make test"
	@echo "  3. View logs: make docker-logs"

# ============================================================================
# Default
# ============================================================================

.DEFAULT_GOAL := help
