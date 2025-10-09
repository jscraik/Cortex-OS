# TypeScript Project Structure Cleanup - TDD Implementation Plan

**Task ID**: `typescript-project-structure-cleanup`  
**Priority**: P1 (High - Core Infrastructure)  
**Created**: 2025-01-09  
**Status**: TDD Planning Complete  
**brAInwav Context**: Critical build infrastructure - phased implementation approach

---

## Overview

This TDD plan implements a **phased approach** to resolve TypeScript compilation failures while establishing sustainable patterns. The plan follows RED-GREEN-REFACTOR cycles with automated validation at each step.

**Key Principle**: Each phase is independently testable, deployable, and reversible.

---

## Phase 1: Quick Fix (P0 - Immediate Relief)

**Goal**: Unblock builds for 3 failing packages without breaking changes  
**Timeline**: 1-2 days  
**Success Metric**: All 3 packages build successfully

### 1.1 Test Cases (RED Phase)

#### Test 1.1.1: Validate Current Build Failures
**File**: `tests/infrastructure/typescript-config.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('Phase 1: TypeScript Build Validation', () => {
  const failingPackages = [
    'packages/services/model-gateway',
    'packages/gateway',
    'packages/model-gateway',
  ];

  it.each(failingPackages)(
    'should build %s without TypeScript errors',
    (packagePath) => {
      expect(() => {
        execSync(`cd ${packagePath} && pnpm build`, {
          cwd: process.cwd(),
          stdio: 'pipe',
        });
      }).not.toThrow();
    }
  );

  it.each(failingPackages)(
    'should not have TS6059 rootDir errors in %s',
    (packagePath) => {
      const result = execSync(
        `cd ${packagePath} && pnpm tsc --noEmit 2>&1 || true`,
        { cwd: process.cwd(), encoding: 'utf-8' }
      );
      expect(result).not.toContain('TS6059');
      expect(result).not.toContain('is not under \'rootDir\'');
    }
  );

  it.each(failingPackages)(
    'should not have TS5056 overwrite errors in %s',
    (packagePath) => {
      const result = execSync(
        `cd ${packagePath} && pnpm tsc --noEmit 2>&1 || true`,
        { cwd: process.cwd(), encoding: 'utf-8' }
      );
      expect(result).not.toContain('TS5056');
      expect(result).not.toContain('would be overwritten');
    }
  );

  it.each(failingPackages)(
    'should have composite: true in %s/tsconfig.json',
    (packagePath) => {
      const tsconfig = require(`../${packagePath}/tsconfig.json`);
      expect(tsconfig.compilerOptions?.composite).toBe(true);
    }
  );
});
```

#### Test 1.1.2: Validate Include/Exclude Correctness
```typescript
describe('Phase 1: Include/Exclude Configuration', () => {
  it('should include src in model-gateway', () => {
    const tsconfig = require('../packages/services/model-gateway/tsconfig.json');
    expect(tsconfig.include).toContain('src/**/*');
  });

  it('should exclude dist and node_modules', () => {
    const packages = [
      'packages/services/model-gateway',
      'packages/gateway',
      'packages/model-gateway',
    ];
    
    packages.forEach((pkg) => {
      const tsconfig = require(`../${pkg}/tsconfig.json`);
      expect(tsconfig.exclude).toEqual(
        expect.arrayContaining(['dist', 'node_modules'])
      );
    });
  });

  it('should handle tests directory correctly', () => {
    const tsconfig = require('../packages/services/model-gateway/tsconfig.json');
    // Either in include OR handled by separate tsconfig.spec.json
    const hasTestsIncluded = tsconfig.include?.some((p) =>
      p.includes('test')
    );
    const hasSpecConfig = fs.existsSync(
      'packages/services/model-gateway/tsconfig.spec.json'
    );
    expect(hasTestsIncluded || hasSpecConfig).toBe(true);
  });
});
```

### 1.2 Implementation Steps (GREEN Phase)

#### Step 1.2.1: Fix packages/services/model-gateway/tsconfig.json
```json
{
  "extends": "../../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "composite": true,
    "noEmit": false,
    "module": "NodeNext",
    "target": "es2022",
    "moduleResolution": "NodeNext",
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "strict": true,
    "ignoreDeprecations": "5.0"
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "dist",
    "node_modules",
    "**/*.test.ts",
    "**/*.spec.ts",
    "tests/**/*"
  ]
}
```

**Checklist**:
- [ ] Remove `rootDir: "src"` (conflicts with tests)
- [ ] Add `composite: true`
- [ ] Set `noEmit: false` (for declarations)
- [ ] Update `include` to only cover `src/**/*`
- [ ] Add comprehensive `exclude` array
- [ ] Create separate `tsconfig.spec.json` for tests

#### Step 1.2.2: Create packages/services/model-gateway/tsconfig.spec.json
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "dist-spec",
    "composite": false,
    "noEmit": true,
    "sourceMap": true
  },
  "include": [
    "tests/**/*",
    "src/**/*.test.ts",
    "src/**/*.spec.ts"
  ]
}
```

**Checklist**:
- [ ] Extends main tsconfig
- [ ] Separate outDir for test builds
- [ ] Includes test files
- [ ] Can set test-specific options

#### Step 1.2.3: Fix packages/gateway/tsconfig.json
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "composite": true,
    "noEmit": false,
    "moduleResolution": "NodeNext",
    "ignoreDeprecations": "5.0",
    "module": "NodeNext"
  },
  "include": [
    "src/**/*",
    "scripts/**/*"
  ],
  "exclude": [
    "dist",
    "node_modules",
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
```

**Checklist**:
- [ ] Remove `rootDir: "src"` (allow scripts/)
- [ ] Keep `composite: true`
- [ ] Include both `src` and `scripts`
- [ ] Exclude test files

#### Step 1.2.4: Fix packages/model-gateway/tsconfig.json
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "composite": true,
    "noEmit": false,
    "module": "NodeNext",
    "target": "es2022",
    "moduleResolution": "NodeNext",
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "strict": true,
    "ignoreDeprecations": "5.0"
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "dist",
    "node_modules",
    "**/*.test.ts",
    "**/*.spec.ts",
    "tests/**/*"
  ]
}
```

**Checklist**:
- [ ] Ensure `composite: true`
- [ ] Clean include/exclude arrays
- [ ] No rootDir conflicts

### 1.3 Validation (GREEN Verification)

```bash
# Run test suite
pnpm test tests/infrastructure/typescript-config.test.ts

# Build each package
cd packages/services/model-gateway && pnpm build
cd packages/gateway && pnpm build
cd packages/model-gateway && pnpm build

# Full quality gates
pnpm lint:smart
pnpm test:smart
pnpm typecheck:smart
```

### 1.4 Documentation Updates

**File**: `CHANGELOG.md`
```markdown
### Fixed
- TypeScript compilation errors in @cortex-os/model-gateway and @cortex-os/gateway
- Added composite: true to all buildable packages
- Separated test configuration from build configuration
- Resolved rootDir conflicts with test/script directories
```

**File**: `docs/troubleshooting/typescript-config.md` (new)
```markdown
# TypeScript Configuration Troubleshooting

## Common Errors

### TS6059: File is not under 'rootDir'
**Cause**: rootDir doesn't cover all files in include array
**Solution**: Remove rootDir or set to "." to include all directories

### TS5056: Cannot write file (would be overwritten)
**Cause**: Multiple input files compile to same output location
**Solution**: Ensure unique output paths or exclude duplicates
```

---

## Phase 2: Standardization (P1 - Sustainable Pattern)

**Goal**: Establish consistent TypeScript configuration across all packages  
**Timeline**: 1 week  
**Success Metric**: Zero non-conforming packages

### 2.1 Test Cases (RED Phase)

#### Test 2.1.1: Template Validation
**File**: `tests/infrastructure/tsconfig-template.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 2: TypeScript Configuration Templates', () => {
  const templateDir = '.cortex/templates/tsconfig';

  it('should have tsconfig.lib.json template', () => {
    expect(fs.existsSync(path.join(templateDir, 'tsconfig.lib.json'))).toBe(true);
  });

  it('should have tsconfig.spec.json template', () => {
    expect(fs.existsSync(path.join(templateDir, 'tsconfig.spec.json'))).toBe(true);
  });

  it('lib template should have required fields', () => {
    const template = JSON.parse(
      fs.readFileSync(path.join(templateDir, 'tsconfig.lib.json'), 'utf-8')
    );
    expect(template.compilerOptions.composite).toBe(true);
    expect(template.compilerOptions.outDir).toBe('dist');
    expect(template.include).toContain('src/**/*');
  });

  it('spec template should extend lib template', () => {
    const template = JSON.parse(
      fs.readFileSync(path.join(templateDir, 'tsconfig.spec.json'), 'utf-8')
    );
    expect(template.extends).toBe('./tsconfig.json');
  });
});
```

#### Test 2.1.2: Package Conformance Validation
```typescript
describe('Phase 2: All Packages Conform to Standard', () => {
  const packages = getAllBuildablePackages(); // Helper to discover packages

  it.each(packages)(
    '%s should have composite: true',
    (pkg) => {
      const tsconfig = require(`../${pkg}/tsconfig.json`);
      expect(tsconfig.compilerOptions?.composite).toBe(true);
    }
  );

  it.each(packages)(
    '%s should have consistent outDir',
    (pkg) => {
      const tsconfig = require(`../${pkg}/tsconfig.json`);
      expect(tsconfig.compilerOptions?.outDir).toBe('dist');
    }
  );

  it.each(packages)(
    '%s should exclude standard directories',
    (pkg) => {
      const tsconfig = require(`../${pkg}/tsconfig.json`);
      const requiredExcludes = ['dist', 'node_modules'];
      requiredExcludes.forEach((ex) => {
        expect(tsconfig.exclude).toContain(ex);
      });
    }
  );

  it.each(packages)(
    '%s should have separate test config if tests exist',
    (pkg) => {
      const hasTests = fs.existsSync(path.join(pkg, 'tests')) ||
                      fs.existsSync(path.join(pkg, 'src/**/*.test.ts'));
      if (hasTests) {
        const hasSpecConfig = fs.existsSync(
          path.join(pkg, 'tsconfig.spec.json')
        );
        expect(hasSpecConfig).toBe(true);
      }
    }
  );
});
```

### 2.2 Implementation Steps (GREEN Phase)

#### Step 2.2.1: Create Template Files

**File**: `.cortex/templates/tsconfig/tsconfig.lib.json`
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "dist",
    "noEmit": false,
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "es2022",
    "strict": true,
    "skipLibCheck": true,
    "ignoreDeprecations": "5.0"
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "dist",
    "node_modules",
    "**/*.test.ts",
    "**/*.spec.ts",
    "tests/**/*"
  ]
}
```

**File**: `.cortex/templates/tsconfig/tsconfig.spec.json`
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "dist-spec",
    "composite": false,
    "noEmit": true,
    "sourceMap": true,
    "types": ["vitest/globals", "node"]
  },
  "include": [
    "tests/**/*",
    "src/**/*.test.ts",
    "src/**/*.spec.ts"
  ]
}
```

**File**: `.cortex/templates/tsconfig/README.md`
```markdown
# TypeScript Configuration Templates

## Usage

### For New Libraries
1. Copy `tsconfig.lib.json` to your package root as `tsconfig.json`
2. Adjust `extends` path to reach `tsconfig.base.json`
3. If package has tests, copy `tsconfig.spec.json`

### Required Fields
- `composite: true` - Enables project references
- `outDir: "dist"` - Standard output directory
- `include: ["src/**/*"]` - Source files only

### Test Configuration
- Separate `tsconfig.spec.json` for test-specific settings
- Extends main `tsconfig.json`
- Can have different compiler options
```

**Checklist**:
- [ ] Template directory created
- [ ] tsconfig.lib.json created with standard options
- [ ] tsconfig.spec.json created for tests
- [ ] README.md documents usage

#### Step 2.2.2: Create Migration Script

**File**: `scripts/migrate-tsconfig.ts`
```typescript
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface MigrationReport {
  package: string;
  changes: string[];
  warnings: string[];
}

async function migrateTsConfig(packagePath: string): Promise<MigrationReport> {
  const report: MigrationReport = {
    package: packagePath,
    changes: [],
    warnings: [],
  };

  const tsconfigPath = path.join(packagePath, 'tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) {
    report.warnings.push('No tsconfig.json found');
    return report;
  }

  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));

  // Check composite flag
  if (tsconfig.compilerOptions?.composite !== true) {
    tsconfig.compilerOptions = tsconfig.compilerOptions || {};
    tsconfig.compilerOptions.composite = true;
    report.changes.push('Added composite: true');
  }

  // Standardize outDir
  if (tsconfig.compilerOptions?.outDir !== 'dist') {
    tsconfig.compilerOptions.outDir = 'dist';
    report.changes.push('Set outDir to dist');
  }

  // Remove problematic rootDir if conflicts exist
  if (tsconfig.compilerOptions?.rootDir && 
      tsconfig.include?.some(p => !p.startsWith('src'))) {
    delete tsconfig.compilerOptions.rootDir;
    report.changes.push('Removed conflicting rootDir');
  }

  // Ensure exclude has standard entries
  const requiredExcludes = ['dist', 'node_modules'];
  tsconfig.exclude = tsconfig.exclude || [];
  requiredExcludes.forEach((ex) => {
    if (!tsconfig.exclude.includes(ex)) {
      tsconfig.exclude.push(ex);
      report.changes.push(`Added ${ex} to exclude`);
    }
  });

  // Write back if changes made
  if (report.changes.length > 0) {
    fs.writeFileSync(
      tsconfigPath,
      JSON.stringify(tsconfig, null, 2) + '\n'
    );
  }

  // Create spec config if tests exist
  const hasTests = fs.existsSync(path.join(packagePath, 'tests'));
  const hasSpecConfig = fs.existsSync(
    path.join(packagePath, 'tsconfig.spec.json')
  );
  
  if (hasTests && !hasSpecConfig) {
    const specTemplate = fs.readFileSync(
      '.cortex/templates/tsconfig/tsconfig.spec.json',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(packagePath, 'tsconfig.spec.json'),
      specTemplate
    );
    report.changes.push('Created tsconfig.spec.json');
  }

  return report;
}

async function main() {
  // Find all packages
  const packages = await glob('packages/**/package.json', {
    ignore: ['**/node_modules/**', '**/dist/**'],
  });

  const reports: MigrationReport[] = [];

  for (const pkgJson of packages) {
    const packagePath = path.dirname(pkgJson);
    const report = await migrateTsConfig(packagePath);
    reports.push(report);
  }

  // Print summary
  console.log('brAInwav TypeScript Migration Report\n');
  reports.forEach((report) => {
    if (report.changes.length > 0 || report.warnings.length > 0) {
      console.log(`\n${report.package}:`);
      report.changes.forEach((change) => console.log(`  ✓ ${change}`));
      report.warnings.forEach((warn) => console.log(`  ⚠ ${warn}`));
    }
  });

  // Summary stats
  const totalChanges = reports.reduce((sum, r) => sum + r.changes.length, 0);
  console.log(`\n\nTotal packages processed: ${reports.length}`);
  console.log(`Total changes made: ${totalChanges}`);
}

main().catch(console.error);
```

**Checklist**:
- [ ] Script discovers all packages
- [ ] Validates each tsconfig.json
- [ ] Applies standard fixes
- [ ] Creates spec configs where needed
- [ ] Reports all changes made

#### Step 2.2.3: Update CODESTYLE.md

**File**: `CODESTYLE.md` (add new section)
```markdown
## TypeScript Project Configuration

### Standard Structure

All TypeScript packages MUST follow this configuration pattern:

**Main Config** (`tsconfig.json`):
- Extends workspace `tsconfig.base.json`
- Sets `composite: true` for buildable libraries
- Uses `outDir: "dist"`
- Includes only `src/**/*`
- Excludes `dist`, `node_modules`, test files

**Test Config** (`tsconfig.spec.json`):
- Extends package `tsconfig.json`
- Includes test files from `tests/` and `src/**/*.test.ts`
- Can override compiler options for tests

### Template Location

Templates are in `.cortex/templates/tsconfig/`:
- `tsconfig.lib.json` - Standard library config
- `tsconfig.spec.json` - Test config

### Creating New Packages

1. Copy templates to package root
2. Adjust `extends` path to reach `tsconfig.base.json`
3. Verify build: `pnpm build`

### Common Errors

**TS6059: File not under rootDir**
→ Remove `rootDir` or ensure it covers all `include` files

**TS5056: File would be overwritten**
→ Check for duplicate entries in include array

**Missing composite flag**
→ Add `"composite": true` to buildable libraries
```

**Checklist**:
- [ ] New section added to CODESTYLE.md
- [ ] Standard structure documented
- [ ] Template usage explained
- [ ] Common errors documented

#### Step 2.2.4: Add Structure Validation Rule

**File**: `scripts/structure-guard/rules/typescript-config.ts`
```typescript
import type { StructureRule } from '../types';

export const typescriptConfigRule: StructureRule = {
  name: 'typescript-config-standard',
  description: 'Validates TypeScript configurations conform to brAInwav standards',
  
  async validate(context) {
    const errors: string[] = [];
    const packages = await context.findPackages();

    for (const pkg of packages) {
      const tsconfigPath = path.join(pkg.path, 'tsconfig.json');
      if (!fs.existsSync(tsconfigPath)) {
        continue; // Not a TypeScript package
      }

      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));

      // Check composite flag for buildable libs
      if (pkg.buildable && tsconfig.compilerOptions?.composite !== true) {
        errors.push(
          `${pkg.name}: Missing "composite: true" in tsconfig.json`
        );
      }

      // Check outDir consistency
      if (tsconfig.compilerOptions?.outDir !== 'dist') {
        errors.push(
          `${pkg.name}: outDir should be "dist", found "${tsconfig.compilerOptions?.outDir}"`
        );
      }

      // Check required excludes
      const requiredExcludes = ['dist', 'node_modules'];
      const missing = requiredExcludes.filter(
        (ex) => !tsconfig.exclude?.includes(ex)
      );
      if (missing.length > 0) {
        errors.push(
          `${pkg.name}: Missing excludes: ${missing.join(', ')}`
        );
      }

      // Check for rootDir conflicts
      if (
        tsconfig.compilerOptions?.rootDir &&
        tsconfig.compilerOptions.rootDir !== '.' &&
        tsconfig.include?.some((p) => !p.startsWith(tsconfig.compilerOptions.rootDir))
      ) {
        errors.push(
          `${pkg.name}: rootDir "${tsconfig.compilerOptions.rootDir}" conflicts with include paths`
        );
      }

      // Check for test config if tests exist
      const hasTests = fs.existsSync(path.join(pkg.path, 'tests'));
      const hasSpecConfig = fs.existsSync(
        path.join(pkg.path, 'tsconfig.spec.json')
      );
      if (hasTests && !hasSpecConfig) {
        errors.push(
          `${pkg.name}: Has tests/ directory but no tsconfig.spec.json`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};
```

**Checklist**:
- [ ] Validation rule created
- [ ] Checks all required standards
- [ ] Integrated into structure-guard
- [ ] Runs in CI pipeline

### 2.3 Execution Plan

```bash
# 1. Create templates
mkdir -p .cortex/templates/tsconfig

# 2. Run migration script (dry-run first)
pnpm tsx scripts/migrate-tsconfig.ts --dry-run

# 3. Review migration report, then apply
pnpm tsx scripts/migrate-tsconfig.ts --apply

# 4. Validate all packages build
pnpm build:smart

# 5. Run structure validation
pnpm structure:validate

# 6. Run full test suite
pnpm test:smart
```

### 2.4 Refactoring (REFACTOR Phase)

After GREEN phase:
- [ ] Extract common tsconfig patterns to base config
- [ ] Simplify package-specific configs
- [ ] Remove any redundant settings
- [ ] Optimize include/exclude patterns

---

## Phase 3: Optimization (P2 - Future Sprint)

**Goal**: Enable incremental compilation with project references  
**Timeline**: 2 weeks (future sprint)  
**Success Metric**: Build time reduced by 30%

### 3.1 Test Cases (Deferred)

```typescript
describe('Phase 3: Project References & Incremental Build', () => {
  it('should have references array for packages with dependencies', () => {
    // Validate reference graph is complete
  });

  it('should support tsc --build mode', () => {
    // Test incremental compilation works
  });

  it('should generate .tsbuildinfo files', () => {
    // Verify incremental state is tracked
  });

  it('should rebuild only affected packages', () => {
    // Measure and verify rebuild performance
  });
});
```

### 3.2 Implementation (Deferred to Future Sprint)

- Map full dependency graph with `nx graph`
- Add `references` arrays to all tsconfigs
- Test `tsc --build` workflow
- Measure performance improvements
- Document best practices

---

## Implementation Checklist

### Phase 1: Quick Fix (Start Here)
- [ ] Write Phase 1 test cases
- [ ] Run tests (verify RED)
- [ ] Fix `packages/services/model-gateway/tsconfig.json`
- [ ] Create `packages/services/model-gateway/tsconfig.spec.json`
- [ ] Fix `packages/gateway/tsconfig.json`
- [ ] Fix `packages/model-gateway/tsconfig.json`
- [ ] Run tests (verify GREEN)
- [ ] Build all 3 packages successfully
- [ ] Run full quality gates
- [ ] Update CHANGELOG.md
- [ ] Create troubleshooting doc
- [ ] Commit Phase 1 changes
- [ ] Store lessons in local memory

### Phase 2: Standardization (Next)
- [ ] Write Phase 2 test cases
- [ ] Run tests (verify RED)
- [ ] Create template directory
- [ ] Create tsconfig.lib.json template
- [ ] Create tsconfig.spec.json template
- [ ] Create template README
- [ ] Write migration script
- [ ] Test migration script (dry-run)
- [ ] Run migration across all packages
- [ ] Add validation rule to structure-guard
- [ ] Update CODESTYLE.md
- [ ] Run tests (verify GREEN)
- [ ] Verify all packages build
- [ ] Run structure:validate
- [ ] Refactor common patterns
- [ ] Update documentation
- [ ] Commit Phase 2 changes
- [ ] Store insights in local memory

### Phase 3: Optimization (Future Sprint)
- [ ] Create new task for Phase 3
- [ ] Research best practices
- [ ] Map dependency graph
- [ ] Design reference structure
- [ ] Implement and test
- [ ] Measure performance gains

---

## Quality Gates

After each phase:
```bash
# Linting
pnpm lint:smart

# Type checking
pnpm typecheck:smart

# Tests
pnpm test:smart

# Security
pnpm security:scan

# Structure validation
pnpm structure:validate

# Coverage
pnpm test:coverage  # Must stay ≥90%
```

---

## Rollback Plan

### Phase 1 Rollback
```bash
git revert <phase1-commit-sha>
# Restore original tsconfigs from git history
```

### Phase 2 Rollback
```bash
# Remove templates
rm -rf .cortex/templates/tsconfig

# Revert migration
git checkout HEAD~1 -- packages/*/tsconfig.json

# Remove validation rule
git checkout HEAD~1 -- scripts/structure-guard/rules/typescript-config.ts
```

---

## Success Metrics

### Phase 1 Complete When:
- ✅ All 3 failing packages build successfully
- ✅ Zero TypeScript errors in affected packages
- ✅ All tests pass
- ✅ CI pipeline green
- ✅ Documentation updated

### Phase 2 Complete When:
- ✅ Templates created and documented
- ✅ All packages conform to standard
- ✅ Structure validation passes
- ✅ Migration guide published
- ✅ Zero violations in CI

### Phase 3 Complete When:
- ✅ Project references graph complete
- ✅ Incremental builds working
- ✅ Build time improved by ≥30%
- ✅ Documentation updated

---

## Documentation Requirements

### Must Create/Update:
1. ✅ `CHANGELOG.md` - Phase 1 and Phase 2 changes
2. ✅ `CODESTYLE.md` - New TypeScript configuration section
3. ✅ `docs/troubleshooting/typescript-config.md` - Common errors
4. ✅ `.cortex/templates/tsconfig/README.md` - Template usage
5. ⬜ `docs/guides/migration-typescript-config.md` - Migration guide
6. ⬜ `docs/decisions/typescript-project-structure.md` - ADR

---

## Risks & Mitigation (Revisited)

### Risk: Breaking existing build scripts
**Mitigation**: 
- Test each package build before/after
- Update package.json scripts if needed
- Document all script changes

### Risk: Test discovery failures
**Mitigation**:
- Run `pnpm test:smart` after each config change
- Verify coverage reports
- Check both vitest and nx test commands

### Risk: IDE integration issues
**Mitigation**:
- Test VSCode IntelliSense
- Restart TypeScript server after changes
- Document required IDE setup

---

## Next Steps After TDD Plan

1. **Review & Approve**: Get stakeholder approval on phased approach
2. **Start Phase 1**: Implement quick fixes following RED-GREEN-REFACTOR
3. **Deploy Phase 1**: Merge and monitor for issues
4. **Begin Phase 2**: After Phase 1 stabilizes (1-2 days)
5. **Schedule Phase 3**: Plan for future sprint

---

**TDD Plan Author**: brAInwav Development Team  
**Ready for Implementation**: ✅ YES  
**Start Date**: As soon as approved  
**Co-authored-by**: brAInwav Development Team
