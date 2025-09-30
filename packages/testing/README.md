# Cortex Memory Testing Package

Comprehensive test suite for the Cortex Memory system, covering unit tests, integration tests, parity tests, and soak tests.

## Test Structure

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test component interactions via HTTP and STDIO
- **Parity Tests**: Ensure STDIO and HTTP transports return identical results
- **Soak Tests**: 8-hour reliability testing under continuous load

## Quick Start

```bash
# Install dependencies
pnpm install

# Run all tests
pnpm test

# Run specific test suites
pnpm test:unit          # Unit tests only
pnpm test:integration   # Integration tests only
pnpm test:parity        # Parity tests only
pnpm test:soak          # Soak tests (8 hours)

# Generate coverage report
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch
```

## Test Coverage Targets

- **Global Coverage**: 85% minimum across all metrics
  - Branches: 85%
  - Functions: 85%
  - Lines: 85%
  - Statements: 85%

## Test Descriptions

### Unit Tests (`src/unit/`)

- **LocalMemoryProvider.test.ts**: Tests the core memory provider functionality
  - Store/retrieve operations
  - Search modes (semantic, keyword, hybrid)
  - Analysis features
  - Error handling and edge cases

### Integration Tests (`src/integration/`)

- **mcp-http.test.ts**: Tests MCP HTTP transport
  - Tool discovery and execution
  - Request/response handling
  - Performance under load

- **rest-api.test.ts**: Tests REST API endpoints
  - CRUD operations
  - Validation and error handling
  - CORS and security headers
  - OpenAPI documentation

### Parity Tests (`src/parity/`)

- **mcp-transport-parity.test.ts**: Ensures consistency between transports
  - Identical responses for same inputs
  - Error handling parity
  - Performance comparison
  - Concurrent operation consistency

### Soak Tests (`src/soak/`)

- **soak-test.ts**: Long-running reliability tests
  - 8-hour continuous operation
  - Memory leak detection
  - Qdrant outage recovery
  - High concurrency handling

## Configuration

### Vitest Configurations

- `vitest.config.ts`: General configuration for unit tests
- `vitest.integration.config.ts`: Integration test configuration
- `vitest.parity.config.ts`: Parity test configuration

### Environment Variables

```bash
NODE_ENV=test                     # Test environment
QDRANT_URL=http://localhost:6333  # Qdrant endpoint
TEST_TEMP_DIR=/tmp/cortex-test    # Temporary test directory
LOG_LEVEL=error                   # Reduce log noise
```

## Test Data Management

Tests use temporary databases and collections that are cleaned up after each run:

- SQLite databases created in temporary directory
- Qdrant collections prefixed with test identifier
- Automatic cleanup on test completion/failure

## Running Tests Locally

### Prerequisites

1. Qdrant running on localhost:6333
   ```bash
   docker run -d -p 6333:6333 qdrant/qdrant:v1.8.3
   ```

2. All packages built
   ```bash
   pnpm build
   ```

### Test Commands

```bash
# Using Node test runner
node scripts/run-tests.js all

# Using pnpm scripts
pnpm test:all
```

## CI/CD Integration

The test suite is designed for CI/CD pipelines:

```yaml
# Example GitHub Actions step
- name: Run Tests
  run: |
    pnpm test:unit
    pnpm test:integration
    pnpm test:parity
    pnpm test:coverage
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Tests use dynamic port allocation to avoid conflicts
2. **Qdrant connection**: Ensure Qdrant is accessible at configured URL
3. **Memory usage**: Tests clean up resources automatically
4. **Timeout failures**: Increase timeouts in vitest config if needed

### Debug Mode

Run tests with additional logging:

```bash
DEBUG=* pnpm test:unit
```

### Test Isolation

Each test suite:
- Uses unique database files
- Creates isolated Qdrant collections
- Cleans up resources automatically
- Runs in isolated processes where needed

## Coverage Reports

Coverage reports are generated in multiple formats:

- Text: Console output
- JSON: `coverage/coverage-final.json`
- HTML: `coverage/index.html`

## Performance Benchmarks

Test suite includes performance assertions:

- Store operations: < 1000ms
- Search operations: < 500ms
- HTTP requests: < 100ms overhead
- STDIO requests: < 50ms overhead

## Contributing

When adding new tests:

1. Follow existing file structure
2. Include cleanup in teardown
3. Add coverage for new features
4. Update this README

## Test Results Interpretation

- ✅ All tests pass: System is reliable
- 🟡 Some tests fail: Check environment setup
- ❌ Coverage below 85%: Add more tests
- 📊 High latency: Check system resources