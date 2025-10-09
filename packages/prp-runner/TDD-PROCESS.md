# TDD Process Documentation

## Overview

This package follows strict Test-Driven Development (TDD) principles as mandated by the Cortex-OS architecture. Every line of code must be driven by a test.

## TDD Cycle Implementation

### Red-Green-Refactor Cycle

1. **RED Phase** - Write a failing test

   ```bash
   pnpm tdd:red
   ```

   - Write the minimal failing test for new functionality
   - Test must fail for the right reason (missing implementation)
   - No implementation code yet

2. **GREEN Phase** - Make the test pass

   ```bash
   pnpm tdd:green
   ```

   - Write minimal code to make the test pass
   - No additional features beyond what the test requires
   - Focus on making it work, not making it perfect

3. **REFACTOR Phase** - Improve while keeping tests green

   ```bash
   pnpm tdd:refactor
   ```

   - Improve code quality, design, performance
   - Keep all tests passing throughout refactoring
   - Only refactor when tests are green

## Quality Gates

### Required Coverage Thresholds

- **Statements**: 85% minimum
- **Branches**: 85% minimum
- **Functions**: 85% minimum
- **Lines**: 85% minimum

### CI Gates

```bash
# Run all TDD quality gates
pnpm gates:tdd

# Pre-commit validation
pnpm precommit
```

### Test Structure Requirements

#### Test Organization

```
src/
├── __tests__/
│   ├── orchestrator.test.ts  # Core functionality tests
│   ├── index.test.ts         # Export validation tests
│   └── [feature].test.ts     # Feature-specific tests
├── orchestrator.ts           # Implementation driven by tests
└── index.ts                  # Package exports
```

#### Test Naming Convention

- Describe files: `[ComponentName] - TDD Implementation`
- Test blocks: `describe('[Feature] - [Context]')`
- Test cases: `it('should [expected behavior]')`

#### Example Test Structure

```typescript
describe('PRPOrchestrator - TDD Implementation', () => {
  describe('Basic Construction and Registration', () => {
    it('should create an orchestrator instance', () => {
      // Arrange, Act, Assert pattern
    });
  });
});
```

## TDD Anti-Patterns to Avoid

### ❌ Architecture Before Tests

```typescript
// WRONG: Building complex architecture without tests
class ComplexOrchestrator {
  private neurons: NeuronGraph;
  private phases: PhaseManager;
  private validation: ValidationEngine;
  // ... 500 lines of untested code
}
```

### ✅ Tests Drive Architecture

```typescript
// CORRECT: Simple implementation driven by tests
export class PRPOrchestrator {
  private neurons: Map<string, Neuron> = new Map();

  getNeuronCount(): number {
    return this.neurons.size; // Driven by test requirement
  }
}
```

### ❌ Mock Everything

```typescript
// WRONG: Testing mocks instead of real behavior
it('should call neuron.execute()', () => {
  const mockNeuron = { execute: vi.fn() };
  // Test passes but doesn't validate real integration
});
```

### ✅ Test Real Behavior

```typescript
// CORRECT: Test actual functionality
it('should execute neuron and return result', async () => {
  const neuron = createMockNeuron('test', 'strategy');
  orchestrator.registerNeuron(neuron);
  const result = await orchestrator.executePRPCycle({});
  expect(result.status).toBe('completed');
});
```

## Development Workflow

### Adding New Features

1. **Start with Test** (RED)

   ```bash
   # Write failing test for new feature
   pnpm tdd:red
   ```

2. **Implement Minimally** (GREEN)

   ```bash
   # Write just enough code to pass
   pnpm tdd:green
   ```

3. **Refactor Safely** (REFACTOR)

   ```bash
   # Improve design while tests stay green
   pnpm tdd:refactor
   ```

4. **Validate Quality Gates**
   ```bash
   # Ensure coverage and quality
   pnpm gates:tdd
   ```

### Code Review Requirements

- All new code must have corresponding tests
- Coverage must not decrease below 85%
- Tests must cover both happy path and edge cases
- Implementation must be minimal (no speculative features)

## Historical Context

### Previous Violations (2025-08-21)

This package previously violated TDD principles by:

- Building 2000+ lines of untested code
- Claiming "production-ready" without tests
- Using mock implementations with fake compliance results
- Violating the fundamental TDD principle of test-first

### Corrective Actions Taken

- Removed all untested implementation
- Started fresh with TDD Red-Green-Refactor cycle
- Established 85% coverage gates
- Created comprehensive test suite
- Achieved 100% coverage through proper TDD

## Success Metrics

### Current Status ✅

- **Coverage**: 100% (statements, branches, functions, lines)
- **Tests**: 10 passing tests
- **TDD Compliance**: Full Red-Green-Refactor cycle followed
- **CI Gates**: All quality gates passing

### Future Expansion

When adding new features:

1. Write failing test first (RED)
2. Implement minimal solution (GREEN)
3. Refactor for quality (REFACTOR)
4. Maintain 85%+ coverage
5. Document TDD rationale in test comments

## Commands Reference

```bash
# Development
pnpm test              # Run tests
pnpm test:watch        # TDD development mode
pnpm test:coverage     # Coverage report

# TDD Workflow
pnpm tdd:red          # Start with failing test
pnpm tdd:green        # Make tests pass
pnpm tdd:refactor     # Improve while tests pass

# Quality Gates
pnpm gates:tdd        # Validate TDD compliance
pnpm precommit        # Pre-commit validation
```

Remember: **No code without tests. No features without failing tests first.**
