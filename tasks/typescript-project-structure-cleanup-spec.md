# TypeScript Project Structure Cleanup - Specification

**Task ID**: `typescript-project-structure-cleanup`  
**Priority**: P1 (High - Core Infrastructure)  
**Created**: 2025-01-09  
**Status**: Specification Phase  
**brAInwav Context**: Critical build infrastructure improvement

---

## 1. Executive Summary

This specification defines a phased approach to resolve TypeScript compilation failures in `@cortex-os/model-gateway` and `@cortex-os/gateway` packages, while establishing sustainable patterns for the entire brAInwav Cortex-OS monorepo. The solution addresses rootDir/include conflicts, missing composite flags, and inconsistent project structures.

**Business Value**: Unblocks builds, enables incremental compilation, improves developer experience, and establishes maintainable standards.

---

## 2. User Stories (Prioritized)

### 2.1 P0 - Critical (Must Have)

#### US-001: Developer Can Build Gateway Packages
**As a** developer working on brAInwav Cortex-OS  
**I want** `@cortex-os/model-gateway` and `@cortex-os/gateway` to build successfully  
**So that** I can compile and test the entire application

**Priority Rationale**: Blocking issue preventing builds

**Independent Test Criteria**:
```bash
cd packages/services/model-gateway && pnpm build  # Must succeed
cd packages/gateway && pnpm build                 # Must succeed
cd packages/model-gateway && pnpm build           # Must succeed
```

**Acceptance Scenarios**:

**Scenario 1: Build model-gateway without errors**
```gherkin
Given the model-gateway package exists
When I run "pnpm build" in packages/services/model-gateway
Then the build completes successfully
And no TypeScript TS5056 errors occur
And no TypeScript TS6059 errors occur
And dist/ directory contains compiled files
```

**Scenario 2: Build gateway without errors**
```gherkin
Given the gateway package exists
When I run "pnpm build" in packages/gateway
Then the build compiles both src/ and scripts/
And no rootDir conflicts occur
And type declarations are generated
```

### 2.2 P1 - High (Should Have)

#### US-002: Developer Has Consistent TypeScript Configurations
**As a** developer creating new packages  
**I want** a standardized TypeScript configuration template  
**So that** new packages don't introduce build issues

**Priority Rationale**: Prevents future occurrences of this problem

**Independent Test Criteria**:
- Template exists in `.cortex/templates/tsconfig/`
- Documentation exists in CODESTYLE.md
- All existing packages conform to template

**Acceptance Scenarios**:

**Scenario 1: Create new package with template**
```gherkin
Given I'm creating a new package
When I copy the tsconfig template
And I customize package-specific paths
Then the package builds without TypeScript errors
And tests run successfully
```

#### US-003: CI Pipeline Validates TypeScript Configuration
**As a** repository maintainer  
**I want** automated validation of TypeScript configs  
**So that** non-conforming configs are caught in PR reviews

**Priority Rationale**: Maintains long-term consistency

**Independent Test Criteria**:
```bash
pnpm structure:validate  # Includes tsconfig validation
```

**Acceptance Scenarios**:

**Scenario 1: Detect missing composite flag**
```gherkin
Given a package lacks "composite: true"
When structure validation runs
Then it reports the missing flag
And fails the CI check
```

### 2.3 P2 - Medium (Could Have)

#### US-004: Build Performance Improves with Incremental Compilation
**As a** developer running frequent builds  
**I want** TypeScript incremental compilation enabled  
**So that** rebuild times are faster

**Priority Rationale**: Developer experience enhancement

**Independent Test Criteria**:
- First build creates .tsbuildinfo files
- Second build is measurably faster (<50% of first build time)
- Nx cache still functions correctly

**Acceptance Scenarios**:

**Scenario 1: Incremental build saves time**
```gherkin
Given I've built the project once
When I make a small change to one package
And I rebuild the project
Then only affected packages recompile
And total build time is reduced
```

### 2.4 P3 - Low (Won't Have This Phase)

#### US-005: Full Project References Graph
**As a** TypeScript compiler  
**I want** explicit references between all packages  
**So that** type checking is maximally efficient

**Priority Rationale**: Nice-to-have optimization for future

**Deferred To**: Phase 3 implementation (future sprint)

---

## 3. Requirements

### 3.1 Functional Requirements

**FR-001: TypeScript Configuration Consistency**
- All buildable packages MUST have `composite: true`
- All packages MUST specify `outDir: "dist"`
- All packages MUST use consistent module resolution strategy

**FR-002: Include/Exclude Clarity**
- Source files MUST be in `src/`
- Test files MUST be in `tests/` or `src/**/*.test.ts`
- Build outputs MUST be excluded from compilation

**FR-003: Path Resolution**
- Workspace imports MUST use `@cortex-os/*` aliases
- Relative imports within package are allowed
- No deep imports into other packages (use public exports)

**FR-004: Test Configuration**
- Tests MUST compile with package code
- Test-specific tsconfig can extend main config
- Coverage must remain ≥90%

### 3.2 Non-Functional Requirements

**NFR-001: Build Performance**
- Full clean build MUST complete within existing time budget (+/- 10%)
- Incremental builds SHOULD be faster than current
- Nx caching MUST remain functional

**NFR-002: Developer Experience**
- VSCode IntelliSense MUST work correctly
- No new linting errors introduced
- Hot reload MUST continue working

**NFR-003: Backward Compatibility**
- No breaking changes to public APIs
- Existing import paths remain valid
- Runtime behavior unchanged

**NFR-004: Maintainability**
- Configuration changes documented in CODESTYLE.md
- Migration guide provided for future packages
- Validation automated in CI

---

## 4. Technical Constraints

### 4.1 Architecture Decisions

**AD-001: Separate Test Configs**
- Decision: Use `tsconfig.spec.json` for test-specific configuration
- Rationale: Allows different compiler options for tests (e.g., sourceMap)
- Impact: Cleaner separation, follows Nx conventions

**AD-002: Composite Mode Required**
- Decision: All buildable libs must set `composite: true`
- Rationale: Required for project references, enables incremental builds
- Impact: Generates .tsbuildinfo files, changes build command

**AD-003: Standardized Package Structure**
- Decision: Enforce `src/` for source, `tests/` for tests
- Rationale: Consistency across monorepo, clear intent
- Impact: Some packages may need file moves

**AD-004: Remove Explicit rootDir Where Problematic**
- Decision: Phase 1 removes rootDir from failing packages
- Rationale: Quick fix to unblock, allows include of tests/scripts
- Impact: Less explicit but functional

### 4.2 Technology Stack Constraints

- **TypeScript Version**: 5.7.2 (as of repo)
- **Nx Version**: 21.4.1
- **PNPM Version**: 10.x
- **Node Version**: ≥20.x

### 4.3 Integration Points

- **Nx Build System**: Must respect Nx project graph
- **Vitest**: Must find and run tests correctly
- **ESLint**: Must parse all source files
- **Biome**: Must format all TypeScript files

---

## 5. Success Criteria

### 5.1 Phase 1 (Quick Fix) - Complete When:

- ✅ `packages/services/model-gateway` builds without errors
- ✅ `packages/gateway` builds without errors
- ✅ `packages/model-gateway` builds without errors
- ✅ All tests pass (pnpm test:smart)
- ✅ No TypeScript errors in affected packages
- ✅ CI pipeline passes for affected packages

### 5.2 Phase 2 (Standardization) - Complete When:

- ✅ Template tsconfig files created in `.cortex/templates/`
- ✅ All packages migrated to standard structure
- ✅ CODESTYLE.md updated with new guidelines
- ✅ Structure validation includes tsconfig checks
- ✅ Migration guide written
- ✅ Zero TypeScript configuration violations in CI

### 5.3 Phase 3 (Optimization) - Complete When:

- ✅ Project references graph complete
- ✅ Incremental build times measured and improved
- ✅ `tsc --build` works across all packages
- ✅ Documentation updated

---

## 6. Out of Scope

The following are explicitly **NOT** part of this task:

- ❌ Runtime code refactoring
- ❌ Dependency version upgrades (unless blocking)
- ❌ Package restructuring beyond tsconfig
- ❌ Migration to different build tools
- ❌ Changes to test frameworks
- ❌ Performance optimizations beyond TypeScript config

---

## 7. Risks & Mitigation

### Risk 1: Build Script Breaking Changes
**Probability**: Medium  
**Impact**: High  
**Mitigation**: 
- Test all build commands in CI before merge
- Document any required package.json changes
- Provide rollback commits for each phase

### Risk 2: IDE Integration Issues
**Probability**: Low  
**Impact**: Medium  
**Mitigation**:
- Test VSCode IntelliSense after each change
- Include `.vscode/settings.json` recommendations
- Document any required IDE restarts

### Risk 3: Circular Dependency Discovery
**Probability**: Medium  
**Impact**: High  
**Mitigation**:
- Run `nx graph` to identify cycles upfront
- Phase 3 explicitly addresses references
- Document known dependencies

### Risk 4: Test Discovery Failures
**Probability**: Low  
**Impact**: High  
**Mitigation**:
- Run full test suite after each config change
- Verify coverage reports are accurate
- Test both `vitest` and `nx test` commands

---

## 8. Dependencies

### Blocked By:
- None (can start immediately)

### Blocks:
- Future TypeScript version upgrades
- New package creation workflows
- Build performance optimization work

### Related Tasks:
- `structure-guard-enhancement` (validation system)
- `nx-project-graph-optimization` (future)

---

## 9. Verification & Testing Strategy

### 9.1 Unit Testing
- No new unit tests required (config-only changes)
- Existing tests must continue to pass

### 9.2 Integration Testing
```bash
# Build all affected packages
pnpm build:smart

# Run all tests
pnpm test:smart

# Verify structure
pnpm structure:validate

# Type check
pnpm typecheck:smart
```

### 9.3 Manual Testing Checklist
- [ ] VSCode shows no TypeScript errors in Problems pane
- [ ] Go-to-definition works across packages
- [ ] Auto-import suggests correct paths
- [ ] `pnpm dev` hot-reloads correctly
- [ ] Nx graph visualizes correctly

### 9.4 Acceptance Testing
Each user story has independent acceptance scenarios (see Section 2)

---

## 10. Documentation Requirements

### Must Update:
1. **CODESTYLE.md** - Add TypeScript project structure section
2. **README.md** - Update build instructions if changed
3. **CHANGELOG.md** - Document changes made
4. **`.cortex/templates/`** - Add tsconfig templates

### Should Create:
1. **Migration Guide** - How to fix non-conforming packages
2. **Troubleshooting Guide** - Common TypeScript config errors
3. **Decision Log** - Why we chose this approach

---

## 11. Rollout Plan

### Phase 1: Quick Fix (1-2 days)
1. Fix 3 failing packages
2. Verify builds pass
3. Commit with descriptive message
4. Monitor CI

### Phase 2: Standardization (1 week)
1. Create templates
2. Migrate packages in batches of 5
3. Test after each batch
4. Update documentation
5. Deploy validation

### Phase 3: Optimization (2 weeks, future sprint)
1. Map dependency graph
2. Add project references
3. Measure performance improvements
4. Document best practices

---

## 12. Acceptance Criteria Summary

**Definition of Done**:
- [ ] All P0 user stories implemented and tested
- [ ] All P1 user stories implemented and tested
- [ ] Quality gates pass (lint, test, typecheck, security)
- [ ] Documentation updated (CODESTYLE.md, CHANGELOG.md)
- [ ] Migration guide created
- [ ] Templates created
- [ ] CI validates new structure
- [ ] Code reviewed and approved
- [ ] Changes deployed to main branch

---

**Specification Author**: brAInwav Development Team  
**Next Phase**: Create TDD plan  
**Status**: ✅ Ready for TDD planning
