# Auth Service

Authentication and authorization service for MyCrypto Platform.

## Features

- User registration with email/password
- Email verification with JWT tokens
- Password hashing with Argon2id
- Rate limiting (5 attempts per hour per IP)
- RabbitMQ integration for email notifications
- Comprehensive validation with class-validator
- OpenAPI/Swagger documentation

## Prerequisites

- Node.js 20 LTS
- PostgreSQL 16
- Redis 7
- RabbitMQ 3.12

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

## Running the Service

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## Testing

```bash
# Unit tests
npm run test

# Unit tests with coverage
npm run test:cov

# E2E tests (requires test database)
npm run test:e2e
```

## API Documentation

Once the service is running, visit:
- Swagger UI: http://localhost:3001/api/docs
- OpenAPI spec: See `/openapi-specification.yaml` in the root directory

## Endpoints

### POST /api/v1/auth/register
Register a new user with the following payload:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "terms_accepted": true,
  "kvkk_consent_accepted": true
}
```

**Validation Rules:**
- Email: Valid email format, max 255 characters
- Password: Min 8 characters, must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character
- Terms and KVKK consent must be accepted

**Rate Limiting:** 5 registration attempts per IP address per hour

## Project Structure

```
src/
├── auth/
│   ├── dto/              # Data Transfer Objects
│   ├── entities/         # TypeORM entities
│   ├── interfaces/       # TypeScript interfaces
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   └── auth.service.spec.ts
├── common/
│   └── services/
│       └── rabbitmq.service.ts
├── app.module.ts
└── main.ts
test/
├── auth.e2e-spec.ts      # E2E tests
└── jest-e2e.json
```

## Database Schema

The service uses the `users` table with the following key columns:
- `id` (UUID)
- `email` (unique)
- `password_hash`
- `email_verified`
- `email_verification_token`
- `email_verification_expires_at`
- `terms_accepted`
- `kvkk_consent_accepted`
- `created_at`
- `updated_at`

## Security Features

- Argon2id password hashing with configurable cost parameters
- JWT tokens for email verification (24-hour expiry)
- Rate limiting on registration endpoint
- Input validation and sanitization
- Secure error messages (no user enumeration)

## Message Queue Integration

The service publishes email verification messages to RabbitMQ:
- Queue: `email.verification`
- Message format:
```json
{
  "type": "EMAIL_VERIFICATION",
  "timestamp": "2025-11-19T10:30:45.123Z",
  "data": {
    "email": "user@example.com",
    "token": "jwt_token",
    "userId": "uuid"
  }
}
```

## Development Notes

- Never set `synchronize: true` in TypeORM configuration for production
- Ensure all environment variables are properly configured
- Run database migrations before starting the service
- Check RabbitMQ connection on startup