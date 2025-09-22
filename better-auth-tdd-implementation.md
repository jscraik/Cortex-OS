# Better Auth TDD Implementation Guide

This document outlines the Test-Driven Development (TDD) implementation of Better Auth integration in Cortex-OS.

## Implementation Status

✅ **Phase 0: Test Infrastructure Setup** - Completed
- Added Better Auth dependencies to cortex-webui
- Created test database configuration
- Implemented test utilities and helpers
- Created Better Auth configuration for tests
- Set up test files for cortex-webui
- Set up test files for GitHub package

## What's Been Implemented

### 1. Dependencies Added

#### Cortex-WebUI Backend
```json
{
  "dependencies": {
    "better-auth": "^1.1.16",
    "drizzle-orm": "^0.39.0"
  },
  "devDependencies": {
    "@better-auth/testing": "^1.1.16",
    "@testing-library/jest-dom": "^6.8.0",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "jsdom": "^26.1.0"
  }
}
```

#### Cortex-WebUI Frontend
```json
{
  "dependencies": {
    "@better-auth/react": "^1.1.16"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.8.0",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "jsdom": "^26.1.0"
  }
}
```

### 2. Test Infrastructure

#### Database Schema (`src/db/schema.ts`)
- User table with email verification
- Session table with token management
- Account table for OAuth providers
- Verification table for email/password reset

#### Test Database (`src/test/database.ts`)
- In-memory SQLite database for tests
- Drizzle ORM integration
- Database migration helpers
- Test data seeding utilities

#### Test Utilities (`src/test/utils.ts`)
- Mock user and session creation
- OAuth response mocking
- Security test helpers
- Performance test helpers
- JWT test utilities

#### Better Auth Configuration (`src/test/auth-config.ts`)
- Test-specific Better Auth instance
- OAuth provider configuration
- Plugin setup (bearer, organization, passkey, 2FA, magic link)
- Mock email service

### 3. Test Files Created

#### Authentication Methods Tests (`src/__tests__/auth/auth-methods.test.ts`)
- Email & password registration/login
- Session management
- OAuth authentication
- Password reset flow
- Security features (rate limiting, CSRF)

#### Integration Tests (`src/__tests__/integration/auth-flow.test.ts`)
- Complete user registration flow
- Session management across requests
- OAuth integration flow
- Password reset flow
- Cross-platform session management

#### GitHub OAuth Tests (`packages/github/src/test/github-oauth.test.ts`)
- OAuth URL generation
- OAuth flow handling
- Token management
- GitHub integration events
- API client integration
- Error handling and security

### 4. Test Configuration

#### Vitest Configuration
- Coverage thresholds: 90% minimum
- Test environment setup
- Path aliases for imports
- Reporter configuration

#### Test Setup Files
- Environment variable mocking
- Global test utilities
- Fetch and GitHub API mocking
- Security test helpers

## Next Steps

### Phase 1: Implementation (Weeks 2-7)

1. **Implement Better Auth in Cortex-WebUI Backend**
   - Replace existing JWT system
   - Set up database adapters
   - Configure OAuth providers
   - Implement session management

2. **Create Authentication API Endpoints**
   - `/api/auth/register`
   - `/api/auth/login`
   - `/api/auth/logout`
   - `/api/auth/session`
   - `/api/auth/forgot-password`
   - `/api/auth/reset-password`
   - OAuth callback endpoints

3. **Update Frontend Authentication**
   - Replace current auth components
   - Integrate @better-auth/react
   - Implement OAuth login buttons
   - Handle session state

4. **GitHub Package Integration**
   - Update GitHub OAuth handler
   - Implement token management
   - Add event emission for GitHub connections

### Phase 2: MCP Server Integration (Weeks 8-13)

1. **Update MCP Authentication**
   - Integrate Better Auth with Python MCP server
   - Maintain backward compatibility
   - Add JWT validation

2. **Cortex-Py Integration (Optional)**
   - Add Better Auth client for Python workflows
   - Centralized credential management

## Running Tests

```bash
# Install dependencies
pnpm install

# Run tests for cortex-webui
cd apps/cortex-webui
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test src/__tests__/auth/auth-methods.test.ts

# Run GitHub package tests
cd packages/github
pnpm test
```

## Test Coverage Goals

- **Minimum 90% coverage** for all auth-related code
- **100% coverage** for critical security paths
- Integration tests for all auth flows
- E2E tests for user journeys

## Security Considerations

1. **Environment Variables**
   - All secrets should be in environment variables
   - Test secrets are mocked, never real values

2. **Token Security**
   - JWT tokens properly signed and verified
   - Secure cookie attributes
   - Token expiration and refresh

3. **OAuth Security**
   - State parameter validation
   - PKCE implementation (recommended)
   - Scope validation

4. **Rate Limiting**
   - Login attempts limited
   - API calls rate limited
   - IP-based restrictions

## Migration Strategy

1. **Parallel Implementation**
   - Keep existing auth system running
   - Implement Better Auth side-by-side
   - Feature flags for gradual rollout

2. **Data Migration**
   - Migrate user accounts with password hashes
   - Maintain session continuity
   - Zero downtime migration

3. **Backward Compatibility**
   - Existing tokens remain valid during transition
   - API contracts maintained where possible
   - Graceful fallback for failed migrations

## Performance Considerations

1. **Database Optimization**
   - Proper indexing on auth tables
   - Query optimization for session lookups
   - Connection pooling

2. **Caching Strategy**
   - Session caching
   - Rate limiting cache
   - OAuth token caching

3. **Monitoring**
   - Auth success/failure metrics
   - Performance monitoring
   - Security event logging

This TDD implementation ensures robust, well-tested authentication that meets enterprise security requirements while providing excellent developer experience.