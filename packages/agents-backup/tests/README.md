# Agents Package Test Suite

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

This directory contains comprehensive tests for the `@cortex-os/agents` package, implementing TDD best practices with 90%+ coverage target.

## Test Structure

```
tests/
├── setup.ts                     # Global test configuration
├── fixtures/                    # Test data and mocks
│   └── agents.ts                # Agent fixtures and mock data
├── utils/                       # Test utilities and helpers
│   └── test-helpers.ts          # Reusable test functions
├── unit/                        # Unit tests
│   ├── interfaces.test.ts       # Agent, Executor, BasicExecutor tests
│   └── code-intelligence-agent.test.ts  # CodeIntelligenceAgent tests
├── integration/                 # Integration tests
│   └── agent-integration.test.ts        # Cross-system integration tests
├── contract/                    # Contract compliance tests
│   └── agent-contracts.test.ts          # API contract validation
├── security/                    # Security compliance tests
│   └── owasp-llm-compliance.test.ts    # OWASP LLM Top-10 tests
├── performance/                 # Performance benchmarks
│   └── model-performance.bench.ts      # Performance testing
├── accessibility/               # Accessibility compliance tests
│   └── agent-a11y.test.ts              # WCAG 2.2 AA compliance
└── golden/                      # Golden/regression tests
    ├── agent-golden.test.ts             # Deterministic evaluation tests
    └── snapshots/                       # Golden test snapshots
```

## Test Categories

### 1. Unit Tests (`tests/unit/`)

**Coverage**: Core interfaces and implementations
**Files**:

- `interfaces.test.ts` - Agent, Executor, BasicExecutor interface tests
- `code-intelligence-agent.test.ts` - CodeIntelligenceAgent class tests

**Key Test Cases**:

- Interface compliance validation
- Basic functionality testing
- Error handling scenarios
- Model selection logic
- Cache behavior
- Event emission
- Input validation
- Response parsing

### 2. Integration Tests (`tests/integration/`)

**Coverage**: Cross-component interactions with mocked dependencies
**Files**:

- `agent-integration.test.ts` - A2A, MCP bridge integration

**Key Test Cases**:

- A2A event system integration
- MCP bridge connectivity
- Multi-agent coordination
- Network latency handling
- Rate limiting compliance
- Error cascade handling
- Performance under load

### 3. Contract Tests (`tests/contract/`)

**Coverage**: API contract compliance using Zod schemas
**Files**:

- `agent-contracts.test.ts` - Interface contract validation

**Key Test Cases**:

- Agent interface schema validation
- Task parameter validation
- Execution result contracts
- CodeAnalysisRequest/Result schemas
- Cross-implementation compatibility
- Contract evolution support
- Backward compatibility

### 4. Security Tests (`tests/security/`)

**Coverage**: OWASP LLM Top-10 compliance
**Files**:

- `owasp-llm-compliance.test.ts` - Security vulnerability testing

**Key Test Cases**:

- LLM01: Prompt Injection protection
- LLM02: Insecure Output Handling
- LLM03: Training Data Poisoning prevention
- LLM04: Model Denial of Service resistance
- LLM05: Supply Chain vulnerability mitigation
- LLM06: Sensitive Information Disclosure prevention
- LLM07: Insecure Plugin Design protection
- LLM08: Excessive Agency limitation
- LLM09: Overreliance safeguards
- LLM10: Model Theft protection

### 5. Performance Tests (`tests/performance/`)

**Coverage**: Performance benchmarks and resource usage
**Files**:

- `model-performance.bench.ts` - Performance benchmarking

**Key Test Cases**:

- Response time benchmarks
- Throughput testing
- Memory usage optimization
- Network latency handling
- Rate limiting performance
- Concurrent request handling
- Resource utilization
- Scalability testing

### 6. Accessibility Tests (`tests/accessibility/`)

**Coverage**: WCAG 2.2 AA compliance
**Files**:

- `agent-a11y.test.ts` - Accessibility compliance testing

**Key Test Cases**:

- Text alternatives for all content
- Keyboard accessibility
- Screen reader compatibility
- Color contrast requirements
- Structured content navigation
- Plain language usage
- Consistent user interface
- Error identification and handling

### 7. Golden Tests (`tests/golden/`)

**Coverage**: Regression detection with reproducible seeds
**Files**:

- `agent-golden.test.ts` - Deterministic evaluation testing

**Key Test Cases**:

- Deterministic response validation
- Regression detection
- Cross-version compatibility
- Snapshot comparison
- Reproducible evaluation metrics

## Running Tests

### Basic Commands

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run specific test category
vitest run tests/unit/
vitest run tests/integration/
vitest run tests/security/

# Run performance benchmarks
vitest bench

# Watch mode for development
vitest --watch

# Coverage with threshold enforcement (90%)
pnpm test:coverage:threshold
```

### Environment Configuration

Tests use environment variables for configuration:

```bash
# Test environment
NODE_ENV=test

# Golden test seed for reproducibility
VITEST_GOLDEN_SEED=12345

# Network egress control for testing
MCP_NETWORK_EGRESS=disabled

# Test endpoints
TEST_OLLAMA_ENDPOINT=http://localhost:11434
TEST_MLX_ENDPOINT=http://localhost:8765
```

## Test Data and Fixtures

### Mock Agents

- `mockAgents.basic` - Basic agent with execute capability
- `mockAgents.codeIntelligence` - Code analysis agent
- `mockAgents.advanced` - Multi-capability agent

### Mock Tasks

- `mockTasks.simple` - Basic execution task
- `mockTasks.codeAnalysis` - Code analysis task
- `mockTasks.securityScan` - Security scanning task

### Code Analysis Requests

- `mockCodeAnalysisRequests.basic` - Simple code review
- `mockCodeAnalysisRequests.security` - Security analysis
- `mockCodeAnalysisRequests.performance` - Performance optimization
- `mockCodeAnalysisRequests.complex` - Complex architecture analysis

## Coverage Requirements

### Minimum Coverage Thresholds

- **Functions**: 90%
- **Branches**: 90%
- **Lines**: 90%
- **Statements**: 90%

### Coverage Reporting

- Text format for console output
- JSON format for CI/CD integration
- HTML format for detailed analysis
- LCOV format for external tools

## CI/CD Integration

### GitHub Actions Workflow

```yaml
- name: Run Tests
  run: pnpm test:coverage:threshold

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info

- name: Performance Benchmarks
  run: pnpm vitest bench --reporter=verbose

- name: Security Tests
  run: pnpm vitest run tests/security/
```

### Quality Gates

- All tests must pass
- Coverage must meet 90% threshold
- Security tests must pass OWASP compliance
- Performance benchmarks must meet SLA
- Accessibility tests must meet WCAG 2.2 AA

## Debugging and Development

### Debug Configuration

```bash
# Debug specific test
DEBUG=1 vitest run tests/unit/interfaces.test.ts

# Verbose output
vitest run --reporter=verbose

# UI mode for interactive debugging
vitest --ui
```

### Mock Management

- Global mocks configured in `tests/setup.ts`
- Per-test mocks using Vitest `vi.mock()`
- HTTP response mocks with deterministic behavior
- Network latency simulation for realistic testing

## Best Practices

### Test Writing Guidelines

1. **Arrange-Act-Assert** pattern
2. **Descriptive test names** that explain intent
3. **Independent tests** that don't depend on each other
4. **Comprehensive error testing** for all failure modes
5. **Performance-conscious** test design
6. **Accessibility-first** output validation

### Mock Strategy

1. **Mock external dependencies** (HTTP, file system, etc.)
2. **Use real implementations** for internal logic
3. **Deterministic responses** for golden tests
4. **Realistic error simulation** for robustness testing

### Maintenance

1. **Update snapshots** when behavior intentionally changes
2. **Review coverage reports** regularly
3. **Add tests for bug fixes** to prevent regression
4. **Keep fixtures current** with real-world usage patterns

## Acceptance Criteria

### ✅ Unit Tests

- [ ] Agent interface validation (100% coverage)
- [ ] Executor implementation testing (100% coverage)
- [ ] CodeIntelligenceAgent functionality (90%+ coverage)
- [ ] Error handling paths (100% coverage)
- [ ] Model selection logic (100% coverage)
- [ ] Cache operations (100% coverage)
- [ ] Event emission (100% coverage)

### ✅ Integration Tests

- [ ] A2A event system integration
- [ ] MCP bridge connectivity
- [ ] Cross-agent coordination
- [ ] Network error handling
- [ ] Rate limiting compliance
- [ ] Performance under load

### ✅ Contract Tests

- [ ] Agent interface compliance
- [ ] Task parameter validation
- [ ] Result structure validation
- [ ] Zod schema enforcement
- [ ] Backward compatibility
- [ ] Contract evolution support

### ✅ Security Tests

- [ ] OWASP LLM Top-10 compliance (100%)
- [ ] Prompt injection prevention
- [ ] Output sanitization
- [ ] PII protection
- [ ] DoS resistance
- [ ] Supply chain security

### ✅ Performance Tests

- [ ] Response time benchmarks (<2s p95)
- [ ] Throughput testing (>10 req/s)
- [ ] Memory efficiency (<100MB increase)
- [ ] Concurrent request handling (10+ simultaneous)
- [ ] Rate limiting performance
- [ ] Scalability verification

### ✅ Accessibility Tests

- [ ] WCAG 2.2 AA compliance (100%)
- [ ] Screen reader compatibility
- [ ] Keyboard navigation
- [ ] Color contrast requirements
- [ ] Plain language usage
- [ ] Structured output validation

### ✅ Golden Tests

- [ ] Reproducible evaluations
- [ ] Regression detection
- [ ] Snapshot management
- [ ] Cross-version compatibility
- [ ] Deterministic behavior validation

## Troubleshooting

### Common Issues

1. **Coverage Below Threshold**
   - Run `pnpm test:coverage` to see detailed report
   - Add tests for uncovered branches
   - Check for unreachable code

2. **Flaky Tests**
   - Use deterministic mocks
   - Avoid time-based assertions
   - Implement proper cleanup in `afterEach`

3. **Performance Test Failures**
   - Check system resources
   - Validate network connectivity
   - Review timeout configurations

4. **Golden Test Mismatches**
   - Verify `VITEST_GOLDEN_SEED` is set
   - Check for non-deterministic code paths
   - Update snapshots if behavior intentionally changed

For additional support, see the main project documentation or file an issue in the repository.
