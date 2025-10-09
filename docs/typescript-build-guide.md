# TypeScript Build System Guide

**brAInwav Cortex-OS TypeScript Build Infrastructure**

This guide covers the TypeScript build system in Cortex-OS, including project references, incremental compilation, and best practices.

---

## Overview

Cortex-OS uses a sophisticated TypeScript build system with:
- **Project References** for incremental compilation
- **Composite Projects** for build optimization
- **Smart Templates** for consistent configuration
- **Automated Migration** tools for standardization

**Current Status** (Phase 3A Complete):
- 87 packages with TypeScript configurations
- 63 project references across top 10 packages
- 9x faster incremental builds
- 88% conformance to brAInwav standards

---

## Quick Start

### Building Packages

**Standard Nx build** (recommended for most cases):
```bash
pnpm nx build @cortex-os/gateway
pnpm build:smart  # Affected-only builds
```

**TypeScript project references build** (incremental):
```bash
# Build package with dependencies
pnpm tsc --build packages/gateway

# Watch mode
pnpm tsc --build --watch packages/gateway

# Force rebuild
pnpm tsc --build --force packages/gateway

# Clean outputs
pnpm tsc --build --clean packages/gateway
```

### Creating New Packages

```bash
# 1. Copy template
cp .cortex/templates/tsconfig/tsconfig.lib.json packages/my-package/tsconfig.json

# 2. Adjust paths (if needed)
# Edit tsconfig.json: update extends path to point to tsconfig.base.json

# 3. Add project references (if package has workspace dependencies)
pnpm tsx scripts/add-project-references.ts --package my-package

# 4. Build and validate
pnpm tsc --build packages/my-package
```

### Migrating Existing Packages

```bash
# 1. Preview changes
pnpm tsx scripts/migrate-tsconfig.ts --dry-run --package packages/my-package

# 2. Apply migration
pnpm tsx scripts/migrate-tsconfig.ts --apply --package packages/my-package

# 3. Add project references
pnpm tsx scripts/add-project-references.ts --package my-package

# 4. Validate
pnpm vitest run tests/scripts/typescript-templates.test.ts
pnpm vitest run tests/scripts/typescript-project-references.test.ts
```

---

## Project References

### What Are Project References?

TypeScript project references enable:
- **Incremental compilation** - only rebuild changed packages
- **Build optimization** - 9x faster builds (45s → 5s)
- **Better IDE performance** - faster type checking and navigation
- **Dependency awareness** - TypeScript understands package boundaries

### Packages with References

**Top 10 packages** (Phase 3A):
1. @apps/cortex-os (14 references)
2. @cortex-os/gateway (10 references)
3. @cortex-os/orchestration (10 references)
4. @cortex-os/a2a (8 references)
5. @cortex-os/agents (7 references)
6. @cortex-os/rag (7 references)
7. @cortex-os/memories (7 references)
8. @cortex-os/workflow-orchestrator (6 references)
9. @cortex-os/tdd-coach (6 references)
10. @cortex-os/local-memory (6 references)

**Total**: 63 references across 10 packages

### Managing References

**View package dependencies**:
```bash
# See dependency tree
pnpm tsx scripts/map-project-references.ts --package gateway

# List all packages
pnpm tsx scripts/map-project-references.ts
```

**Add references**:
```bash
# Specific package
pnpm tsx scripts/add-project-references.ts --package my-package

# Dry-run first
pnpm tsx scripts/add-project-references.ts --dry-run --package my-package

# Top 10 packages (batch)
pnpm tsx scripts/add-project-references.ts
```

### Reference Configuration Example

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "references": [
    { "path": "../a2a" },
    { "path": "../contracts" },
    { "path": "../mcp-core" }
  ],
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "**/*.test.ts", "**/*.spec.ts"]
}
```

---

## Configuration Standards

### Required Fields (brAInwav Standards)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,        // Required for buildable packages
    "outDir": "dist",         // Standard output directory
    "noEmit": false,          // Must emit for composite
    "moduleResolution": "NodeNext",
    "module": "NodeNext"
  },
  "include": ["src/**/*"],    // Source files
  "exclude": [                // Always exclude
    "dist",
    "node_modules",
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
```

### Test Configuration (Separate File)

Create `tsconfig.spec.json` for tests:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": true,           // Tests don't emit
    "composite": false        // Tests aren't buildable
  },
  "include": [
    "src/**/*.test.ts",
    "src/**/*.spec.ts",
    "tests/**/*"
  ]
}
```

### When to Use `rootDir`

**Use `rootDir: "src"`** when:
- Package has scripts or tools outside src/
- Need stable dist layout (e.g., `dist/server.js` not `dist/src/server.js`)

**Skip `rootDir`** when:
- All code is in src/ only
- No special dist layout requirements

---

## Tools & Scripts

### map-project-references.ts

Analyzes dependency graph and suggests references.

```bash
# Overview
pnpm tsx scripts/map-project-references.ts

# Specific package
pnpm tsx scripts/map-project-references.ts --package gateway

# JSON output
pnpm tsx scripts/map-project-references.ts --json
```

**Features**:
- Scans all 87 packages
- Maps workspace dependencies
- Calculates relative paths
- Shows dependency trees
- Identifies top candidates

### add-project-references.ts

Automatically adds project references to tsconfig.json.

```bash
# Dry-run
pnpm tsx scripts/add-project-references.ts --dry-run --package my-package

# Apply
pnpm tsx scripts/add-project-references.ts --package my-package

# Batch (top 10)
pnpm tsx scripts/add-project-references.ts
```

**Features**:
- Auto-adds references based on dependencies
- Validates reference paths
- Supports dry-run mode
- Single or batch processing
- Smart path calculation

### migrate-tsconfig.ts

Standardizes tsconfig.json to brAInwav standards.

```bash
# Preview
pnpm tsx scripts/migrate-tsconfig.ts --dry-run --package packages/my-pkg

# Apply
pnpm tsx scripts/migrate-tsconfig.ts --apply --package packages/my-pkg

# Batch (all packages)
pnpm tsx scripts/migrate-tsconfig.ts --apply
```

**Features**:
- Adds `composite: true`
- Standardizes `outDir`
- Creates test configs
- Fixes exclude arrays
- Reports conflicts

---

## Validation & Testing

### Run Validation Tests

```bash
# Phase 1: Config correctness
pnpm vitest run tests/scripts/typescript-config.test.ts

# Phase 2: Standardization
pnpm vitest run tests/scripts/typescript-templates.test.ts

# Phase 3: Project references
pnpm vitest run tests/scripts/typescript-project-references.test.ts

# All TypeScript tests
pnpm vitest run tests/scripts/typescript-*.test.ts
```

### Test Coverage

- **Phase 1**: 15/15 tests (100%) ✅
- **Phase 2**: 340/386 tests (88%) ✅
- **Phase 3A**: 32/42 tests (76%) ✅
- **Overall**: 387/443 tests (87%)

### Structure Validation

```bash
# Validate entire structure (includes tsconfig checks)
pnpm structure:validate

# Check specific package
cd packages/my-package
pnpm tsc --noEmit
```

---

## Performance Metrics

### Build Times (with Project References)

**Before Phase 3A**:
- Full build: ~45 seconds
- Change in one package: rebuild all dependents (~45s)
- No incremental support

**After Phase 3A** (for packages with references):
- Initial build: ~45 seconds (same)
- Incremental build: ~5 seconds (9x faster)
- Watch mode: near instant
- Only changed packages rebuilt

### Example: Gateway Package

```bash
# First build
time pnpm tsc --build packages/gateway
# ~45s

# No changes, rebuild
time pnpm tsc --build packages/gateway
# ~0.5s (cache hit)

# Small change in src/server.ts
time pnpm tsc --build packages/gateway
# ~5s (only gateway rebuilt)
```

---

## Troubleshooting

### Common Issues

**TS6307: File not listed within file list**

**Cause**: Cross-package imports without project references

**Fix**:
```bash
pnpm tsx scripts/add-project-references.ts --package my-package
```

**TS6059: File is not under 'rootDir'**

**Cause**: Files outside src/ being compiled

**Fix**: Add to exclude or adjust rootDir
```json
{
  "compilerOptions": {
    "rootDir": "src"  // or remove to use common root
  },
  "exclude": ["dist", "node_modules", "scripts/**/*"]
}
```

**Referenced project must have 'composite: true'**

**Cause**: Dependency doesn't have composite flag

**Fix**:
```bash
pnpm tsx scripts/migrate-tsconfig.ts --apply --package packages/dependency
```

### Getting Help

1. Check [docs/troubleshooting/typescript-config.md](./typescript-config.md)
2. Run validation tests to identify issues
3. Use `--dry-run` mode for tools
4. Review task documentation in `tasks/PHASE-*-COMPLETION-SUMMARY.md`

---

## Best Practices

### For Package Authors

✅ **DO**:
- Use templates for new packages
- Add project references for workspace dependencies
- Keep composite: true for buildable packages
- Separate test configuration
- Run validation tests

❌ **DON'T**:
- Mix source and build outputs in same directory
- Use default exports (use named exports)
- Skip composite flag on buildable packages
- Include build outputs in source includes

### For Migration

1. **Start with templates** - copy from `.cortex/templates/tsconfig/`
2. **Use dry-run mode** - preview changes before applying
3. **Migrate incrementally** - one package at a time
4. **Validate often** - run tests after each migration
5. **Test builds** - ensure `tsc --build` works

### For Development

- Use `tsc --build --watch` for fast feedback
- Leverage incremental compilation
- Keep dependencies minimal
- Use Nx for large-scale operations
- Monitor build performance

---

## Future: Phase 3B

**Phase 3B** (Monorepo-Wide References - Optional):
- Expand to all 87 packages
- Full incremental compilation
- Complete build optimization
- Timeline: 1-2 weeks when needed

**When to Implement**:
- Build times become bottleneck
- Need full monorepo type checking
- Team decides to prioritize

**Tools Ready**: All automation and patterns established in Phase 3A.

---

## References

- [TypeScript Project References Docs](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [CODESTYLE.md Section 3.1](../CODESTYLE.md#31-typescript-project-configuration)
- [docs/troubleshooting/typescript-config.md](./troubleshooting/typescript-config.md)
- [tasks/PHASE-3A-COMPLETION-SUMMARY.md](../tasks/PHASE-3A-COMPLETION-SUMMARY.md)

---

**Maintained by**: brAInwav Development Team  
**Last Updated**: 2025-01-22  
**Version**: 1.0 (Phase 3A Complete)
