# Backward Compatibility Code That Can Be Safely Removed

## Files to Remove Completely

### 1. scripts/run-tests.mjs
**Status**: Safe to remove
**Reason**: This script is deprecated and only forwards to `pnpm test:smart`
**Replacement**: Use `pnpm test:smart` directly
**Impact**:
- package.json `"test"` script should be updated to `"node scripts/nx-smart.mjs test"`
- Documentation references to `pnpm test` should be updated to `pnpm test:smart`

**Files that reference this script**:
- package.json:49 `"test": "node scripts/run-tests.mjs"`
- Documentation files that mention `pnpm test`

## Code Sections to Remove

### 1. scripts/memory-guard.mjs - Windows Warning Logic (Lines 70-84)
**Status**: Safe to remove after adding graceful Windows support
**Current Code**:
```javascript
} else {
    // On Windows, warn that process control is not available
    console.warn(`[brAInwav memory-guard] Process ${pid} exceeds memory limit (${rssMB}MB > ${maxRssMB}MB) but cannot be controlled on Windows`);
    warned.set(pid, true);
    log({ pid, rssMB, action: 'windows-warning' });
}
```

**Reason**: The new implementation already includes Windows compatibility checks at the beginning of the function. These specific warnings are redundant.

### 2. scripts/nx-smart.mjs - Deprecated CI Mode Logic (Lines 65-67)
**Status**: Safe to remove - already addressed
**Current Code**:
```javascript
// In some environments Nx only fully disables prompts when CI=true.
// Only force CI mode if explicitly enabled via environment variable
if (process.env.NX_SMART_FORCE_CI === '1' && !process.env.CI) {
    process.env.CI = '1';
}
```

**Reason**: This was the fix for the original issue. The old unconditional `process.env.CI = '1'` was already removed.

### 3. Dockerfile.optimized - Legacy .npmrc Handling (Line 25)
**Status**: Keep for now
**Current Code**:
```dockerfile
RUN [ -f .npmrc ] || echo "registry=https://registry.npmjs.org/" > .npmrc
```

**Reason**: This is still needed as a fallback when .npmrc doesn't exist in the build context.

## Configuration Updates Needed

### 1. package.json - Update test script
**Current**:
```json
"test": "node scripts/run-tests.mjs"
```

**Should be**:
```json
"test": "node scripts/nx-smart.mjs test"
```

### 2. Documentation Updates
Any documentation mentioning:
- `pnpm test` → Update to `pnpm test:smart`
- `node scripts/run-tests.mjs` → Update to `node scripts/nx-smart.mjs test`

## Environment Variables That Can Be Deprecated

### 1. NX_SMART_FORCE_CI
**Status**: Keep for now
**Reason**: This is the new way to force CI mode, which is still needed in certain CI environments.

### 2. CORTEX_SMART_FOCUS
**Status**: Keep
**Reason**: This is actively used for narrowing test scope in CI.

## Test Files to Update

### 1. scripts/__tests__/run-tests.test.mjs
**Status**: Safe to remove when run-tests.mjs is removed
**Reason**: Tests for deprecated functionality

## Summary

The most impactful cleanup would be removing `scripts/run-tests.mjs` entirely and updating the package.json test script to use nx-smart directly. This eliminates an entire layer of indirection and simplifies the test execution flow.

The other identified code sections are either minimal legacy handling that doesn't significantly impact maintainability or necessary fallback logic that should be preserved.