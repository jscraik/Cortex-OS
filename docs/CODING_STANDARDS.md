# Cortex-OS Coding Standards

This document outlines coding standards, common issues, and prevention strategies for the Cortex-OS codebase.

## TypeScript Best Practices

### 1. Strict Type Safety

**DO:**
```typescript
// Use proper interface types instead of 'any' or 'unknown'
interface EmbedderInterface {
  embed(texts: string[]): Promise<number[][]>;
}

const embedder: EmbedderInterface = {
  embed: async (texts: string[]): Promise<number[][]> => 
    texts.map((t) => [t.length, 0, 0]),
};

// Use type guards for unknown types
function isValidStore(obj: unknown): obj is Store {
  return typeof obj === 'object' && 
         obj !== null && 
         'upsert' in obj && 
         'query' in obj;
}
```

**AVOID:**
```typescript
// Don't use 'any' without justification
const embedder = {
  embed: async (texts: any) => texts.map((t: any) => [t.length, 0, 0]),
} as any;

// Don't cast unknown to specific types without validation
const store = unknownValue as Store;
```

### 2. Function Parameters and Interfaces

**DO:**
```typescript
// Use object parameters for functions with multiple arguments
interface IngestTextParams {
  source: string;
  text: string;
  embedder: Embedder;
  store: Store;
  chunkSize?: number;
  overlap?: number;
}

async function ingestText(params: IngestTextParams): Promise<void> {
  // implementation
}
```

**AVOID:**
```typescript
// Don't use multiple individual parameters when an object would be clearer
async function ingestText(
  source: string, 
  text: string, 
  embedder: Embedder, 
  store: Store, 
  chunkSize?: number, 
  overlap?: number
): Promise<void> {
  // implementation
}
```

### 3. Error Handling and Logging

**DO:**
```typescript
// Handle errors with proper typing and structured logging
try {
  await operation();
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error(`Operation failed: ${errorMessage}`);
  throw new StructuredError('OPERATION_FAILED', errorMessage);
}
```

**AVOID:**
```typescript
// Don't pass unknown errors directly to logging
try {
  await operation();
} catch (error) {
  logger.error('Operation failed:', error); // This can cause type errors
}
```

## Common Lint Issues and Solutions

### 1. Unused Parameters

**Issue:** Parameters defined but never used in function signatures.

**Solution:**
```typescript
// Use underscore prefix for intentionally unused parameters
async function handler(_request: Request, reply: Reply) {
  return reply.send({ status: 'ok' });
}

// Or add ESLint disable comment for specific cases
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handler(_request: Request, _reply: Reply) {
  // handler implementation
}
```

### 2. Property Access on Possibly Undefined

**Issue:** Accessing properties on objects that might be undefined/null.

**Solution:**
```typescript
// Use optional chaining and type guards
if (config?.registries) {
  const registryNames = Object.keys(config.registries);
}

// Or use public methods instead of private properties
const registryNames = service.getRegistryNames();
```

### 3. RegExp Methods vs String Methods

**Issue:** SonarQube prefers `RegExp.exec()` over `String.match()` for performance.

**Solution:**
```typescript
// Instead of:
const jsFiles = files.filter((f) => f.match(/\.(ts|tsx|js|jsx)$/));

// Use:
const jsRegex = /\.(ts|tsx|js|jsx)$/;
const jsFiles = files.filter((f) => jsRegex.exec(f));
```

## Fastify Route Handler Best Practices

### 1. Parameter Naming

**DO:**
```typescript
fastify.get('/route/:param', {
  schema: {
    params: {
      type: 'object',
      properties: {
        param: { type: 'string' }
      }
    }
  }
}, async (request, reply) => {
  const { param } = request.params as { param: string };
  return reply.send({ param });
});
```

### 2. Response Schema Validation

**DO:**
```typescript
// Include all possible response codes in schema
{
  response: {
    200: { /* success schema */ },
    404: { 
      type: 'object',
      properties: {
        error: { type: 'string' },
        code: { type: 'string' }
      }
    },
    500: { 
      type: 'object',
      properties: {
        error: { type: 'string' },
        code: { type: 'string' }
      }
    }
  }
}
```

## Module Import Best Practices

### 1. Contract Imports

**Issue:** Complex module resolution between contracts and packages.

**Current Working Pattern:**
```typescript
// Import from main contracts module
import { AgentToolkitSearchInput } from '@cortex-os/contracts';

// For type-only imports
import type { Store, Embedder } from '@cortex-os/rag/lib/types';
```

### 2. Local Type Definitions

When contract imports fail, use local definitions that match the expected interface:

```typescript
// Local schema matching expected contract
const LocalSearchInputSchema = z.object({
  pattern: z.string(),
  path: z.string(),
});

type LocalSearchInput = z.infer<typeof LocalSearchInputSchema>;
```

## Testing Standards

### 1. Schema Validation Tests

```typescript
describe('Schema Validation', () => {
  it('should validate input schema', () => {
    const validInput = { pattern: 'test', path: '/src' };
    const result = schema.parse(validInput);
    expect(result.pattern).toBe('test');
  });

  it('should reject invalid input', () => {
    const invalidInput = { pattern: '', path: '/src' };
    expect(() => schema.parse(invalidInput)).toThrow();
  });
});
```

## Pre-Commit Checklist

Before committing code, ensure:

1. **Linting passes:** `pnpm lint`
2. **Tests pass:** `pnpm test`
3. **Type checking passes:** `pnpm type-check`
4. **No unused parameters** (use underscore prefix or ESLint disable)
5. **Error handling includes proper typing**
6. **Response schemas include all possible status codes**
7. **Imports use correct module paths**

## Common Error Patterns and Fixes

| Error Pattern | Fix |
|---------------|-----|
| `'_param' is defined but never used` | Add `// eslint-disable-next-line @typescript-eslint/no-unused-vars` |
| `Argument of type 'unknown' is not assignable to parameter of type 'Store'` | Use type guards or proper interface casting |
| `Cannot find module '@package/submodule'` | Check module exports and use correct import path |
| `Property 'config' is private` | Use public methods instead of accessing private properties |
| `Use the "RegExp.exec()" method instead` | Replace `string.match()` with `regex.exec()` |
| `Argument of type '404' is not assignable to parameter of type '200'` | Add all response codes to schema |

## Architecture Guidelines

### 1. Package Boundaries

- Packages should not access private members of other packages
- Use public APIs and proper interfaces
- Communicate between packages via events (A2A) or MCP tools

### 2. Error Boundaries

- Always handle errors with proper typing
- Use structured error responses
- Include meaningful error codes and messages

### 3. Contract-First Development

- Define schemas before implementation
- Use Zod for runtime validation
- Export both types and schemas from contracts

## Maintenance Commands

```bash
# Check for lint issues
pnpm lint

# Fix auto-fixable lint issues
pnpm lint:fix

# Run all tests
pnpm test

# Check types across packages
pnpm type-check

# Validate project structure
pnpm structure:validate

# Security scanning
pnpm security:scan:diff
```

## Agent Toolkit Integration (MANDATORY)

All code search, codemod, and validation operations in Cortex-OS **must** use the `agent-toolkit` package. This ensures contract-driven, event-ready, and uniform tooling across the monorepo.

- **Do not** use raw grep, sed, or ad-hoc scripts for these operations.
- Use the provided `pnpm` scripts (e.g., `pnpm lint`, `pnpm biome:staged`, `pnpm test`, `pnpm docs:lint`) and `just` recipes (`just scout`, `just codemod`, `just verify`) which invoke agent-toolkit under the hood.
- The agent-toolkit is required for:
  1. Code Search Operations (multi-tool, cross-language)
  2. Structural Modifications (codemods, refactors)
  3. Quality Validation (pre-commit, CI, and PR checks)
  4. Cross-Language Tasks (TypeScript, Python, Rust)
  5. Pre-Commit Workflows (automated validation pipelines)

**Rationale:** This enforces monorepo uniformity, contract-first development, and high code quality. All agents and developers must comply.

See `AGENTS.md` and `.github/copilot-instructions.md` for full details and usage patterns.

This document should be updated as new patterns emerge and should be referenced during code reviews to maintain consistency across the codebase.
