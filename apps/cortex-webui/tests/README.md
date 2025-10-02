# brAInwav Cortex-OS E2E Testing Framework

## 🧠 Overview

This comprehensive E2E testing framework provides production-grade validation for the brAInwav Cortex-OS web application. Built with Playwright and enhanced with custom brAInwav branding, it ensures the highest quality standards for Autonomous Software Behavior Reasoning (ASBR) runtime functionality.

## ✨ Features

### 🎯 Test Coverage Areas
- **Authentication Flows**: Complete user registration, login, social auth, and session management
- **Document Processing**: File uploads, RAG queries, multimodal content processing
- **Agentic Workflows**: Multi-agent coordination, workflow execution, performance monitoring
- **API Integration**: Complete endpoint validation, security testing, error handling
- **Performance Testing**: Load testing, stress testing, SLO validation
- **Accessibility Testing**: WCAG 2.2 AA compliance, keyboard navigation, screen reader support

### 🌐 Multi-Browser Support
- Chrome/Chromium
- Firefox
- Safari/WebKit
- Edge
- Mobile Chrome
- Mobile Safari

### 📊 Advanced Reporting
- Custom brAInwav-branded HTML reports
- JSON and JUnit XML outputs
- Performance metrics analysis
- Browser compatibility matrix
- Accessibility compliance reports

## 🚀 Quick Start

### Prerequisites
```bash
# Ensure Node.js 18+ and pnpm are installed
node --version
pnpm --version
```

### Installation
```bash
# Install dependencies
pnpm install

# Install Playwright browsers
pnpm test:e2e:install

# Install system dependencies for Playwright
pnpm test:e2e:install-deps
```

### Running Tests

#### All E2E Tests
```bash
# Run all E2E tests
pnpm test:e2e

# Run with UI for debugging
pnpm test:e2e:ui

# Run in debug mode
pnpm test:e2e:debug
```

#### Specific Test Categories
```bash
# Authentication tests
pnpm test:e2e --grep "Authentication"

# Document processing tests
pnpm test:e2e --grep "Document Processing"

# Workflow tests
pnpm test:e2e --grep "Agentic Workflows"

# API tests
pnpm test:e2e --grep "API Integration"

# Accessibility tests
pnpm test:e2e --grep "Accessibility"
```

#### Performance Tests
```bash
# Run performance load tests
pnpm test:performance

# Run with specific load profile
BASE_URL=http://localhost:3000 API_URL=http://localhost:3001/api pnpm test:performance
```

## 🏗️ Test Architecture

### Directory Structure
```
tests/
├── e2e/                    # End-to-end tests
│   ├── auth-flows.spec.ts
│   ├── document-processing.spec.ts
│   └── agentic-workflows.spec.ts
├── api/                    # API integration tests
│   └── api-integration.ts
├── a11y/                   # Accessibility tests
│   └── accessibility.spec.ts
├── performance/            # Performance tests
│   └── load-test.js
├── support/                # Test utilities
│   ├── test-database.ts
│   ├── mock-services.ts
│   └── test-reporter.ts
├── setup/                  # Environment setup
│   └── test-environment.spec.ts
├── teardown/               # Environment cleanup
│   └── cleanup.spec.ts
├── fixtures/               # Test data
│   └── sample-document.pdf
└── mocks/                  # Mock services
    ├── ai-service/
    └── file-service/
```

### Test Environment Setup

The framework uses a comprehensive test environment with:

#### Docker Compose Test Environment
```bash
# Start test environment
docker compose -f docker-compose.test.yml up -d

# Stop test environment
docker compose -f docker-compose.test.yml down
```

#### Services Included
- **Test Database**: SQLite with seeded test data
- **Redis**: Session management and caching
- **Local Memory Service**: Mock AI memory service
- **Mock AI Service**: Simulates AI model responses
- **Mock File Service**: Handles file processing workflows

## 📝 Test Examples

### Authentication Flow Test
```typescript
test('should login existing user successfully', async ({ page }) => {
  const testUsers = testDb.getTestUsers();

  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', testUsers.regularUser.email);
  await page.fill('[data-testid="password-input"]', testUsers.regularUser.password);
  await page.click('[data-testid="login-submit-button"]');

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
});
```

### Document Processing Test
```typescript
test('should upload PDF document successfully', async ({ page }) => {
  await page.goto('/documents');
  await page.click('[data-testid="upload-document-button"]');

  await page.setInputFiles('[data-testid="file-input"]', {
    name: 'test-document.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('Mock PDF content for brAInwav testing')
  });

  await expect(page.locator('[data-testid="processing-complete"]')).toBeVisible();
});
```

### API Integration Test
```typescript
test('POST /documents - should upload document', async ({ request }) => {
  const response = await request.post('/documents', {
    data: {
      title: 'brAInwav API Test Document',
      content: 'Test content for brAInwav Cortex-OS API testing.',
      tags: ['api-test', 'brainwav']
    }
  });

  expect(response.status()).toBe(201);
  const data = await response.json();
  expect(data.document.title).toBe('brAInwav API Test Document');
});
```

## 🔧 Configuration

### Environment Variables
```bash
# Service URLs
BASE_URL=http://localhost:3000
API_URL=http://localhost:3001/api
LOCAL_MEMORY_URL=http://localhost:3028/api/v1

# Test Configuration
NODE_ENV=test
JWT_SECRET=test_jwt_secret_brainwav
CORS_ORIGIN=http://localhost:3000

# Performance Test Configuration
LOAD_TEST_USERS=50
LOAD_TEST_DURATION=300
LOAD_TEST_RAMP_UP=60
```

### Playwright Configuration
The `playwright.config.ts` file includes:
- Multi-browser project configuration
- Test timeout and retry settings
- Custom brAInwav reporter setup
- Docker compose integration
- Performance monitoring

## 📊 Reports and Metrics

### Report Types Generated
1. **HTML Report**: Interactive report with brAInwav branding
2. **JSON Report**: Machine-readable test results
3. **JUnit XML**: CI/CD integration
4. **Markdown Report**: Human-readable summary

### Key Metrics Tracked
- Test execution time
- Browser compatibility
- Performance benchmarks
- Accessibility violations
- Security test results
- Error categorization

### Viewing Reports
```bash
# View HTML report
pnpm test:e2e:report

# View individual report files
open test-results/brAInwav-test-report.html
open playwright-report/index.html
```

## 🛡️ Best Practices

### Test Writing Guidelines
1. **Use TDD Principles**: Write failing tests first
2. **Proper Test Isolation**: Each test should be independent
3. **Meaningful Assertions**: Verify actual user behavior
4. **Data Management**: Use seeded test data, avoid production data
5. **Error Handling**: Test both happy paths and error scenarios

### brAInwav Branding Requirements
- All user-facing messages should mention "brAInwav"
- Use "Cortex-OS" for system references
- Include "Autonomous Software Behavior Reasoning" where appropriate
- Maintain consistent tone and terminology

### Performance Guidelines
- Keep tests under 30 seconds when possible
- Use appropriate wait strategies (avoid fixed timeouts)
- Monitor memory usage during test execution
- Implement proper cleanup to prevent resource leaks

## 🔍 Debugging

### Debug Mode
```bash
# Run with Playwright Inspector
pnpm test:e2e:debug

# Run with trace viewer
npx playwright show-trace trace.zip
```

### Common Issues
1. **Service Unavailable**: Ensure Docker environment is running
2. **Database Issues**: Check test database seeding
3. **Timeout Errors**: Verify network connectivity and service health
4. **Authentication Failures**: Confirm test user credentials

### Logging
```bash
# Enable verbose logging
DEBUG=pw:api pnpm test:e2e

# View test execution logs
tail -f test-results/test.log
```

## 🚀 CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: pnpm install
      - run: pnpm test:e2e:install
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## 📚 Additional Resources

### Documentation
- [Playwright Documentation](https://playwright.dev/)
- [Accessibility Testing Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Performance Testing Best Practices](https://web.dev/performance/)

### Troubleshooting
- Check service health: `curl http://localhost:3001/api/health`
- Verify database: `sqlite3 data/test-cortex.db ".tables"`
- Monitor logs: `docker compose -f docker-compose.test.yml logs`

---

## 🤝 Contributing

When contributing to the brAInwav testing framework:

1. Follow the established patterns and naming conventions
2. Ensure all tests include proper brAInwav branding
3. Add appropriate test data and mock services
4. Update documentation for new test categories
5. Verify all tests pass before submitting

---

*Generated by brAInwav Cortex-OS Testing Framework*
*Autonomous Software Behavior Reasoning (ASBR) Runtime*