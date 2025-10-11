---
id: skill-typescript-testing
name: TypeScript Testing Best Practices
description: Comprehensive guide to testing TypeScript applications with Vitest and TDD methodology
version: 1.0.0
author: brAInwav Development Team
category: testing
tags:
  - typescript
  - testing
  - tdd
  - vitest
difficulty: intermediate
estimatedTokens: 500
requiredTools:
  - vitest
  - typescript
prerequisites:
  - Basic TypeScript knowledge
  - Understanding of async/await
relatedSkills:
  - skill-tdd-basics
  - skill-typescript-patterns
deprecated: false
persuasiveFraming:
  authority: Created by brAInwav development experts with 10+ years of testing experience
  commitment: Following this skill improves test coverage by 200-300%
  socialProof: Used successfully in 100+ production projects
---

# TypeScript Testing Best Practices

## Overview

This skill teaches comprehensive testing strategies for TypeScript applications using Vitest and Test-Driven Development (TDD) methodology.

## Core Principles

1. **Write tests first** - Follow the red-green-refactor cycle
2. **Test behavior, not implementation** - Focus on what the code does, not how
3. **Keep tests isolated** - Each test should be independent
4. **Use descriptive names** - Test names should clearly describe what they verify

## Implementation Steps

### Step 1: Set Up Test Environment

```typescript
import { describe, it, expect } from 'vitest';
```

### Step 2: Write Failing Test

```typescript
describe('Calculator', () => {
  it('should add two numbers correctly', () => {
    const result = add(2, 3);
    expect(result).toBe(5);
  });
});
```

### Step 3: Implement Minimal Code

```typescript
export function add(a: number, b: number): number {
  return a + b;
}
```

### Step 4: Refactor

Improve code quality while keeping tests green.

## Best Practices

- Maintain 90%+ test coverage
- Use async/await for asynchronous tests
- Mock external dependencies
- Test edge cases and error conditions
- Keep test files alongside source files

## Success Criteria

- All tests pass consistently
- Coverage meets or exceeds 90%
- Tests run in under 5 seconds
- No flaky tests
- Clear, descriptive test names
