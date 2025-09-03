# Cortex-OS Tests

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

This directory contains comprehensive test suites for the Cortex-OS project, including unit tests, integration tests, and end-to-end testing scenarios.

## Test Structure

### Test Types

- **Unit Tests** - Component-level testing with isolated functionality
- **Integration Tests** - Service interaction and API testing
- **End-to-End Tests** - Complete workflow and user scenario testing
- **Performance Tests** - Load, stress, and benchmark testing
- **Security Tests** - Vulnerability and penetration testing

### Test Organization

Tests are organized by:

- **Module** - Tests grouped by functional area
- **Layer** - Tests categorized by architectural layer
- **Scope** - Unit, integration, or system-level tests
- **Environment** - Development, staging, or production tests

## Testing Framework

### Core Technologies

- **Vitest** - Primary testing framework for TypeScript/JavaScript
- **Jest** - Legacy test framework for specific components
- **Playwright** - Browser automation and E2E testing
- **K6** - Performance and load testing
- **pytest** - Python component testing

### Test Configuration

- `vitest.config.ts` - Main Vitest configuration
- `vitest.workspace.ts` - Workspace-level test configuration
- `test-pattern.js` - Test pattern definitions
- Environment-specific configurations

## Test Execution

### Local Development

```bash
# Run all tests
pnpm test

# Run specific test types
pnpm test:unit
pnpm test:integration
pnpm test:e2e

# Run with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

### CI/CD Pipeline

Tests are automatically executed in:

- Pull request validation
- Pre-merge verification
- Deployment pipelines
- Scheduled regression testing

## Test Standards

### Test Quality

- **Coverage Requirements** - Minimum 80% code coverage
- **Test Isolation** - No dependencies between tests
- **Deterministic** - Consistent results across runs
- **Fast Execution** - Quick feedback for developers

### Best Practices

- Write tests before implementation (TDD)
- Use descriptive test names
- Arrange-Act-Assert pattern
- Mock external dependencies
- Test edge cases and error conditions

## Test Data Management

### Test Fixtures

- Reusable test data sets
- Database seeding scripts
- Mock service responses
- Environment configurations

### Data Isolation

- Clean database state per test
- Isolated test environments
- Sandbox configurations
- Temporary file management

## Debugging and Troubleshooting

### Test Debugging

- Debug configurations for IDEs
- Verbose logging options
- Step-through debugging
- Snapshot testing

### Common Issues

- Test flakiness resolution
- Environment dependencies
- Timing and race conditions
- Resource cleanup

## Continuous Testing

### Automated Testing

- Pre-commit hooks
- CI/CD integration
- Scheduled test runs
- Performance monitoring

### Quality Gates

- Coverage thresholds
- Performance benchmarks
- Security scan integration
- Compliance validation

## Related Documentation

- [Development Workflow](/.github/copilot-instructions.md)
- [Performance Testing](/k6/README.md)
- [Quality Standards](/docs/)
- [CI/CD Pipeline](/.github/workflows/)
