# TypeScript Build Configuration Standards

## Overview

This document outlines the proper TypeScript build configuration standards for the Cortex-OS repository to ensure packages build correctly to the `dist` directory instead of the `src` directory.

## Root Cause Analysis

The primary issue was that the base `tsconfig.base.json` has `"noEmit": true`, which prevents TypeScript from generating output files. Package-level `tsconfig.json` files must explicitly override this setting.

### Fixed Issues

1. **Incorrect outDir path**: `libs/typescript/contracts` had `"outDir": "dist/src"`
2. **Missing noEmit override**: Multiple packages missing `"noEmit": false`
3. **Incorrect rootDir**: Some packages had problematic rootDir configurations

## Proper Package-Level tsconfig.json Structure

### Required Configuration for Building Packages

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src", 
    "noEmit": false,
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "skipLibCheck": true
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "__tests__"
  ]
}
```

### Key Configuration Points

#### Essential Settings for Build Output

- **`"noEmit": false`** - REQUIRED to enable output generation (overrides base config)
- **`"outDir": "dist"`** - Output directory (should always be "dist")
- **`"rootDir": "src"`** - Source directory (should always be "src")

#### Standard Package Settings

- **`"composite": true`** - Enables project references and incremental builds
- **`"declaration": true`** - Generates .d.ts files for TypeScript consumers
- **`"declarationMap": true`** - Enables declaration file source maps
- **`"sourceMap": true`** - Enables JavaScript source maps
- **`"skipLibCheck": true`** - Improves build performance

## Fixed Packages

The following packages have been corrected:

1. **libs/typescript/contracts** - Fixed outDir from "dist/src" to "dist"
2. **packages/agent-toolkit** - Added noEmit: false, skipLibCheck: true
3. **packages/commands** - Added noEmit: false
4. **packages/memories** - Added noEmit: false  
5. **packages/model-gateway** - Added noEmit: false
6. **packages/orchestration** - Fixed rootDir and added noEmit: false
7. **packages/mcp-registry** - Added noEmit: false
8. **packages/mcp-bridge** - Added noEmit: false
9. **packages/policy** - Added noEmit: false
10. **packages/cortex-logging** - Added noEmit: false
11. **packages/agents** - Added noEmit: false
12. **packages/evals** - Fixed rootDir and added noEmit: false

## Verification

To verify a package builds correctly:

```bash
cd packages/[package-name]
pnpm build
```

Check that files are generated in the `dist` directory:

```bash
ls -la dist/
```

## Common Anti-Patterns to Avoid

### ❌ Incorrect Configurations

```json
{
  "compilerOptions": {
    "outDir": "dist/src",           // ❌ Wrong - creates nested src structure
    "rootDir": "../../",            // ❌ Wrong - too broad
    "rootDir": ".",                 // ❌ Wrong - includes non-source files
    // Missing "noEmit": false      // ❌ Wrong - inherits noEmit: true
  }
}
```

### ✅ Correct Configurations

```json
{
  "compilerOptions": {
    "outDir": "dist",               // ✅ Correct
    "rootDir": "src",               // ✅ Correct
    "noEmit": false                 // ✅ Required for output generation
  }
}
```

## Memory Reference

Based on the TDD Coach Project Information memory:
> The project's base tsconfig has `noEmit: true`, so the package-level tsconfig.json must explicitly set `noEmit: false` or include `outDir` to enable TypeScript compilation and generate output files in the dist directory.

## Build Pipeline Integration

These fixes ensure proper integration with:
- pnpm workspace builds
- CI/CD pipelines  
- Package publishing workflows
- Development tooling

---

**Co-authored-by: brAInwav Development Team**
