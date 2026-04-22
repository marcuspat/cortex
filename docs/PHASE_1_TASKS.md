# Phase 1: Critical Security — Detailed Task List

**Timeline**: Weeks 1-2 (BLOCKER for production)
**Goal**: Implement critical security measures to enable safe production deployment
**Team**: 2 senior engineers recommended

---

## Task 1.1: Implement Authentication System

**Priority**: P0 (CRITICAL)
**Estimated Time**: 16-24 hours
**Dependencies**: None

### Subtasks

#### 1.1.1 Install and Configure NextAuth.js
- [ ] Install NextAuth.js: `npm install next-auth @auth/prisma-adapter`
- [ ] Create Prisma adapter schema (add `User`, `Account`, `Session`, `VerificationToken` models)
- [ ] Run migration: `npx prisma migrate dev --name add_auth_models`
- [ ] Configure environment variables:
  - `NEXTAUTH_SECRET` (generate: `openssl rand -base64 32`)
  - `NEXTAUTH_URL` (set to deployment URL)

**Acceptance Criteria**:
- NextAuth.js is installed and configured
- Prisma schema includes 4 auth models
- Migration runs successfully
- Environment variables documented in `.env.example`

**Files to Modify**:
- `prisma/schema.prisma`
- `.env.example`
- `src/app/api/auth/[...nextauth]/route.ts` (new file)

#### 1.1.2 Implement OAuth Providers
- [ ] Add Google OAuth provider
- [ ] Add GitHub OAuth provider
- [ ] Configure OAuth app credentials in Railway dashboard
- [ ] Add provider configuration to NextAuth

**Acceptance Criteria**:
- Users can sign in with Google
- Users can sign in with GitHub
- OAuth callbacks work correctly
- User sessions persist across refreshes

**Files to Create**:
- `src/lib/auth.ts`

**Environment Variables Required**:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

#### 1.1.3 Add Authentication Middleware
- [ ] Create middleware to protect API routes
- [ ] Add `/api/auth/session` endpoint for session checks
- [ ] Implement token validation helper
- [ ] Add user context to Prisma calls

**Acceptance Criteria**:
- Protected routes return 401 without auth
- Session endpoint returns current user or null
- Helper functions available for route protection

**Files to Create**:
- `src/middleware.ts`
- `src/lib/auth-middleware.ts`

#### 1.1.4 Update All API Routes with Auth
- [ ] Add auth check to `/api/connectors/*` routes
- [ ] Add auth check to `/api/memories/*` routes
- [ ] Add auth check to `/api/insights/*` routes
- [ ] Add auth check to `/api/chat/*` routes
- [ ] Add auth check to `/api/agents/*` routes
- [ ] Add auth check to `/api/settings/*` routes
- [ ] Add auth check to `/api/entities/*` routes
- [ ] Keep `/api/health` and `/api/` public

**Acceptance Criteria**:
- All 15+ data endpoints require authentication
- 401 responses include `code: 'AUTH_REQUIRED'`
- Health check remains publicly accessible

**Files to Modify**:
- `src/app/api/connectors/route.ts`
- `src/app/api/connectors/[id]/route.ts`
- `src/app/api/memories/route.ts`
- All other API route files

#### 1.1.5 Add User Association to All Data
- [ ] Add `userId` field to all Prisma models
- [ ] Create migration for user association
- [ ] Update all queries to filter by `userId`
- [ ] Add user to session context

**Acceptance Criteria**:
- All data queries filter by current user
- Users cannot see other users' data
- Foreign key constraints enforce data ownership

**Files to Modify**:
- `prisma/schema.prisma`
- All API route files

---

## Task 1.2: Implement Input Validation with Zod

**Priority**: P0 (CRITICAL)
**Estimated Time**: 12-16 hours
**Dependencies**: None

### Subtasks

#### 1.2.1 Create Validation Schema Library
- [ ] Create `/src/lib/validations/` directory
- [ ] Create schema for Connector operations
- [ ] Create schema for Memory operations
- [ ] Create schema for InsightCard operations
- [ ] Create schema for Chat operations
- [ ] Create schema for Settings operations

**Acceptance Criteria**:
- All API inputs have Zod schemas
- Schemas include type checking, length limits, format validation
- Schemas are reusable across routes

**Files to Create**:
- `src/lib/validations/connector.ts`
- `src/lib/validations/memory.ts`
- `src/lib/validations/insight.ts`
- `src/lib/validations/chat.ts`
- `src/lib/validations/settings.ts`

#### 1.2.2 Add Validation Helper Middleware
- [ ] Create validation middleware function
- [ ] Add error formatting for Zod errors
- [ ] Return 400 with validation details on failure

**Acceptance Criteria**:
- Middleware validates requests against schemas
- Validation errors return 400 status
- Error responses include field-level details

**Files to Create**:
- `src/lib/validate.ts`

#### 1.2.3 Apply Validation to All POST/PUT Endpoints
- [ ] Add validation to `POST /api/connectors`
- [ ] Add validation to `PUT /api/connectors/[id]`
- [ ] Add validation to `POST /api/chat/sessions`
- [ ] Add validation to `POST /api/chat/sessions/[id]/messages`
- [ ] Add validation to `PATCH /api/insights/[id]`
- [ ] Add validation to `PUT /api/settings`

**Acceptance Criteria**:
- All mutation endpoints validate input
- Invalid data is rejected before database operations
- Test coverage for validation failures

**Files to Modify**:
- All API route files with POST/PUT/PATCH

---

## Task 1.3: Fix Environment File Security

**Priority**: P0 (CRITICAL)
**Estimated Time**: 2-4 hours
**Dependencies**: None

### Subtasks

#### 1.3.1 Fix .env File Permissions
- [ ] Change `.env` permissions to 600: `chmod 600 .env`
- [ ] Verify permissions: `ls -la .env`
- [ ] Add `.env` to `.gitignore` (verify it's already there)

**Acceptance Criteria**:
- `.env` is readable only by owner
- Git ignores `.env` file
- No secrets in git history

#### 1.3.2 Create Environment Validation
- [ ] Create `/src/lib/env.ts` with Zod schema
- [ ] Validate all required environment variables on startup
- [ ] Fail fast with clear error if variables missing
- [ ] Document all environment variables in `.env.example`

**Acceptance Criteria**:
- App crashes at startup if required variables missing
- Error message lists missing variables
- `.env.example` is comprehensive

**Files to Create**:
- `src/lib/env.ts`

**Files to Modify**:
- `.env.example`

#### 1.3.3 Implement Secrets Management Strategy
- [ ] Document secret rotation procedure
- [ ] Add secret validation to CI/CD
- [ ] Create secrets inventory spreadsheet
- [ ] Document Railway dashboard variable setup

**Acceptance Criteria**:
- Secrets inventory exists
- Rotation procedure documented
- CI validates secret presence

**Files to Create**:
- `docs/SECRETS_MANAGEMENT.md`

---

## Task 1.4: Implement Rate Limiting

**Priority**: P0 (CRITICAL)
**Estimated Time**: 8-12 hours
**Dependencies**: None

### Subtasks

#### 1.4.1 Choose Rate Limiting Strategy
- [ ] Evaluate options: Upstash Redis, in-memory, or Cloudflare
- [ ] Decision: Use Upstash Redis (free tier available)

**Acceptance Criteria**:
- Rate limiting strategy documented
- Provider selected

#### 1.4.2 Install Rate Limiting Dependencies
- [ ] Install Upstash Redis package
- [ ] Configure Upstash credentials in Railway
- [ ] Add environment variables

**Packages to Install**:
```bash
npm install @upstash/redis @upstash/ratelimit
```

**Environment Variables**:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

#### 1.4.3 Create Rate Limiting Middleware
- [ ] Create rate limiter instances for different endpoints
- [ ] Implement middleware function
- [ ] Add rate limit headers to responses

**Acceptance Criteria**:
- Middleware checks rate limits before route execution
- Returns 429 when limit exceeded
- Includes `RateLimit-*` headers in responses

**Files to Create**:
- `src/lib/rate-limit.ts`

#### 1.4.4 Apply Rate Limits to Endpoints
- [ ] Apply strict limits (10 req/min) to mutation endpoints
- [ ] Apply lenient limits (100 req/min) to query endpoints
- [ ] Apply custom limits to auth endpoints
- [ ] No limits on health check

**Acceptance Criteria**:
- POST/PUT/PATCH endpoints: 10 req/min
- GET endpoints: 100 req/min
- Auth endpoints: 5 req/min
- Health check: unlimited

**Files to Modify**:
- All API route files

---

## Task 1.5: Implement Comprehensive Testing

**Priority**: P0 (CRITICAL)
**Estimated Time**: 24-32 hours
**Dependencies**: None

### Subtasks

#### 1.5.1 Add Unit Tests for All Components
- [ ] Create tests for all UI components in `/src/components/views/`
- [ ] Create tests for utility functions in `/src/lib/`
- [ ] Target: 80%+ code coverage

**Acceptance Criteria**:
- All components have test files
- Tests cover happy path and error cases
- Coverage report shows 80%+

**Files to Create**:
- `src/components/views/**/*.test.tsx`
- `src/lib/**/*.test.ts`

#### 1.5.2 Add Integration Tests for API Routes
- [ ] Create tests for all API endpoints
- [ ] Mock database with test database
- [ ] Test authentication requirements
- [ ] Test input validation
- [ ] Test error handling

**Acceptance Criteria**:
- All 15+ API routes have tests
- Tests use test database
- Auth and validation tested

**Files to Create**:
- `src/app/api/**/*.test.ts`

#### 1.5.3 Add E2E Tests for Critical Flows
- [ ] Install Playwright: `npm install -D playwright`
- [ ] Create test for connector creation flow
- [ ] Create test for memory browsing flow
- [ ] Create test for chat interaction flow
- [ ] Create test for insight feedback flow

**Acceptance Criteria**:
- 4 critical user flows have E2E tests
- Tests run in CI/CD pipeline
- Tests are stable (no flakiness)

**Files to Create**:
- `e2e/connector-flow.spec.ts`
- `e2e/memory-browse.spec.ts`
- `e2e/chat-interaction.spec.ts`
- `e2e/insight-feedback.spec.ts`

#### 1.5.4 Configure Coverage Gates
- [ ] Update CI to fail if coverage < 80%
- [ ] Add coverage reporting to PR comments
- [ ] Create coverage badge for README

**Acceptance Criteria**:
- CI fails on coverage drop below 80%
- PR comments show coverage diff
- Badge displays current coverage

**Files to Modify**:
- `.github/workflows/ci.yml`

---

## Task 1.6: Implement Security Headers

**Priority**: P0 (CRITICAL)
**Estimated Time**: 4-6 hours
**Dependencies**: None

### Subtasks

#### 1.6.1 Create Security Headers Middleware
- [ ] Install content-security-policy package
- [ ] Create middleware to add security headers
- [ ] Configure CSP policy for shadcn/ui

**Acceptance Criteria**:
- All responses include security headers
- CSP allows shadcn/ui and Tailwind CDN
- No inline scripts (except strict-dynamic)

**Files to Create**:
- `src/lib/headers.ts`

**Headers to Add**:
- `Content-Security-Policy`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`

#### 1.6.2 Configure CORS
- [ ] Add CORS configuration to middleware
- [ ] Allow only specific origins in production
- [ ] Allow credentials for OAuth

**Acceptance Criteria**:
- CORS restricts origins in production
- Preflight requests handled correctly
- Credentials work with OAuth

**Files to Modify**:
- `src/middleware.ts`

---

## Task 1.7: Add Audit Logging

**Priority**: P1 (HIGH)
**Estimated Time**: 8-12 hours
**Dependencies**: Task 1.1 (Authentication)

### Subtasks

#### 1.7.1 Create Audit Log Model
- [ ] Add `AuditLog` model to Prisma schema
- [ ] Create migration
- [ ] Add indexes for efficient querying

**Prisma Model**:
```prisma
model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  action    String   // CREATE, UPDATE, DELETE
  resource  String   // Connector, Memory, etc.
  resourceId String
  oldValues Json?
  newValues Json?
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([resource])
  @@index([createdAt])
}
```

#### 1.7.2 Create Audit Logging Helper
- [ ] Create `logAudit()` helper function
- [ ] Extract user context from request
- [ ] Capture IP and user agent
- [ ] Serialize old/new values

**Files to Create**:
- `src/lib/audit.ts`

#### 1.7.3 Add Audit Logging to All Mutations
- [ ] Add audit logging to connector CRUD
- [ ] Add audit logging to memory operations
- [ ] Add audit logging to chat operations
- [ ] Add audit logging to settings changes

**Acceptance Criteria**:
- All data mutations are logged
- Logs include user, action, resource, timestamp
- Logs queryable for compliance

---

## Task 1.8: Implement Error Handling

**Priority**: P1 (HIGH)
**Estimated Time**: 6-8 hours
**Dependencies**: None

### Subtasks

#### 1.8.1 Create Standardized Error Classes
- [ ] Create `ApiError` class with error codes
- [ ] Create error subclasses for common cases
- [ ] Add error codes constants

**Files to Create**:
- `src/lib/errors.ts`

**Error Codes**:
- `AUTH_REQUIRED`
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `FORBIDDEN`
- `RATE_LIMIT_EXCEEDED`
- `DATABASE_ERROR`
- `INTERNAL_ERROR`

#### 1.8.2 Create Error Handling Middleware
- [ ] Create error wrapper function
- [ ] Add request ID generation
- [ ] Log errors with context
- [ ] Format error responses consistently

**Acceptance Criteria**:
- All errors return consistent JSON format
- Every error includes unique request ID
- Errors are logged with full context

**Files to Create**:
- `src/lib/error-handler.ts`

#### 1.8.3 Add Error Tracking (Sentry)
- [ ] Install Sentry SDK
- [ ] Configure Sentry with DSN
- [ ] Add Sentry to error middleware
- [ ] Test error reporting

**Packages to Install**:
```bash
npm install @sentry/nextjs
```

---

## Task 1.9: Update CI/CD Pipeline

**Priority**: P1 (HIGH)
**Estimated Time**: 4-6 hours
**Dependencies**: Task 1.5 (Testing)

### Subtasks

#### 1.9.1 Add Security Scanning to CI
- [ ] Add npm audit step
- [ ] Add Snyk or Dependabot scan
- [ ] Fail build on high-severity vulnerabilities

**Files to Modify**:
- `.github/workflows/ci.yml`

#### 1.9.2 Add Automated Deployment
- [ ] Create Railway deployment workflow
- [ ] Deploy on merge to main
- [ ] Run migrations before deployment
- [ ] Health check verification after deploy

**Files to Create**:
- `.github/workflows/deploy.yml`

---

## Task 1.10: Create Security Runbook

**Priority**: P1 (HIGH)
**Estimated Time**: 4-6 hours
**Dependencies**: All previous tasks

### Subtasks

#### 1.10.1 Document Security Procedures
- [ ] Create incident response procedures
- [ ] Document security incident escalation
- [ ] Create security checklists for deployment
- [ ] Document user data request procedures (GDPR)

**Files to Create**:
- `docs/SECURITY_RUNBOOK.md`
- `docs/INCIDENT_RESPONSE.md`
- `docs/GDPR_COMPLIANCE.md`

---

## Phase 1 Completion Criteria

**DO NOT DEPLOY TO PRODUCTION until ALL of the following are complete:**

- [ ] All API routes require authentication
- [ ] All inputs validated with Zod schemas
- [ ] Rate limiting implemented on all endpoints
- [ ] Test coverage ≥ 80%
- [ ] Security headers configured
- [ ] Audit logging implemented
- [ ] Error handling standardized
- [ ] CI/CD includes security scanning
- [ ] `.env` permissions set to 600
- [ ] Environment variables validated on startup
- [ ] Health check verifies all dependencies
- [ ] Railway deployment stable (no 502 errors)
- [ ] Security runbook created
- [ ] Team trained on security procedures

---

## Phase 1 Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Authentication Coverage | 100% | 0% |
| Input Validation Coverage | 100% | 5% |
| Test Coverage | ≥80% | <5% |
| API Rate Limiting | 100% | 0% |
| Security Headers | 100% | 0% |
| Audit Logging | 100% | 0% |
| CI/CD Security Scanning | Enabled | Partial |

---

## Next Steps After Phase 1

Once Phase 1 is complete, proceed to:

**Phase 2: Production Hardening** (Weeks 3-4)
- Performance optimization
- Caching strategy
- Database indexing
- Enhanced monitoring

**Phase 3: Operational Excellence** (Weeks 5-6)
- APM monitoring
- Deployment automation
- Disaster recovery procedures

**Phase 4: Compliance & Optimization** (Weeks 7-8)
- GDPR compliance
- API versioning
- Advanced performance tuning
