# TDD-Developed Fix Plan for Memory Systems and Structure Guard

## 1. Backward Compatibility Code Removal

### Remove Legacy MemoryService

**File**: `packages/memories/src/MemoryService.ts`
**Action**: Delete this file completely
**Reason**: Superseded by functional implementation in `service/memory-service.ts`

### Remove Legacy Types File

**File**: `packages/memories/src/types.ts`
**Action**: Delete this file completely
**Reason**: Duplicate type definitions moved to `domain/types.ts`

### Remove Legacy Service Entry Point

**File**: `packages/memories/src/service.ts`
**Action**: Delete this file completely
**Reason**: Unused placeholder implementation

## 2. Missing Interface Fix

### Add CacheManager Interface

**File**: `packages/memories/src/domain/types.ts`
**Action**: Add the missing CacheManager interface

```typescript
export interface CacheManager {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown, ttl?: number): Promise<void>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
  size(): Promise<number>;
}
```

## 3. Structure Guard Bug Fixes

### Fix Package Directory Detection

**File**: `tools/structure-guard/guard-enhanced.ts`
**Issue**: Package directory detection logic is incorrect
**Fix**:

```typescript
// Replace this:
const packageDirs = files.filter(
  (f) => f.startsWith('packages/') && f.split('/').length >= 3 && f.endsWith('/'),
);

// With this:
const packageDirs = [
  ...new Set(
    files.filter((f) => f.startsWith('packages/')).map((f) => `packages/${f.split('/')[1]}/`),
  ),
].filter((value, index, self) => self.indexOf(value) === index);
```

### Fix Python MLX Embedder Security Issue

**File**: `packages/memories/src/adapters/embedder.mlx.ts`
**Issue**: Insecure Python code generation
**Fix**: Create a dedicated Python script file instead of generating code

### Fix Hardcoded Paths

**File**: `packages/memories/src/adapters/embedder.mlx.ts`
**Issue**: Hardcoded volume paths
**Fix**: Make paths configurable via environment variables

## 4. MLX Integration Improvements

### Preferred Model Order

Since you prefer MLX first and Ollama as fallback:

1. **Primary**: MLX models (Qwen3-Embedding series)
2. **Secondary**: Ollama models
3. **Fallback**: OpenAI models

### Model Selection Strategy

- For development/quick search: Qwen3-Embedding-0.6B
- For production/balanced: Qwen3-Embedding-4B
- For high accuracy/research: Qwen3-Embedding-8B

## 5. Test Coverage Improvements

### Add Comprehensive Embedder Tests

**File**: `packages/memories/tests/embedders.spec.ts`
**Action**: Add tests for error handling, fallback behavior, and model selection

### Add Structure Guard Integration Tests

**File**: New test file
**Action**: Create tests that verify the structure guard works with the actual repository structure

## 6. Documentation Updates

### Update MLX Integration Documentation

**File**: `packages/memories/MLX-INTEGRATION.md`
**Action**: Update paths and usage instructions based on the fixes

### Update Structure Guard Documentation

**File**: `report/structure-guard-enhanced.audit.md`
**Action**: Update with the fixed implementation details

## Priority Implementation Order

1. **Critical Bug Fixes** (Structure Guard package detection)
2. **Missing Interface** (CacheManager)
3. **Backward Compatibility Cleanup** (Remove legacy files)
4. **Security Improvements** (MLX embedder)
5. **Test Coverage** (Add missing tests)
6. **Documentation** (Update guides)

## Verification Steps

1. Run all existing memory tests to ensure no regressions
2. Run structure guard tests
3. Test MLX embedder with actual models
4. Verify no references to deleted files
5. Check that all imports resolve correctly
