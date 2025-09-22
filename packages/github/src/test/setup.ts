import { vi } from 'vitest';
import { beforeEach, afterEach } from 'vitest';

// Mock environment variables for tests
process.env.GITHUB_CLIENT_ID = 'test-github-client-id';
process.env.GITHUB_CLIENT_SECRET = 'test-github-client-secret';
process.env.GITHUB_WEBHOOK_SECRET = 'test-webhook-secret';
process.env.NODE_ENV = 'test';

// Global test utilities
global.describe = describe;
global.it = it;
global.test = test;
global.expect = expect;
global.vi = vi;

// Mock console methods to reduce noise
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
};

// Mock fetch for GitHub API calls
global.fetch = vi.fn();

// Setup test timeout
vi.setConfig({
  testTimeout: 10000,
  hookTimeout: 10000,
});

// Mock Better Auth
vi.mock('better-auth', () => ({
  betterAuth: vi.fn().mockReturnValue({
    baseURL: 'http://localhost:3000',
    api: {
      handleOAuthCallback: vi.fn(),
      refreshAccessToken: vi.fn(),
      createSession: vi.fn(),
      getSession: vi.fn(),
      revokeSession: vi.fn(),
    },
    handler: vi.fn(),
  }),
}));

// Mock GitHub API client
vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn().mockImplementation(() => ({
    auth: vi.fn(),
    rest: {
      users: {
        getAuthenticated: vi.fn(),
      },
      repos: {
        list: vi.fn(),
      },
      pulls: {
        list: vi.fn(),
        create: vi.fn(),
      },
      issues: {
        list: vi.fn(),
        create: vi.fn(),
      },
    },
  })),
}));

// Mock webhook handler
vi.mock('@octokit/webhooks', () => ({
  Webhooks: vi.fn().mockImplementation(() => ({
    sign: vi.fn().mockReturnValue('test-signature'),
    verify: vi.fn().mockReturnValue(true),
    on: vi.fn(),
    receive: vi.fn(),
  })),
}));

// Before each test hook
beforeEach(() => {
  // Clear all mocks
  vi.clearAllMocks();

  // Reset fetch mock
  (fetch as any).mockClear();
});

// After each test hook
afterEach(() => {
  // Cleanup if needed
});

// Mock GitHub API responses
export const mockGitHubResponses = {
  user: {
    login: 'testuser',
    id: 12345,
    email: 'test@example.com',
    name: 'Test User',
    avatar_url: 'https://github.com/avatar.jpg',
  },
  repos: [
    {
      id: 1,
      name: 'test-repo',
      full_name: 'testuser/test-repo',
      private: false,
      owner: {
        login: 'testuser',
      },
    },
  ],
  pulls: [
    {
      id: 1,
      number: 1,
      title: 'Test PR',
      state: 'open',
      user: {
        login: 'testuser',
      },
    },
  ],
  issues: [
    {
      id: 1,
      number: 1,
      title: 'Test Issue',
      state: 'open',
      user: {
        login: 'testuser',
      },
    },
  ],
};

// Test helpers
export const createMockGitHubEvent = (type: string, action: string, data: any) => ({
  id: 'test-event-id',
  type,
  action,
  repository: {
    id: 123,
    name: 'test-repo',
    full_name: 'testuser/test-repo',
    private: false,
    owner: {
      login: 'testuser',
    },
  },
  sender: {
    login: 'testuser',
    id: 12345,
  },
  ...data,
});

// OAuth test helpers
export const oauthTestHelpers = {
  createMockOAuthResponse: () => ({
    access_token: 'github-access-token',
    token_type: 'bearer',
    scope: 'repo,user:email',
    refresh_token: 'github-refresh-token',
    expires_in: 3600,
  }),

  createMockUserResponse: () => ({
    id: 12345,
    login: 'testuser',
    email: 'test@example.com',
    name: 'Test User',
    avatar_url: 'https://github.com/avatar.jpg',
  }),

  createMockWebhookEvent: (event: string, payload: any) => ({
    id: '12345',
    'X-GitHub-Event': event,
    'X-GitHub-Delivery': 'test-delivery-id',
    'X-Hub-Signature': 'sha1=test-signature',
    action: 'opened',
    repository: {
      id: 123,
      name: 'test-repo',
      full_name: 'testuser/test-repo',
    },
    payload,
  }),
};

// Security test helpers
export const securityTestHelpers = {
  // Common security test scenarios
  scenarios: {
    sqlInjection: [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "1; DROP TABLE users; --",
    ],
    xss: [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '"><script>alert("xss")</script>',
    ],
    pathTraversal: [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
    ],
  },

  // Token validation
  validateToken: (token: string) => {
    // Basic token format validation
    return /^[a-zA-Z0-9_\-]{20,}$/.test(token);
  },

  // Scope validation
  validateScopes: (tokenScopes: string[], requiredScopes: string[]) => {
    return requiredScopes.every(scope => tokenScopes.includes(scope));
  },
};

// Rate limiting test helpers
export const rateLimitTestHelpers = {
  // Simulate rate limit response
  createRateLimitResponse: (remaining: number, limit: number) => ({
    headers: {
      'x-ratelimit-remaining': remaining.toString(),
      'x-ratelimit-limit': limit.toString(),
      'x-ratelimit-reset': Math.floor(Date.now() / 1000 + 3600).toString(),
    },
  }),

  // Check if rate limited
  isRateLimited: (response: any) => {
    return response.status === 403 &&
           response.headers?.['x-ratelimit-remaining'] === '0';
  },
};

// Export all test utilities
export const testUtils = {
  mockGitHubResponses,
  createMockGitHubEvent,
  oauthTestHelpers,
  securityTestHelpers,
  rateLimitTestHelpers,
};