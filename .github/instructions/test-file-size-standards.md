<!--
file_path: ".github/instructions/test-file-size-standards.md"
description: "Specific file size standards for test files, integrating copilot-testGeneration.instructions.md with file size enforcement"
maintainer: "@jamiescottcraik"
last_updated: "2025-08-20"
version: "1.0.0"
status: "active"
-->

# Test File Size Standards

**CRITICAL**: Test files MUST comply with both `copilot-testGeneration.instructions.md` AND the 500-line hard cap from `copilot-codeReview.instructions.md`.

## Overview

### Current Crisis

**CRITICAL VIOLATIONS**: Several test files exceed limits by 200-300%:

- `tests/security/scanning.test.ts` (1,524 lines) - 205% over limit
- `tests/phase2/unit/parallel-execution-engine.test.ts` (1,257 lines) - 151% over limit
- `tests/phase2/unit/team-formation-system.test.ts` (1,231 lines) - 146% over limit
- `tests/phase2/integration/multi-neuron-coordination.test.ts` (1,184 lines) - 137% over limit
- `tests/performance/rag-benchmarks.test.ts` (1,092 lines) - 118% over limit

### Root Cause

**Monolithic test files** that violate both:

1. **File Size Standards**: 500-line hard cap (copilot-codeReview.instructions.md)
2. **Test Quality Standards**: Maintainability, isolation, readability (copilot-testGeneration.instructions.md)

---

## Test File Size Guidelines

### Hard Limits (Aligned with Project Standards)

| Test Type             | Hard Cap  | Recommended | Rationale                       |
| --------------------- | --------- | ----------- | ------------------------------- |
| **Unit Tests**        | 500 lines | 200 lines   | Single component/function focus |
| **Integration Tests** | 500 lines | 300 lines   | Multiple component interactions |
| **E2E Tests**         | 500 lines | 250 lines   | User journey focused            |
| **Performance Tests** | 500 lines | 300 lines   | Benchmark suites                |

### Test-Specific Considerations

**Unlike implementation files**, test files often grow large due to:

- Multiple test scenarios
- Extensive setup/teardown
- Large fixture data
- Mock configurations

**However**, this is NOT justification for exceeding the 500-line limit.

---

## Test File Modularization Patterns

### 1. **Feature-Based Split** (Recommended)

```typescript
// ❌ BAD: Monolithic test file (1,200 lines)
describe('UserManagement', () => {
  // 300 lines of auth tests
  // 400 lines of profile tests
  // 300 lines of permissions tests
  // 200 lines of cleanup tests
});

// ✅ GOOD: Feature-based modules
// tests/user/auth.test.ts (300 lines)
// tests/user/profile.test.ts (200 lines)
// tests/user/permissions.test.ts (180 lines)
// tests/user/cleanup.test.ts (120 lines)
```

**Implementation**:

```bash
tests/user/
├── auth.test.ts              # Authentication tests
├── profile.test.ts           # Profile management
├── permissions.test.ts       # Permission system
├── cleanup.test.ts          # Cleanup operations
└── shared/
    ├── fixtures.ts          # Shared test data
    ├── mocks.ts            # Common mocks
    └── helpers.ts          # Test utilities
```

### 2. **Layer-Based Split**

```typescript
// ❌ BAD: Mixed concerns (1,500 lines)
describe('API Integration', () => {
  // 500 lines of unit tests
  // 600 lines of integration tests
  // 400 lines of E2E tests
});

// ✅ GOOD: Layer separation
// tests/unit/api.test.ts (250 lines)
// tests/integration/api.test.ts (300 lines)
// tests/e2e/api.spec.ts (200 lines)
```

### 3. **Scenario-Based Split**

```typescript
// ❌ BAD: All scenarios in one file (1,000 lines)
describe('Payment Processing', () => {
  // 300 lines - happy path tests
  // 400 lines - error scenarios
  // 300 lines - edge cases
});

// ✅ GOOD: Scenario-focused files
// tests/payment/happy-path.test.ts (250 lines)
// tests/payment/error-scenarios.test.ts (300 lines)
// tests/payment/edge-cases.test.ts (200 lines)
```

### 4. **Setup/Teardown Extraction**

```typescript
// ❌ BAD: Repeated setup in every test file
beforeEach(async () => {
  // 50 lines of complex setup
});

// ✅ GOOD: Shared setup utilities
// tests/shared/setup.ts
export const setupTestEnvironment = async () => {
  // Complex setup logic
};

// tests/user/auth.test.ts
import { setupTestEnvironment } from '../shared/setup';
beforeEach(setupTestEnvironment);
```

---

## Test-Specific Split Strategies

### For Large Unit Test Files (>500 lines)

**Pattern**: Split by tested functionality

```
Original: user-service.test.ts (800 lines)

Split into:
├── user-service/
│   ├── creation.test.ts         (150 lines) - User creation tests
│   ├── authentication.test.ts   (180 lines) - Auth-related tests
│   ├── profile-updates.test.ts  (120 lines) - Profile modification
│   ├── permissions.test.ts      (100 lines) - Permission tests
│   ├── error-handling.test.ts   (140 lines) - Error scenarios
│   └── shared/
│       ├── fixtures.ts          (50 lines)  - Test data
│       └── mocks.ts            (60 lines)  - Mock objects
```

### For Large Integration Test Files (>500 lines)

**Pattern**: Split by integration boundary

```
Original: api-integration.test.ts (1,200 lines)

Split into:
├── integration/
│   ├── auth-endpoints.test.ts    (250 lines) - Auth API tests
│   ├── user-endpoints.test.ts    (200 lines) - User API tests
│   ├── data-endpoints.test.ts    (300 lines) - Data API tests
│   ├── websocket-integration.test.ts (200 lines) - WS tests
│   └── shared/
│       ├── api-client.ts         (80 lines)  - Test client
│       └── test-server.ts        (170 lines) - Test server setup
```

### For Large E2E Test Files (>500 lines)

**Pattern**: Split by user journey

```
Original: e2e-workflows.spec.ts (900 lines)

Split into:
├── e2e/
│   ├── user-onboarding.spec.ts  (200 lines) - Registration flow
│   ├── core-workflows.spec.ts   (250 lines) - Main user tasks
│   ├── admin-workflows.spec.ts  (180 lines) - Admin operations
│   ├── error-recovery.spec.ts   (150 lines) - Error scenarios
│   └── shared/
│       ├── page-objects.ts      (120 lines) - Page object models
│       └── test-data.ts         (100 lines) - E2E test data
```

---

## Compliance Integration

### Maintaining Test Quality Standards

**From copilot-testGeneration.instructions.md**, ensure each split test file maintains:

1. **Accessibility-First**: `jest-axe` audits in UI tests
2. **Behavior-Driven**: Focus on user intent and business logic
3. **Resilience & Security**: Test async states, edge cases, auth flows
4. **Isolation & Repeatability**: Atomic, self-contained tests

### File Headers for Split Tests

```typescript
/**
 * @file_path tests/user/auth.test.ts
 * @description Authentication tests for user service - split from monolithic user.test.ts
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-20
 * @version 1.0.0
 * @status active
 * @split_from tests/user.test.ts
 * @related_files tests/user/profile.test.ts, tests/user/permissions.test.ts
 */
```

### Shared Utilities Pattern

```typescript
// tests/shared/user-test-utils.ts
export const createTestUser = async (overrides = {}) => {
  // Shared user creation logic
};

export const mockUserService = () => {
  // Shared mocking logic
};

// Individual test files import shared utilities
import { createTestUser, mockUserService } from '../shared/user-test-utils';
```

---

## Migration Strategy

### Phase 1: Immediate (Critical Files >1,000 lines)

1. **Split worst offenders** using feature-based approach:

   ```bash
   tests/security/scanning.test.ts (1,524 lines)
   → tests/security/auth-scanning.test.ts (300 lines)
   → tests/security/data-scanning.test.ts (250 lines)
   → tests/security/network-scanning.test.ts (200 lines)
   → tests/security/compliance-scanning.test.ts (180 lines)
   → tests/security/shared/ (utilities, mocks, fixtures)
   ```

2. **Extract shared utilities** to reduce duplication
3. **Maintain test coverage** throughout the split process

### Phase 2: Systematic (Files 500-1,000 lines)

1. **Apply appropriate split pattern** based on test type
2. **Refactor shared setup/teardown** into utilities
3. **Optimize test data management** with fixtures

### Phase 3: Prevention (Ongoing)

1. **Enforce size limits** in CI/CD for test files
2. **Train team** on test modularization patterns
3. **Regular monitoring** of test file sizes

---

## Enforcement Integration

### Pre-commit Hook Integration

The existing pre-commit hook (`.git/hooks/pre-commit`) already covers test files:

```bash
# Checks ALL code files including tests
if [[ "$file" =~ \.(ts|tsx|js|jsx|py|java|go|rs|php|rb|swift|kt)$ ]]; then
```

### CI/CD Integration

The CI workflow (`.github/workflows/file-size-enforcement.yml`) scans test files:

```yaml
find . -type f \( -name "*.test.ts" -o -name "*.spec.ts" \) \
-exec wc -l {} + | sort -nr
```

### Test-Specific Monitoring

Add to monitoring script (`scripts/file-size-monitor.sh`):

```bash
# Test file specific reporting
echo "## Test File Violations" >> "$output_file"
find . -name "*.test.ts" -o -name "*.spec.ts" | while read file; do
  lines=$(wc -l < "$file")
  if [ "$lines" -gt 500 ]; then
    echo "- ❌ \`$file\`: **$lines lines** (test file)" >> "$output_file"
  fi
done
```

---

## Quality Gates for Test Files

### Coverage Requirements (Per copilot-testGeneration.instructions.md)

| Metric         | Threshold       | Test File Impact                            |
| -------------- | --------------- | ------------------------------------------- |
| Line Coverage  | ≥ 80% overall   | Each split file must maintain coverage      |
| Mutation Score | ≥ 60% (nightly) | Split files should improve mutation testing |
| Flaky Tests    | 0 tolerated     | Splitting should reduce flakiness           |

### Additional Test File Metrics

| Metric           | Threshold   | Enforcement              |
| ---------------- | ----------- | ------------------------ |
| Test File Size   | ≤ 500 lines | Pre-commit + CI blocking |
| Test Setup Size  | ≤ 100 lines | Code review guidelines   |
| Shared Utilities | ≤ 200 lines | Modular utility design   |

---

## Success Metrics

### Immediate Targets (Week 1)

- [ ] Split all test files >1,000 lines
- [ ] Extract shared test utilities
- [ ] Maintain 100% test coverage during splits

### Short-term Goals (Month 1)

- [ ] All test files under 500 lines
- [ ] Established test modularization patterns
- [ ] Team training on test file organization

### Long-term Goals (Quarterly)

- [ ] Average test file size <200 lines
- [ ] Improved test maintainability scores
- [ ] Zero new oversized test files

---

## Related Documentation

- [copilot-testGeneration.instructions.md](./copilot-testGeneration.instructions.md) - Test quality standards
- [copilot-codeReview.instructions.md](./copilot-codeReview.instructions.md) - 500-line hard cap source
- [file-size-standards.md](./file-size-standards.md) - General file size enforcement
- [CRITICAL-FILE-SIZE-CRISIS.md](../docs/CRITICAL-FILE-SIZE-CRISIS.md) - Crisis documentation

---

**Remember**: Test files are NOT exempt from the 500-line hard cap. Maintainable tests require the same modular approach as implementation code.

© 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
