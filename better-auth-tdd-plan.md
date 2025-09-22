# Better Auth Integration TDD Plan for Cortex-OS

## Overview

This document outlines a comprehensive Test-Driven Development (TDD) plan for implementing Better Auth integration into Cortex-OS. The plan follows the Red-Green-Refactor cycle and ensures robust, well-tested authentication features.

## TDD Phases

### Phase 0: Test Infrastructure Setup (Week 1)
- Configure test environment
- Create test utilities and helpers
- Set up mock databases and services
- Establish test coverage goals

### Phase 1: High Priority Components (Weeks 2-7)
- `apps/cortex-webui` - Web UI authentication
- `apps/api` - API Gateway authentication
- `packages/github` - GitHub OAuth integration

### Phase 2: Medium Priority Components (Weeks 8-13)
- `packages/mcp` - MCP server authentication
- `apps/cortex-py` - Python workflow authentication (optional)

### Phase 3: Integration & Migration (Weeks 14-16)
- End-to-end testing
- Migration compatibility testing
- Performance and security testing
- Documentation and final validation

## Test Infrastructure Requirements

### Testing Framework Stack
```typescript
// Primary Testing Stack
- Vitest: Unit and integration tests
- Testing Library: Component testing
- Playwright: E2E testing
- MSW: API mocking
- Supertest: HTTP assertions
- @better-auth/testing: Better Auth test utilities
```

### Test Configuration
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      }
    }
  }
})
```

## Test Requirements & Specifications

### Core Authentication Features to Test

#### 1. Authentication Methods
```typescript
// Test Suite: Authentication Methods
describe('Authentication Methods', () => {
  // Email & Password
  test('user can register with email and password')
  test('user can login with email and password')
  test('password validation works correctly')
  test('password reset flow works')

  // OAuth Providers
  test('Google OAuth integration')
  test('GitHub OAuth integration')
  test('OAuth token refresh mechanism')

  // Modern Auth Methods
  test('magic link authentication')
  test('passkey/WebAuthn authentication')
  test('TOTP two-factor authentication')
})
```

#### 2. Session Management
```typescript
// Test Suite: Session Management
describe('Session Management', () => {
  test('session creation on successful login')
  test('session validation middleware')
  test('session expiration and refresh')
  test('multiple session handling')
  test('session invalidation on logout')
  test('cross-tab session synchronization')
})
```

#### 3. Security Features
```typescript
// Test Suite: Security Features
describe('Security Features', () => {
  test('rate limiting prevents brute force attacks')
  test('CSRF protection works')
  test('password breach detection')
  test('CAPTCHA integration')
  test('secure cookie handling')
  test('XSS prevention measures')
})
```

## Phase 1: High Priority Test Cases

### 1.1 Cortex-WebUI Authentication Tests

#### Unit Tests
```typescript
// __tests__/components/auth/LoginForm.test.tsx
describe('LoginForm', () => {
  test('renders email and password fields', () => {
    render(<LoginForm />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  test('validates email format', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.type(screen.getByLabelText(/email/i), 'invalid-email')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
  })

  test('handles successful login', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    // Mock successful auth
    mockAuth.signIn.mockResolvedValue({ success: true })

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(mockAuth.signIn).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    })
  })
})

// __tests__/components/auth/ OAuthButton.test.tsx
describe('OAuthButton', () => {
  const providers = ['google', 'github', 'discord']

  providers.forEach(provider => {
    test(`redirects to ${provider} OAuth`, () => {
      render(<OAuthButton provider={provider} />)
      fireEvent.click(screen.getByRole('button'))

      expect(window.location.href).toContain(`/auth/${provider}`)
    })
  })
})
```

#### Integration Tests
```typescript
// __tests__/integration/auth/auth-flow.test.ts
describe('Authentication Flow Integration', () => {
  test('complete registration to login flow', async () => {
    // Setup test database
    const { db } = await createTestDatabase()

    // 1. Register user
    const registerResponse = await request(app)
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User'
      })

    expect(registerResponse.status).toBe(201)
    expect(registerResponse.body.user).toBeDefined()

    // 2. Verify email (mock email service)
    await verifyEmail(db, 'test@example.com')

    // 3. Login with credentials
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123!'
      })

    expect(loginResponse.status).toBe(200)
    expect(loginResponse.body.session).toBeDefined()

    // 4. Access protected route
    const protectedResponse = await request(app)
      .get('/api/user/profile')
      .set('Cookie', loginResponse.headers['set-cookie'])

    expect(protectedResponse.status).toBe(200)
    expect(protectedResponse.body.user.email).toBe('test@example.com')
  })
})
```

#### E2E Tests
```typescript
// e2e/auth/auth-flow.spec.ts
describe('Authentication E2E', () => {
  test('user can register and access dashboard', async ({ page }) => {
    // Navigate to registration
    await page.goto('/auth/register')

    // Fill registration form
    await page.fill('[data-testid="email"]', 'e2e@test.com')
    await page.fill('[data-testid="password"]', 'TestPass123!')
    await page.fill('[data-testid="name"]', 'E2E User')
    await page.click('[data-testid="register-button"]')

    // Verify redirect to verification page
    await expect(page).toHaveURL('/auth/verify-email')

    // Mock email verification (in test environment)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('emailVerified'))
    })

    // Navigate to login
    await page.goto('/auth/login')

    // Login with new credentials
    await page.fill('[data-testid="email"]', 'e2e@test.com')
    await page.fill('[data-testid="password"]', 'TestPass123!')
    await page.click('[data-testid="login-button"]')

    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('OAuth login flow with GitHub', async ({ page }) => {
    await page.goto('/auth/login')
    await page.click('[data-testid="oauth-github"]')

    // Mock OAuth callback
    await page.route('**/auth/github/callback', (route) => {
      route.fulfill({
        status: 302,
        headers: { location: '/dashboard' }
      })
    })

    await expect(page).toHaveURL('/dashboard')
  })
})
```

### 1.2 API Gateway Authentication Tests

#### Middleware Tests
```typescript
// __tests__/middleware/auth.test.ts
describe('Authentication Middleware', () => {
  let app: Express
  let betterAuth: BetterAuth

  beforeEach(() => {
    betterAuth = createBetterAuth({
      database: createTestDatabase(),
      plugins: [oauth(), session()]
    })

    app = express()
    app.use(betterAuth.handler)
    app.use('/api', authMiddleware(betterAuth))
  })

  test('blocks unauthenticated requests', async () => {
    const response = await request(app)
      .get('/api/protected')

    expect(response.status).toBe(401)
  })

  test('allows authenticated requests', async () => {
    // Create session
    const session = await createTestSession(betterAuth)

    const response = await request(app)
      .get('/api/protected')
      .set('Authorization', `Bearer ${session.token}`)

    expect(response.status).toBe(200)
  })

  test('validates session on each request', async () => {
    const session = await createTestSession(betterAuth)

    // Invalidate session
    await betterAuth.invalidateSession(session.id)

    const response = await request(app)
      .get('/api/protected')
      .set('Authorization', `Bearer ${session.token}`)

    expect(response.status).toBe(401)
  })
})
```

#### API Route Tests
```typescript
// __tests__/routes/auth.test.ts
describe('Auth Routes', () => {
  test('POST /auth/register creates new user', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        name: 'New User'
      })

    expect(response.status).toBe(201)
    expect(response.body.user.email).toBe('newuser@example.com')
    expect(response.body.user.passwordHash).toBeUndefined()
  })

  test('POST /auth/login returns session token', async () => {
    // Create user first
    await createUser({
      email: 'login@example.com',
      password: await hashPassword('LoginPass123!')
    })

    const response = await request(app)
      .post('/auth/login')
      .send({
        email: 'login@example.com',
        password: 'LoginPass123!'
      })

    expect(response.status).toBe(200)
    expect(response.body.session.token).toBeDefined()
  })
})
```

### 1.3 GitHub Package Authentication Tests

```typescript
// __tests__/packages/github/oauth.test.ts
describe('GitHub OAuth Integration', () => {
  let githubAuth: GitHubAuth

  beforeEach(() => {
    githubAuth = new GitHubAuth({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      callbackUrl: 'http://localhost:3000/auth/github/callback'
    })
  })

  test('generates correct OAuth URL', () => {
    const url = githubAuth.getAuthUrl({
      state: 'test-state',
      scopes: ['repo', 'user']
    })

    expect(url).toContain('github.com/oauth/authorize')
    expect(url).toContain('client_id=test-client-id')
    expect(url).toContain('scope=repo+user')
  })

  test('exchanges code for access token', async () => {
    // Mock GitHub API response
    mockGitHub.post('/login/oauth/access_token').reply(200, {
      access_token: 'gho_test-token',
      token_type: 'bearer',
      scope: 'repo,user'
    })

    const token = await githubAuth.exchangeCodeForToken('test-code')

    expect(token).toBe('gho_test-token')
  })

  test('validates token with GitHub API', async () => {
    mockGitHub.get('/user').reply(200, {
      login: 'testuser',
      id: 12345,
      email: 'testuser@example.com'
    })

    const userInfo = await githubAuth.validateToken('gho_test-token')

    expect(userInfo.login).toBe('testuser')
    expect(userInfo.id).toBe(12345)
  })
})
```

## Phase 2: Medium Priority Test Cases

### 2.1 MCP Server Authentication Tests

```python
# tests/test_auth.py
import pytest
from unittest.mock import AsyncMock, patch
from mcp_server.auth.jwt_auth import JWTAuth

class TestJWTAuth:
    @pytest.fixture
    def auth(self):
        return JWTAuth(secret_key="test-secret")

    @pytest.mark.asyncio
    async def test_token_validation(self, auth):
        # Test valid token
        token = auth.create_token({"user_id": "test-user"})
        payload = await auth.validate_token(token)
        assert payload["user_id"] == "test-user"

    @pytest.mark.asyncio
    async def test_invalid_token(self, auth):
        with pytest.raises(HTTPException) as exc:
            await auth.validate_token("invalid-token")
        assert exc.value.status_code == 401

    @pytest.mark.asyncio
    async def test_token_expiry(self, auth):
        # Create expired token
        token = auth.create_token(
            {"user_id": "test-user"},
            expires_delta=-timedelta(hours=1)
        )

        with pytest.raises(HTTPException) as exc:
            await auth.validate_token(token)
        assert exc.value.status_code == 401

    @pytest.mark.asyncio
    async def test_static_token_fallback(self, auth):
        # Test when JWT library is unavailable
        with patch.object(auth, 'jwt_available', False):
            token = "static-test-token"
            auth.static_token = token

            # Should validate static token
            result = await auth.validate_token(token)
            assert result == {"valid": True}
```

### 2.2 Python Workflow Authentication Tests

```python
# tests/workflows/test_auth_integration.py
import pytest
from cortex_py.workflows import WorkflowAuth
from cortex_py.auth import BetterAuthClient

class TestWorkflowAuth:
    @pytest.fixture
    def auth_client(self):
        return BetterAuthClient(
            base_url="http://localhost:3000",
            api_key="test-api-key"
        )

    @pytest.mark.asyncio
    async def test_workflow_authentication(self, auth_client):
        # Test workflow can authenticate with Better Auth
        workflow = WorkflowAuth(auth_client=auth_client)

        # Simulate workflow execution
        auth_result = await workflow.authenticate({
            workflow_id: "test-workflow",
            permissions: ["read:documents"]
        })

        assert auth_result["authenticated"] is True
        assert "access_token" in auth_result
```

## Integration Testing Strategy

### 1. Database Integration Tests
```typescript
// __tests__/integration/database/auth-queries.test.ts
describe('Database Integration', () => {
  let db: Database
  let betterAuth: BetterAuth

  beforeAll(async () => {
    db = await createTestDatabase()
    betterAuth = createBetterAuth({ database: db })
  })

  test('user creation and retrieval', async () => {
    const user = await betterAuth.createUser({
      email: 'dbtest@example.com',
      password: 'DBTest123!',
      name: 'DB Test User'
    })

    const retrieved = await betterAuth.getUserById(user.id)

    expect(retrieved.email).toBe('dbtest@example.com')
    expect(retrieved.passwordHash).toBeUndefined()
  })

  test('session persistence', async () => {
    const session = await betterAuth.createSession('test-user-id')

    // Verify session exists in database
    const dbSession = await db.session.findUnique({
      where: { id: session.id }
    })

    expect(dbSession).toBeTruthy()
    expect(dbSession.userId).toBe('test-user-id')
  })
})
```

### 2. Event System Integration Tests
```typescript
// __tests__/integration/events/auth-events.test.ts
describe('Auth Event Integration', () => {
  let eventBus: EventBus
  let betterAuth: BetterAuth

  beforeEach(() => {
    eventBus = new EventBus()
    betterAuth = createBetterAuth({
      plugins: [
        eventPlugin(eventBus)
      ]
    })
  })

  test('emits user registration event', async () => {
    const eventSpy = vi.fn()
    eventBus.on('user.registered', eventSpy)

    await betterAuth.register({
      email: 'eventtest@example.com',
      password: 'EventTest123!'
    })

    expect(eventSpy).toHaveBeenCalledWith({
      type: 'user.registered',
      data: {
        email: 'eventtest@example.com',
        timestamp: expect.any(Date)
      }
    })
  })

  test('emits session events', async () => {
    const sessionSpy = vi.fn()
    eventBus.on('session.created', sessionSpy)

    await betterAuth.createSession('user-id')

    expect(sessionSpy).toHaveBeenCalled()
  })
})
```

## Migration Testing Plan

### 1. Backward Compatibility Tests
```typescript
// __tests__/migration/compatibility.test.ts
describe('Migration Compatibility', () => {
  test('existing JWT tokens work during transition', async () => {
    // Create legacy JWT token
    const legacyToken = createLegacyJWT({ userId: 'legacy-user' })

    // Should be accepted by new system
    const result = await betterAuth.validateLegacyToken(legacyToken)

    expect(result.valid).toBe(true)
    expect(result.userId).toBe('legacy-user')
  })

  test('password hash migration', async () => {
    // Create user with old bcrypt hash
    const legacyHash = await bcrypt.hash('old-password', 10)

    // Should migrate to new format on login
    const user = await migratePasswordHash({
      email: 'legacy@example.com',
      passwordHash: legacyHash
    })

    expect(user.hashVersion).toBe('v2')
  })
})
```

### 2. Data Migration Tests
```typescript
// __tests__/migration/data-migration.test.ts
describe('Data Migration', () => {
  test('migrates user accounts', async () => {
    // Setup old database with test data
    const oldDb = await createOldDatabase()
    await oldDb.user.create({
      data: {
        email: 'migrate@example.com',
        password: bcrypt.hashSync('old-pass', 10)
      }
    })

    // Run migration
    await migrateUserData(oldDb, newDb)

    // Verify data in new database
    const newUser = await newDb.user.findUnique({
      where: { email: 'migrate@example.com' }
    })

    expect(newUser).toBeTruthy()
    expect(newUser.emailVerified).toBe(false) // Default value
  })
})
```

## Performance & Security Testing

### 1. Performance Tests
```typescript
// __tests__/performance/auth-benchmarks.test.ts
describe('Authentication Performance', () => {
  test('login response time under 500ms', async () => {
    const start = Date.now()

    await request(app)
      .post('/auth/login')
      .send({
        email: 'perf@example.com',
        password: 'PerfTest123!'
      })

    const duration = Date.now() - start
    expect(duration).toBeLessThan(500)
  })

  test('handles 100 concurrent logins', async () => {
    const promises = Array(100).fill(0).map(() =>
      request(app)
        .post('/auth/login')
        .send({
          email: `user-${Math.random()}@example.com`,
          password: 'Concurrent123!'
        })
    )

    const results = await Promise.all(promises)
    const successRate = results.filter(r => r.status === 200).length / results.length

    expect(successRate).toBeGreaterThan(0.95)
  })
})
```

### 2. Security Tests
```typescript
// __tests__/security/auth-security.test.ts
describe('Authentication Security', () => {
  test('prevents SQL injection', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: "'; DROP TABLE users; --",
        password: 'anything'
      })

    expect(response.status).toBe(400)
  })

  test('rate limiting works', async () => {
    const promises = Array(11).fill(0).map(() =>
      request(app)
        .post('/auth/login')
        .send({
          email: 'rate@example.com',
          password: 'wrong-password'
        })
    )

    const results = await Promise.all(promises)
    const lastResponse = results[results.length - 1]

    expect(lastResponse.status).toBe(429)
  })

  test('secure cookie attributes', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: 'secure@example.com',
        password: 'SecurePass123!'
      })

    const setCookie = response.headers['set-cookie'][0]
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('Secure')
    expect(setCookie).toContain('SameSite=Strict')
  })
})
```

## Test Infrastructure Setup

### 1. Test Database Setup
```typescript
// src/test/database.ts
export const createTestDatabase = async () => {
  const db = new PrismaClient({
    datasources: {
      db: {
        url: 'file:./test.db'
      }
    }
  })

  // Run migrations
  await db.$executeRawUnsafe('PRAGMA foreign_keys = OFF')
  await db.$executeRawUnsafe('DROP TABLE IF EXISTS "user"')
  await db.$executeRawUnsafe('DROP TABLE IF EXISTS "session"')
  await db.$executeRawUnsafe('DROP TABLE IF EXISTS "account"')
  await db.$executeRawUnsafe('PRAGMA foreign_keys = ON')

  // Run test migrations
  await runTestMigrations(db)

  return db
}
```

### 2. Test Utilities
```typescript
// src/test/utils.ts
export const createTestUser = async (betterAuth: BetterAuth, overrides = {}) => {
  return betterAuth.createUser({
    email: `test-${Math.random()}@example.com`,
    password: 'TestPass123!',
    name: 'Test User',
    ...overrides
  })
}

export const createTestSession = async (betterAuth: BetterAuth, userId: string) => {
  return betterAuth.createSession(userId, {
    userAgent: 'test-agent',
    ipAddress: '127.0.0.1'
  })
}

export const mockEmailService = () => {
  return {
    sendVerificationEmail: vi.fn().mockResolvedValue(true),
    sendPasswordReset: vi.fn().mockResolvedValue(true),
    sendMagicLink: vi.fn().mockResolvedValue(true)
  }
}
```

### 3. Test Configuration
```typescript
// src/test/setup.ts
import { vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Setup global test utilities
global.testHelpers = {
  createTestUser,
  createTestSession,
  mockEmailService
}

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'file:./test.db'
process.env.BETTER_AUTH_SECRET = 'test-secret'
process.env.GITHUB_CLIENT_ID = 'test-github-client'
process.env.GITHUB_CLIENT_SECRET = 'test-github-secret'

// Setup after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
```

## Test Execution Strategy

### 1. Test Categories
```bash
# Run unit tests
pnpm test:unit

# Run integration tests
pnpm test:integration

# Run E2E tests
pnpm test:e2e

# Run security tests
pnpm test:security

# Run performance tests
pnpm test:performance

# Run all tests with coverage
pnpm test:coverage
```

### 2. CI/CD Pipeline
```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18, 20]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run unit tests
        run: pnpm test:unit

      - name: Run integration tests
        run: pnpm test:integration

      - name: Run E2E tests
        run: pnpm test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

## Success Criteria

### 1. Test Coverage Requirements
- **Minimum 90% coverage** for all auth-related code
- **100% coverage** for critical security paths
- **Integration tests** for all auth flows
- **E2E tests** for all user journeys

### 2. Quality Gates
- All tests must pass
- No security vulnerabilities
- Performance benchmarks met
- Accessibility compliance
- Type safety enforced

### 3. Migration Success Criteria
- Zero downtime during migration
- All existing users can log in
- No data loss during migration
- New auth features functional
- Performance metrics maintained or improved

This TDD plan ensures a robust, well-tested Better Auth integration that maintains high security standards while providing excellent developer experience.