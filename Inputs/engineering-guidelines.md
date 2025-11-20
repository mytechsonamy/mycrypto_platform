# Engineering Guidelines
## Tech Stack & Coding Standards

**Version:** 1.0  
**Last Updated:** 2025-11-19  
**Target:** Development Team  
**Purpose:** Ensure consistent code quality and architecture

---

## 🏗️ Technology Stack

### Backend Services

| Service | Language | Framework | Database | Cache |
|---------|----------|-----------|----------|-------|
| **Auth Service** | Node.js 20 LTS | NestJS 10 | PostgreSQL 16 | Redis 7 |
| **Trading Service** | Go 1.21 | Gin / gRPC | PostgreSQL 16 | Redis 7 |
| **Matching Engine** | Rust 1.75 | Tokio / gRPC | Redis + PostgreSQL | Redis |
| **Wallet Service** | Node.js 20 LTS | NestJS 10 | PostgreSQL 16 | Redis 7 |
| **Compliance Service** | Python 3.11 | FastAPI | PostgreSQL 16 | Redis 7 |
| **Notification Service** | Node.js 20 LTS | NestJS 10 | PostgreSQL 16 | Redis 7 |

**Rationale:**
- **NestJS (Auth/Wallet):** TypeScript, enterprise patterns, good for CRUD + business logic
- **Go (Trading):** Performance, concurrency, suitable for high-throughput services
- **Rust (Matching Engine):** Ultra-low latency, memory safety, critical path optimization
- **Python (Compliance):** Rich ML/data libraries, rapid prototyping for regulatory logic

---

### Frontend

| Platform | Technology | State Management | UI Library |
|----------|------------|------------------|------------|
| **Web** | React 18 + TypeScript | Redux Toolkit | Material-UI v5 |
| **Mobile (iOS/Android)** | React Native 0.73 | Redux Toolkit | React Native Paper |
| **Admin Panel** | React 18 + TypeScript | Redux Toolkit | Ant Design |

**Rationale:**
- React ecosystem consistency across platforms
- TypeScript for type safety
- Redux Toolkit for predictable state management

---

### Infrastructure

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Container Orchestration** | Kubernetes 1.28 | Service deployment, scaling |
| **Container Runtime** | Docker 24 | Containerization |
| **API Gateway** | Kong 3.5 | Rate limiting, authentication, routing |
| **Message Queue** | RabbitMQ 3.12 | Async communication, event streaming |
| **Cache** | Redis 7 (Cluster) | Session, cache, pub/sub |
| **Database** | PostgreSQL 16 | Transactional data |
| **Object Storage** | AWS S3 / MinIO | KYC documents, backups |
| **Monitoring** | Prometheus + Grafana | Metrics, dashboards |
| **Logging** | ELK Stack (Elasticsearch 8, Logstash, Kibana) | Centralized logging |
| **Tracing** | Jaeger | Distributed tracing |
| **CI/CD** | GitHub Actions + ArgoCD | Automated deployment |

---

### Development Tools

| Tool | Purpose |
|------|---------|
| **Version Control** | Git + GitHub |
| **IDE** | VSCode (recommended), IntelliJ, PyCharm |
| **API Testing** | Postman, Insomnia |
| **Database Client** | DBeaver, pgAdmin |
| **API Documentation** | Swagger UI (OpenAPI 3.0) |
| **Project Management** | Jira / Linear |

---

## 📐 Coding Standards

### General Principles

1. **SOLID Principles** - Apply to all OOP code
2. **DRY (Don't Repeat Yourself)** - Extract common logic
3. **KISS (Keep It Simple, Stupid)** - Avoid over-engineering
4. **YAGNI (You Aren't Gonna Need It)** - Don't build for hypothetical future
5. **Single Responsibility** - One class/function = one purpose

---

### Naming Conventions

#### JavaScript/TypeScript (NestJS, React)

```typescript
// Classes: PascalCase
class UserService {}
class OrderRepository {}

// Functions/Methods: camelCase
function calculateFee() {}
async function getUserBalance() {}

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_TIMEOUT_MS = 5000;

// Interfaces: PascalCase with 'I' prefix (optional)
interface IUser {}
interface OrderDto {}

// Types: PascalCase
type OrderStatus = 'PENDING' | 'FILLED' | 'CANCELLED';

// Variables: camelCase
const userId = '123';
let orderCount = 0;

// Private members: prefix with underscore (optional)
private _internalCache: Map<string, any>;

// Boolean variables: use 'is', 'has', 'can', 'should'
const isActive = true;
const hasPermission = false;
```

#### Go (Trading Service)

```go
// Packages: lowercase, single word
package trading
package orderbook

// Files: snake_case
// order_service.go
// matching_engine.go

// Structs: PascalCase
type Order struct {}
type UserBalance struct {}

// Functions: PascalCase (exported), camelCase (unexported)
func ProcessOrder() {}  // exported
func validateAmount() {} // unexported

// Constants: PascalCase or UPPER_SNAKE_CASE
const MaxOrderSize = 1000000
const DEFAULT_FEE_RATE = 0.002

// Variables: camelCase
var orderCount int
var isRunning bool

// Interfaces: PascalCase, often with 'er' suffix
type OrderProcessor interface {}
type Validator interface {}
```

#### Rust (Matching Engine)

```rust
// Crates: snake_case
// matching_engine, order_book

// Files: snake_case
// order_matcher.rs
// price_level.rs

// Structs: PascalCase
struct Order {}
struct PriceLevel {}

// Functions: snake_case
fn process_order() {}
fn match_orders() {}

// Constants: UPPER_SNAKE_CASE
const MAX_ORDERS: u32 = 10000;
const MIN_ORDER_SIZE: f64 = 0.0001;

// Variables: snake_case
let order_id = "123";
let mut order_count = 0;

// Traits: PascalCase
trait OrderMatcher {}
trait Validator {}

// Enums: PascalCase
enum OrderSide {
    Buy,
    Sell,
}
```

#### Python (Compliance Service)

```python
# Modules: snake_case
# kyc_validator.py
# aml_checker.py

# Classes: PascalCase
class KycService:
    pass

class AmlRule:
    pass

# Functions: snake_case
def validate_kyc_document():
    pass

def check_sanctions_list():
    pass

# Constants: UPPER_SNAKE_CASE
MAX_DAILY_LIMIT = 50000
DEFAULT_RISK_SCORE = 0.5

# Variables: snake_case
user_id = "123"
risk_level = "low"

# Private members: prefix with single underscore
class KycService:
    def __init__(self):
        self._internal_cache = {}
    
    def _private_method(self):
        pass

# Boolean variables: use 'is_', 'has_', 'can_', 'should_'
is_valid = True
has_access = False
```

---

### Code Structure

#### NestJS Service Structure

```typescript
// src/modules/user/user.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly logger: LoggerService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    this.logger.log('Creating user', { email: createUserDto.email });
    
    try {
      const user = this.userRepository.create(createUserDto);
      return await this.userRepository.save(user);
    } catch (error) {
      this.logger.error('Failed to create user', error);
      throw error;
    }
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }
}
```

#### Go Service Structure

```go
// internal/trading/service/order_service.go

package service

import (
    "context"
    "errors"
    "github.com/exchange/internal/trading/models"
    "github.com/exchange/internal/trading/repository"
    "github.com/exchange/pkg/logger"
)

type OrderService struct {
    repo   repository.OrderRepository
    logger logger.Logger
}

func NewOrderService(repo repository.OrderRepository, log logger.Logger) *OrderService {
    return &OrderService{
        repo:   repo,
        logger: log,
    }
}

func (s *OrderService) CreateOrder(ctx context.Context, order *models.Order) error {
    s.logger.Info("Creating order", "user_id", order.UserID, "symbol", order.Symbol)
    
    if err := s.validateOrder(order); err != nil {
        s.logger.Error("Invalid order", "error", err)
        return err
    }
    
    if err := s.repo.Save(ctx, order); err != nil {
        s.logger.Error("Failed to save order", "error", err)
        return err
    }
    
    return nil
}

func (s *OrderService) validateOrder(order *models.Order) error {
    if order.Amount <= 0 {
        return errors.New("invalid order amount")
    }
    return nil
}
```

---

### Error Handling Patterns

#### NestJS

```typescript
// Use built-in HTTP exceptions
import { 
  BadRequestException, 
  NotFoundException, 
  UnauthorizedException,
  InternalServerErrorException 
} from '@nestjs/common';

// Business logic errors
throw new BadRequestException('Invalid order amount');
throw new NotFoundException('User not found');

// Custom error response
throw new BadRequestException({
  statusCode: 400,
  message: 'Validation failed',
  errors: ['Amount must be positive', 'Price is required'],
});

// Global exception filter (auto-applied)
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : 500;

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exception.message || 'Internal server error',
    });
  }
}
```

#### Go

```go
// Define custom error types
type AppError struct {
    Code    string
    Message string
    Err     error
}

func (e *AppError) Error() string {
    if e.Err != nil {
        return fmt.Sprintf("%s: %s - %v", e.Code, e.Message, e.Err)
    }
    return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

// Predefined errors
var (
    ErrOrderNotFound     = &AppError{Code: "ORDER_NOT_FOUND", Message: "Order not found"}
    ErrInsufficientFunds = &AppError{Code: "INSUFFICIENT_FUNDS", Message: "Insufficient balance"}
    ErrInvalidAmount     = &AppError{Code: "INVALID_AMOUNT", Message: "Invalid order amount"}
)

// Usage
func (s *OrderService) GetOrder(ctx context.Context, id string) (*Order, error) {
    order, err := s.repo.FindByID(ctx, id)
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return nil, ErrOrderNotFound
        }
        return nil, fmt.Errorf("failed to get order: %w", err)
    }
    return order, nil
}

// HTTP handler
func (h *OrderHandler) GetOrder(c *gin.Context) {
    order, err := h.service.GetOrder(c.Request.Context(), c.Param("id"))
    if err != nil {
        var appErr *AppError
        if errors.As(err, &appErr) {
            c.JSON(http.StatusBadRequest, gin.H{"error": appErr.Message})
            return
        }
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
        return
    }
    c.JSON(http.StatusOK, order)
}
```

---

### Logging Format (JSON)

**Standard Log Schema:**

```json
{
  "timestamp": "2025-11-19T10:30:45.123Z",
  "level": "info",
  "service": "auth-service",
  "environment": "production",
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "User logged in",
  "context": {
    "user_id": "usr_123",
    "ip": "192.168.1.1",
    "user_agent": "Mozilla/5.0..."
  },
  "error": {
    "message": "Database connection failed",
    "stack": "Error: ... at UserService.create ..."
  }
}
```

**Log Levels:**
- `trace` - Extremely detailed (development only)
- `debug` - Detailed info for debugging
- `info` - Normal operation events
- `warn` - Warning but not errors
- `error` - Error events
- `fatal` - Critical errors requiring immediate attention

**NestJS Logger:**

```typescript
import { LoggerService } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class AppLogger implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
      ],
    });
  }

  log(message: string, context?: any) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: any) {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: any) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: any) {
    this.logger.debug(message, { context });
  }
}
```

---

### API Response Format

**Success Response:**

```json
{
  "success": true,
  "data": {
    "id": "usr_123",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "meta": {
    "timestamp": "2025-11-19T10:30:45.123Z",
    "request_id": "req_abc123"
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-11-19T10:30:45.123Z",
    "request_id": "req_abc123"
  }
}
```

**Paginated Response:**

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  },
  "meta": {
    "timestamp": "2025-11-19T10:30:45.123Z",
    "request_id": "req_abc123"
  }
}
```

---

### Database Conventions

#### Table Naming

- **Lowercase + underscores:** `users`, `order_history`, `kyc_documents`
- **Plural nouns:** `users` (not `user`)
- **Junction tables:** `user_roles`, `order_trades`

#### Column Naming

- **Lowercase + underscores:** `user_id`, `created_at`, `order_status`
- **Primary keys:** `id` (UUID v4)
- **Foreign keys:** `{table}_id` (e.g., `user_id`, `order_id`)
- **Timestamps:** `created_at`, `updated_at`, `deleted_at` (soft delete)
- **Boolean:** `is_active`, `has_kyc`, `is_verified`

#### Indexes

```sql
-- Primary key (auto-indexed)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index on frequently queried columns
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status) WHERE status = 'OPEN';

-- Composite index for common queries
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Partial index for specific conditions
CREATE INDEX idx_orders_pending ON orders(created_at) WHERE status = 'PENDING';
```

---

### Testing Standards

#### Test Coverage Requirements

| Type | Coverage Target | Tools |
|------|-----------------|-------|
| **Unit Tests** | ≥ 80% | Jest (TS/JS), Go test, pytest |
| **Integration Tests** | ≥ 60% | Supertest, Testcontainers |
| **E2E Tests** | Critical paths | Cypress, Playwright |

#### Test Structure

```typescript
// NestJS Unit Test (Jest)
describe('UserService', () => {
  let service: UserService;
  let repository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  describe('create', () => {
    it('should create a user successfully', async () => {
      const createUserDto = { email: 'test@example.com', name: 'Test' };
      const expectedUser = { id: '1', ...createUserDto };

      jest.spyOn(repository, 'create').mockReturnValue(expectedUser as User);
      jest.spyOn(repository, 'save').mockResolvedValue(expectedUser as User);

      const result = await service.create(createUserDto);

      expect(result).toEqual(expectedUser);
      expect(repository.create).toHaveBeenCalledWith(createUserDto);
    });

    it('should throw error when email already exists', async () => {
      jest.spyOn(repository, 'save').mockRejectedValue({ code: '23505' });

      await expect(service.create({ email: 'test@example.com' }))
        .rejects.toThrow();
    });
  });
});
```

```go
// Go Unit Test
func TestOrderService_CreateOrder(t *testing.T) {
    tests := []struct {
        name    string
        order   *models.Order
        wantErr bool
        errMsg  string
    }{
        {
            name: "valid order",
            order: &models.Order{
                UserID: "usr_123",
                Amount: 1.5,
                Price:  50000,
            },
            wantErr: false,
        },
        {
            name: "invalid amount",
            order: &models.Order{
                UserID: "usr_123",
                Amount: -1,
            },
            wantErr: true,
            errMsg:  "invalid order amount",
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            mockRepo := &mockOrderRepository{}
            logger := &mockLogger{}
            service := NewOrderService(mockRepo, logger)

            err := service.CreateOrder(context.Background(), tt.order)

            if tt.wantErr {
                assert.Error(t, err)
                assert.Contains(t, err.Error(), tt.errMsg)
            } else {
                assert.NoError(t, err)
            }
        })
    }
}
```

---

### Security Best Practices

1. **Input Validation:**
   - Validate all user inputs (use `class-validator` in NestJS)
   - Sanitize data before database queries
   - Use parameterized queries (ORM protects against SQL injection)

2. **Authentication:**
   - JWT tokens with short expiry (15 min access, 30 days refresh)
   - bcrypt/argon2 for password hashing (min 12 rounds)
   - Rate limiting on login (5 attempts per 15 min)

3. **Authorization:**
   - Role-based access control (RBAC)
   - Check permissions on every request
   - Use guards/middleware consistently

4. **Secrets Management:**
   - Never commit secrets to Git
   - Use environment variables (`.env` files)
   - Production: Use HashiCorp Vault or AWS Secrets Manager

5. **Dependency Updates:**
   - Weekly Dependabot PRs review
   - Critical security patches applied within 24h

---

### Performance Guidelines

1. **Database:**
   - Use connection pooling (max 20 connections per service)
   - Add indexes on frequently queried columns
   - Use `SELECT` specific columns (not `SELECT *`)
   - Paginate large result sets

2. **Caching:**
   - Cache frequently accessed data (Redis, 5-60 min TTL)
   - Invalidate cache on updates
   - Use Redis for session storage

3. **API:**
   - Compress responses (gzip)
   - Use HTTP/2
   - Implement rate limiting (100 req/min per user)

4. **Async Processing:**
   - Use message queues for non-blocking operations
   - Email/SMS sending → Queue
   - Blockchain broadcasts → Queue

---

### Git Workflow

#### Branch Naming

- `main` - Production-ready code
- `develop` - Integration branch
- `feature/SHORT-123-feature-name` - New features
- `bugfix/SHORT-456-bug-description` - Bug fixes
- `hotfix/SHORT-789-critical-fix` - Emergency production fixes
- `release/v1.2.0` - Release branches

#### Commit Messages (Conventional Commits)

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting
- `refactor` - Code restructure
- `test` - Adding tests
- `chore` - Maintenance

**Examples:**

```
feat(auth): add 2FA with TOTP

Implements two-factor authentication using TOTP. Users can enable
2FA in settings and must verify with authenticator app on login.

Closes SHORT-123
```

```
fix(trading): prevent negative order amount

Added validation to reject orders with amount <= 0.

Fixes SHORT-456
```

---

### Code Review Checklist

- [ ] Code follows naming conventions
- [ ] No hardcoded secrets/credentials
- [ ] Unit tests added/updated
- [ ] Error handling implemented
- [ ] Logging added for important events
- [ ] API endpoint documented (OpenAPI)
- [ ] Security concerns addressed
- [ ] Performance considerations (N+1 queries, caching)
- [ ] Backward compatibility maintained
- [ ] Database migrations included (if schema changes)

---

## 📚 Required Reading

- [Clean Code](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882) - Robert C. Martin
- [The Pragmatic Programmer](https://pragprog.com/titles/tpp20/)
- [NestJS Documentation](https://docs.nestjs.com)
- [Go Best Practices](https://github.com/golang-standards/project-layout)
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)

---

**Document Owner:** Tech Lead  
**Review Frequency:** Quarterly  
**Next Review Date:** 2026-02-19
