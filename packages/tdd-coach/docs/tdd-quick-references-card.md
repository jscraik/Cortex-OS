# TDD Quick Reference Card

## Cortex-OS & Cortex-Py Development

**Keep this handy during development** 📌

---

## The TDD Cycle (2 minutes)

```
┌─────────────┐
│  1. RED     │  Write failing test (30-60 seconds)
│  ❌ Test    │  Specify what you want
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  2. GREEN   │  Minimal implementation (30-60 seconds)
│  ✅ Test    │  Just make it pass
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  3. REFACTOR│  Improve code (30-60 seconds)
│  🔧 Clean   │  Keep tests green
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  4. COMMIT  │  Save progress (<50 lines)
│  💾 Save    │  feat: add user search
└─────────────┘
```

---

## Before You Code Checklist

- [ ] Do I have a failing test?
- [ ] Is the test specific and focused?
- [ ] Can I describe the behavior in one sentence?
- [ ] Is this <50 lines of change?

**If NO to any: STOP. Write the test first.**

---

## Test Naming Convention

```typescript
// ✅ GOOD: Describes behavior
it('should return empty array when no memories match query', ...)
it('should retry 3 times on network failure', ...)
it('should throw ValidationError for negative limit', ...)

// ❌ BAD: Describes implementation
it('should call findMany with query parameter', ...)
it('tests the getUserData function', ...)
```

---

## The Three A's Pattern

```typescript
describe('Memory Search', () => {
  it('should return relevant memories', async () => {
    // ARRANGE: Set up test data
    const testMemories = await createTestMemories(10);
    const query = 'machine learning';
    
    // ACT: Execute the behavior
    const results = await memoryService.search(query);
    
    // ASSERT: Verify the outcome
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].content).toContain(query);
  });
});
```

---

## Essential Test Types

### 1. Happy Path (Must Have)

```typescript
it('should successfully process valid input', async () => {
  const result = await service.process(validInput);
  expect(result.success).toBe(true);
});
```

### 2. Edge Cases (Must Have)

```typescript
it('should handle empty input', ...)
it('should handle null values', ...)
it('should handle maximum values', ...)
```

### 3. Error Paths (Must Have)

```typescript
it('should throw on invalid input', async () => {
  await expect(service.process(invalidInput))
    .rejects.toThrow('ValidationError');
});
```

### 4. Async States (For UI/API)

```typescript
it('should show loading state', ...)
it('should show error message', ...)
it('should handle timeout', ...)
```

---

## Common Test Smells

| Smell | Problem | Fix |
|-------|---------|-----|
| `sleep(1000)` | Flaky timing | Use `clock.advance()` |
| Mock everything | Tests fragile | Mock only external APIs |
| No assertions | Meaningless | Verify actual behavior |
| 100+ line test | Too complex | Split into focused tests |
| `test('works')` | Vague | Describe specific behavior |

---

## Coverage Targets

```
Line Coverage:     ≥ 95% ✅
Branch Coverage:   ≥ 95% ✅
Mutation Score:    ≥ 80% ✅
Flake Rate:        < 1%  ✅
```

**Check current coverage**:

```bash
# Node
pnpm test:coverage

# Python
pytest --cov --cov-report=html
```

---

## Quick Commands

### Development

```bash
# Watch mode (fastest feedback)
pnpm test:watch

# Run specific file
pnpm test memory-search.test.ts

# TDD Coach validation
pnpm tdd-coach validate --watch
```

### Pre-commit

```bash
# Validate staged files
make tdd-validate

# Run all checks
pnpm pre-commit
```

### CI Pipeline

```bash
# Full test suite
pnpm test:all

# Coverage report
pnpm test:coverage

# Mutation testing
pnpm test:mutation
```

---

## When to Write Which Test

### Unit Test

- **When**: Testing single function/method
- **Example**: `calculateSimilarity(vec1, vec2)`

```typescript
it('should return 1.0 for identical vectors', () => {
  const vec = [1, 2, 3];
  expect(calculateSimilarity(vec, vec)).toBe(1.0);
});
```

### Integration Test

- **When**: Testing multiple components together
- **Example**: API endpoint + database

```typescript
it('should store memory and return ID', async () => {
  const response = await request(app)
    .post('/memories')
    .send({ content: 'test' });
  
  expect(response.status).toBe(201);
  
  const memory = await db.memory.findUnique({ 
    where: { id: response.body.id } 
  });
  expect(memory).toBeDefined();
});
```

### E2E Test

- **When**: Testing user journey
- **Example**: Full workflow across services

```typescript
it('should complete search-to-retrieve flow', async () => {
  // 1. User searches
  const searchResults = await userSession.search('AI');
  
  // 2. User selects result
  const memory = await userSession.getMemory(searchResults[0].id);
  
  // 3. Memory is displayed
  expect(memory.content).toBeDefined();
});
```

---

## Property-Based Testing Cheat Sheet

```typescript
import * as fc from 'fast-check';

// Numbers
fc.integer({ min: 0, max: 100 })
fc.float({ min: 0.0, max: 1.0 })

// Strings
fc.string({ minLength: 1, maxLength: 100 })
fc.hexaString()
fc.uuid()

// Arrays
fc.array(fc.string(), { minLength: 1, maxLength: 10 })

// Objects
fc.record({
  id: fc.uuid(),
  name: fc.string(),
  age: fc.integer({ min: 0, max: 120 })
})

// Custom generator
const memoryArbitrary = fc.record({
  content: fc.string({ minLength: 10 }),
  tags: fc.array(fc.string(), { maxLength: 5 }),
  importance: fc.integer({ min: 1, max: 10 })
});

// Use in test
it.prop([memoryArbitrary])('should validate any memory', (memory) => {
  expect(validateMemory(memory)).toBe(true);
});
```

---

## Mocking Guidelines

### ✅ DO Mock

- External APIs (Stripe, OpenAI)
- Network calls
- File system operations
- Time/Date
- Random number generators

### ❌ DON'T Mock

- Your own business logic
- Database (use test DB)
- Simple utilities
- Data transformations

### Example

```typescript
// ✅ GOOD: Mock external API
vi.mock('stripe', () => ({
  charges: {
    create: vi.fn().mockResolvedValue({ id: 'ch_123' })
  }
}));

// ❌ BAD: Mock your own code
vi.mock('./userService', () => ({
  getUser: vi.fn().mockReturnValue({ id: 1 })
}));
```

---

## Performance Test Targets

| Metric | Target | How to Test |
|--------|--------|-------------|
| API P95 latency | <250ms | k6 load test |
| Memory search | <100ms | `performance.now()` |
| Embedding generation | <200ms | pytest benchmark |
| Startup time | <3s | Integration test |
| Memory usage | <2GB | Resource monitoring |

---

## Error Handling Patterns

```typescript
describe('Error Handling', () => {
  // Specific error types
  it('should throw ValidationError', async () => {
    await expect(service.process({ limit: -1 }))
      .rejects.toThrow(ValidationError);
  });
  
  // Error messages
  it('should include field name in error', async () => {
    await expect(service.process({ limit: -1 }))
      .rejects.toThrow('limit must be positive');
  });
  
  // Error codes
  it('should return 400 for invalid input', async () => {
    const response = await request(app)
      .post('/api/search')
      .send({ limit: -1 });
    
    expect(response.status).toBe(400);
  });
});
```

---

## Test Data Strategies

### 1. Fixtures (Best for complex data)

```typescript
const testUser = loadFixture('users/standard-user.json');
```

### 2. Factories (Best for variations)

```typescript
const user = createUser({ 
  role: 'admin',
  verified: true 
});
```

### 3. Builders (Best for readability)

```typescript
const memory = new MemoryBuilder()
  .withContent('test')
  .withTags(['ai', 'ml'])
  .withImportance(8)
  .build();
```

---

## Code Style Compliance

### Functions

```typescript
// ✅ GOOD: ≤40 lines, single responsibility
export function calculateSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error('Vectors must be same length');
  let dotProduct = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
  }
  return dotProduct / (magnitude(a) * magnitude(b));
}

// ❌ BAD: >40 lines, multiple responsibilities
export function processUserData(user) {
  // ... 100 lines of mixed logic
}
```

### Exports

```typescript
// ✅ GOOD: Named exports
export function search(query: string) { ... }
export class MemoryService { ... }

// ❌ BAD: Default exports
export default function search(query: string) { ... }
```

---

## Debugging Failed Tests

```bash
# Run single test with verbose output
pnpm test path/to/test.ts --verbose

# Debug in VS Code
# Add to launch.json:
{
  "type": "node",
  "request": "launch",
  "name": "Debug Test",
  "runtimeExecutable": "pnpm",
  "runtimeArgs": ["test", "${file}"],
  "console": "integratedTerminal"
}

# Check coverage for missed branches
pnpm test:coverage --reporter=html
open coverage/index.html
```

---

## Git Commit Messages

```bash
# ✅ GOOD: Conventional commits
git commit -m "feat(memory): add hybrid search with semantic + keyword"
git commit -m "test(agents): add property-based tests for planning"
git commit -m "fix(api): handle null values in search query"

# Commit types:
# feat:     New feature
# fix:      Bug fix
# test:     Add/update tests
# refactor: Code change without behavior change
# docs:     Documentation only
# chore:    Build/tooling changes
# perf:     Performance improvement
```

---

## Emergency Rollback

```bash
# If tests are blocking merge and you're CERTAIN they're flaky:

# 1. Document the issue
echo "Flaky test: memory-search.test.ts line 45" >> FLAKY_TESTS.md

# 2. Skip temporarily (leave TODO)
it.skip('should handle concurrent searches', async () => {
  // TODO: Fix race condition causing 1% flake rate
  // See: https://github.com/org/repo/issues/123
});

# 3. Create issue
gh issue create --title "Fix flaky test: concurrent searches"

# 4. Commit with explanation
git commit -m "test: skip flaky concurrent search test

Test fails intermittently due to race condition.
Will fix in #123."
```

---

## Quality Gate Quick Check

Before pushing:

```bash
# ✅ All must pass
pnpm lint           # Code style
pnpm type-check     # TypeScript
pnpm test           # All tests green
pnpm test:coverage  # ≥95% coverage
```

---

## Resources

- **TDD Guide**: `packages/tdd-coach/docs/tdd-planning-guide.md`
- **Code Style**: `CODESTYLE.md`
- **Quality Gates**: `.eng/quality_gate.json`
- **Examples**: `tests/examples/`

---

## Need Help?

```bash
# TDD Coach help
pnpm tdd-coach --help

# Test help
pnpm test --help

# Check current status
make tdd-status
```

**Remember**: When in doubt, write the test first! 🧪
