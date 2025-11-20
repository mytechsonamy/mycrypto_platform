# JWT Implementation Files Index

## Task DO-005: JWT Signing Keys Generation and Configuration

This index provides a complete map of all files related to JWT implementation in the auth-service.

---

## File Structure

### Security Keys

```
keys/
├── private.pem          RSA-4096 private key for JWT signing
│                        - File size: 3268 bytes
│                        - Permissions: 400 (owner read-only)
│                        - Format: PEM-encoded
└── public.pem           RSA public key for JWT verification
                         - File size: 800 bytes
                         - Permissions: 444 (world-readable)
                         - Format: PEM-encoded
```

**Usage:** These keys are mounted at runtime in containers. Never commit these files to Git.

---

### Configuration Modules

#### `src/common/config/jwt.config.ts`

**Purpose:** NestJS configuration factory for JWT settings

**Key Features:**
- Loads RSA keys from files or environment variables
- Validates key availability on startup
- Supports RS256 algorithm with HS256 fallback
- Comprehensive error messages
- Calculates JWT expiry times

**Environment Variables:**
- `JWT_ALGORITHM` - Algorithm (RS256 or HS256)
- `JWT_PRIVATE_KEY_PATH` - Path to private key
- `JWT_PUBLIC_KEY_PATH` - Path to public key
- `JWT_PRIVATE_KEY` - Private key as environment variable
- `JWT_PUBLIC_KEY` - Public key as environment variable
- `JWT_ACCESS_TOKEN_EXPIRY` - Access token TTL (default: 15m)
- `JWT_REFRESH_TOKEN_EXPIRY` - Refresh token TTL (default: 30d)
- `JWT_EMAIL_VERIFICATION_EXPIRY` - Email verification TTL (default: 24h)

**Integration:**
```typescript
import { jwtConfig } from '../common/config/jwt.config';

@Module({
  imports: [ConfigModule.forFeature(jwtConfig)],
})
export class AuthModule {}
```

---

#### `src/auth/auth.module.ts` (Updated)

**Changes:**
- Added import: `import { jwtConfig } from '../common/config/jwt.config'`
- Added module import: `ConfigModule.forFeature(jwtConfig)`
- Updated JwtModule configuration to use RSA keys
- Conditional logic for RS256 vs HS256

**JWT Module Configuration:**
```typescript
JwtModule.registerAsync({
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => {
    const algorithm = configService.get<string>('jwt.algorithm', 'RS256');
    const signOptions = configService.get('jwt.signOptions');

    if (algorithm === 'RS256') {
      return {
        privateKey: configService.get<string>('jwt.privateKey'),
        publicKey: configService.get<string>('jwt.publicKey'),
        signOptions,
      };
    } else {
      return {
        secret: configService.get<string>('jwt.privateKey'),
        signOptions: { ...signOptions, algorithm: 'HS256' },
      };
    }
  },
  inject: [ConfigService],
})
```

---

### Environment Configuration

#### `docker-compose.yml` (Root Directory - Updated)

**Changes:**
- Added JWT environment variables to auth-service
- Added volume mount for keys directory (read-only)
- Configured token expiry times

**JWT Configuration Section:**
```yaml
environment:
  JWT_ALGORITHM: RS256
  JWT_PRIVATE_KEY_PATH: /app/keys/private.pem
  JWT_PUBLIC_KEY_PATH: /app/keys/public.pem
  JWT_ACCESS_TOKEN_EXPIRY: 15m
  JWT_REFRESH_TOKEN_EXPIRY: 30d
  JWT_EMAIL_VERIFICATION_EXPIRY: 24h

volumes:
  - ./services/auth-service/keys:/app/keys:ro
```

**Location:** `/Users/musti/Documents/Projects/MyCrypto_Platform/docker-compose.yml`

---

#### `.env.example` (Service - Updated)

**Purpose:** Template for service-level JWT configuration

**Contents:**
- JWT algorithm configuration
- Key path references
- Token expiry times
- Deprecated HS256 with warning notes

**Location:** `/Users/musti/Documents/Projects/MyCrypto_Platform/services/auth-service/.env.example`

---

#### `.env.example` (Root - Updated)

**Purpose:** Template for project-wide JWT configuration

**Contents:**
- Comprehensive JWT setup section
- Key generation instructions
- Algorithm documentation
- Token TTL settings
- Production setup guidance

**Location:** `/Users/musti/Documents/Projects/MyCrypto_Platform/.env.example`

---

### Validation & Testing

#### `scripts/validate-jwt-keys.sh`

**Purpose:** Comprehensive JWT key validation tool

**Checks Performed:**
1. Keys directory exists
2. Private key exists and is readable
3. Public key exists and is readable
4. File permissions correct (400 for private, 444 for public)
5. Key size validation (4096-bit minimum recommended)
6. Key pair integrity (modulus match)
7. Git ignore configuration
8. .env.example contains JWT settings

**Usage:**
```bash
cd services/auth-service
./scripts/validate-jwt-keys.sh
```

**Expected Output:** "All validation checks passed!"

**Location:** `/Users/musti/Documents/Projects/MyCrypto_Platform/services/auth-service/scripts/validate-jwt-keys.sh`

---

### Documentation

#### `JWT_SETUP.md`

**Type:** Quick Reference Guide

**Contents:**
- Overview of current setup
- Architecture diagram
- Local development instructions
- Docker Compose setup details
- Environment variable reference
- Service integration guide
- Testing procedures
- Troubleshooting

**Length:** 187 lines

**Best For:** Quick setup and integration reference

**Location:** `/Users/musti/Documents/Projects/MyCrypto_Platform/services/auth-service/JWT_SETUP.md`

---

#### `docs/JWT_KEY_MANAGEMENT.md`

**Type:** Comprehensive Operations Guide

**Contents:**
- Detailed architecture documentation
- Development key generation procedures
- Git configuration and verification
- Docker and container setup
- Production deployment (AWS Secrets Manager)
- Kubernetes secret configuration
- Key rotation procedures (regular and emergency)
- Troubleshooting guides
- Security best practices
- Monitoring and auditing setup
- References and support contacts

**Length:** 517 lines

**Best For:** Key operations, production setup, and troubleshooting

**Location:** `/Users/musti/Documents/Projects/MyCrypto_Platform/services/auth-service/docs/JWT_KEY_MANAGEMENT.md`

---

#### `JWT_IMPLEMENTATION_CHECKLIST.md`

**Type:** Implementation Verification

**Contents:**
- Deliverables verification checklist
- Acceptance criteria status
- Security compliance audit
- File inventory
- Integration point documentation
- Testing instructions
- Key metrics
- Next steps

**Length:** 337 lines

**Best For:** Project tracking and verification

**Location:** `/Users/musti/Documents/Projects/MyCrypto_Platform/services/auth-service/JWT_IMPLEMENTATION_CHECKLIST.md`

---

## Related Files (Not Modified)

### Security Reference

**Location:** `/Users/musti/Documents/Projects/MyCrypto_Platform/Inputs/security-audit-checklist.md`

**Relevant Sections:**
- Section 3.3: JWT Token Security
- Section 6.2: Key Storage
- Section 7: Key Management

### Existing Code References

**Location:** `/Users/musti/Documents/Projects/MyCrypto_Platform/services/auth-service/src/auth/`

**Files:**
- `auth.controller.ts` - Authentication endpoints
- `auth.service.ts` - Authentication business logic
- `entities/user.entity.ts` - User database model
- `interfaces/jwt-payload.interface.ts` - JWT payload structure

---

## Quick Navigation Guide

### I want to...

#### Start developing locally
1. Read: `JWT_SETUP.md` (sections: Local Development, Docker Compose Setup)
2. Run: `./scripts/validate-jwt-keys.sh`
3. Execute: `docker-compose up -d`

#### Integrate JWT in my service
1. Read: `JWT_SETUP.md` (section: Integration with Services)
2. Example: See TypeScript code blocks in JWT_SETUP.md

#### Understand key management
1. Read: `docs/JWT_KEY_MANAGEMENT.md` (section: Overview)
2. For operations: See Key Rotation Procedures section

#### Deploy to production
1. Read: `docs/JWT_KEY_MANAGEMENT.md` (section: Production Deployment)
2. Follow: AWS Secrets Manager Setup subsection
3. Reference: Kubernetes Secret Configuration

#### Rotate keys
1. Read: `docs/JWT_KEY_MANAGEMENT.md` (section: Key Rotation Procedures)
2. Execute: Regular Rotation Procedure or Emergency Rotation as needed

#### Troubleshoot issues
1. Check: `JWT_SETUP.md` (section: Troubleshooting)
2. Deep dive: `docs/JWT_KEY_MANAGEMENT.md` (section: Troubleshooting)
3. Run: `./scripts/validate-jwt-keys.sh`

#### Verify compliance
1. Read: `JWT_IMPLEMENTATION_CHECKLIST.md`
2. Reference: `security-audit-checklist.md` sections 3.3, 6.2, 7

---

## File Dependencies

```
docker-compose.yml
  ├── Requires: services/auth-service/keys/{private,public}.pem
  └── Uses env vars from: services/auth-service/.env.example

auth-service container
  ├── Loads: src/common/config/jwt.config.ts
  ├── Uses: src/auth/auth.module.ts
  ├── Mounts: keys/private.pem (read-only)
  └── Mounts: keys/public.pem (read-only)

jwt.config.ts
  ├── Loads: keys/private.pem OR JWT_PRIVATE_KEY env var
  ├── Loads: keys/public.pem OR JWT_PUBLIC_KEY env var
  └── Validates: All JWT_* environment variables

auth.module.ts
  ├── Imports: jwt.config.ts
  ├── Uses: JwtPayload interface
  └── Configures: NestJS JwtModule
```

---

## Configuration Precedence

### Key Loading (jwt.config.ts)

1. **Environment Variables (highest priority)**
   - `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`

2. **File Paths**
   - `JWT_PRIVATE_KEY_PATH` / `JWT_PUBLIC_KEY_PATH`

3. **Development Defaults (lowest priority)**
   - `keys/private.pem` / `keys/public.pem` in project root

### Example Priority Chain

```
Check JWT_PRIVATE_KEY env var
  ↓ (if not set)
Check JWT_PRIVATE_KEY_PATH and load file
  ↓ (if not set)
Check development default: keys/private.pem
  ↓ (if not found)
Throw error with guidance
```

---

## Version History

| Date       | Status      | Key Changes                              |
|------------|-------------|------------------------------------------|
| 2025-11-19 | CREATED     | Initial RSA key pair generation          |
| 2025-11-19 | UPDATED     | jwt.config.ts created                    |
| 2025-11-19 | UPDATED     | auth.module.ts updated with RS256        |
| 2025-11-19 | UPDATED     | docker-compose.yml JWT configuration     |
| 2025-11-19 | DOCUMENTED  | Comprehensive documentation created      |

---

## Support & References

### Internal Documentation
- Quick Setup: `JWT_SETUP.md`
- Operations: `docs/JWT_KEY_MANAGEMENT.md`
- Verification: `JWT_IMPLEMENTATION_CHECKLIST.md`
- This File: `JWT_FILES_INDEX.md`

### External References
- RFC 7519: JWT Standard
- NestJS JWT: https://docs.nestjs.com/security/authentication
- OWASP: Authentication Cheat Sheet
- AWS Secrets Manager: Key Management Best Practices

### Contact
- Security Team: security@techsonamy.com
- DevOps Team: [Contact info]
- Project Lead: [Contact info]

---

**Index Version:** 1.0
**Last Updated:** 2025-11-19
**Classification:** Internal - Development Team
