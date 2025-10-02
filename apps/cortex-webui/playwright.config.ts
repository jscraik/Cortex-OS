import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const ROOT = fileURLToPath(new URL('.', import.meta.url));

/**
 * brAInwav Cortex-OS E2E Testing Configuration
 *
 * Comprehensive E2E testing framework for cortex-webui
 * Features:
 * - Multi-browser testing (Chrome, Firefox, Safari, Edge)
 * - Mobile and desktop responsive testing
 * - Accessibility testing with axe-core
 * - Visual regression testing
 * - Performance monitoring
 * - Mock service worker integration
 * - Database seeding and cleanup
 * - Docker compose test environment
 * - brAInwav branded reporting
 */
export default defineConfig({
  testDir: './tests',

  // Run tests in parallel across multiple workers
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration with brAInwav branding
  reporter: [
    ['html', {
      outputFolder: 'playwright-report',
      open: process.env.CI ? 'never' : 'on-failure',
      host: 'localhost',
      port: 9323
    }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['./tests/support/test-reporter.ts'], // Custom brAInwav reporter
    ['line'], // Console output
    ['list'] // Test list
  ],

  // Global test configuration
  use: {
    // Base URL for tests - can be overridden via environment
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Take screenshot on failure
    screenshot: 'only-on-failure',

    // Record video on failure
    video: 'retain-on-failure',

    // Global timeout for each test
    actionTimeout: 10000,
    navigationTimeout: 30000,

    // Ignore HTTPS errors for local development
    ignoreHTTPSErrors: !process.env.CI,

    // User agent with brAInwav identification
    userAgent: 'brAInwav-Cortex-OS-E2E-Tests/1.0.0',

    // Extra HTTP headers for brAInwav branding
    extraHTTPHeaders: {
      'X-Test-Environment': 'brAInwav-Cortex-OS',
      'X-Test-Client': 'Playwright-E2E'
    }
  },

  // Configure projects for major browsers
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        contextOptions: {
          permissions: ['clipboard-read', 'clipboard-write']
        }
      },
      testMatch: '**/e2e/**/*.spec.ts',
      dependencies: ['setup']
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: '**/e2e/**/*.spec.ts',
      dependencies: ['setup']
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: '**/e2e/**/*.spec.ts',
      dependencies: ['setup']
    },

    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: '**/e2e/**/*.mobile.spec.ts',
      dependencies: ['setup']
    },

    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
      testMatch: '**/e2e/**/*.mobile.spec.ts',
      dependencies: ['setup']
    },

    // Accessibility testing
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        // Enable accessibility testing
        contextOptions: {
          bypassCSP: true
        }
      },
      testMatch: '**/a11y/**/*.spec.ts',
      dependencies: ['setup']
    },

    // API testing (headless)
    {
      name: 'api',
      use: {
        ...devices['Desktop Chrome'],
        headless: true
      },
      testMatch: '**/api/**/*.spec.ts',
      dependencies: ['setup']
    },

    // Setup project - runs before other tests
    {
      name: 'setup',
      testMatch: '**/setup/**/*.spec.ts',
      teardown: 'teardown'
    },

    // Teardown project - runs after all tests
    {
      name: 'teardown',
      testMatch: '**/teardown/**/*.spec.ts'
    }
  ],

  // Web server configuration for local development
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe'
  },

  // Global setup and teardown
  globalSetup: resolve(ROOT, 'tests/global-setup.ts'),
  globalTeardown: resolve(ROOT, 'tests/global-teardown.ts'),

  // Test configuration
  expect: {
    // Timeout for expect assertions
    timeout: 5000,

    // Screenshot comparison threshold for visual testing
    toHaveScreenshot: {
      threshold: 0.2,
      animation: true,
      caret: true
    }
  },

  // Output directories
  outputDir: 'test-results',

  // Metadata for brAInwav reporting
  metadata: {
    'Test Suite': 'brAInwav Cortex-OS E2E Tests',
    'Version': '1.0.0',
    'Environment': process.env.NODE_ENV || 'test',
    'Browser': 'All Major Browsers',
    'Device': 'Desktop + Mobile'
  }
});