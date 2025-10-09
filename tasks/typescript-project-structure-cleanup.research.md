# TypeScript Project Structure Cleanup - Research Phase

**Task ID**: `typescript-project-structure-cleanup`  
**Priority**: P1  
**Created**: 2025-01-09  
**Status**: Research Phase  
**brAInwav Context**: Critical build infrastructure issue

---

## Executive Summary

Building broader packages like `@cortex-os/model-gateway` and `@cortex-os/gateway` fails due to longstanding TypeScript path/rootDir issues unrelated to transport changes. Their tsconfigs pull in many other workspaces, creating a web of incompatible path configurations. This requires a comprehensive repo-wide TypeScript project structure cleanup.

---

## 1. Current State Observations

### 1.1 Failing Packages

**Primary Affected Packages**:
- `packages/services/model-gateway/` - Has tests/ in include but no rootDir
- `packages/gateway/` - Has scripts/ in include with rootDir=src
- `packages/model-gateway/` - Standard structure but pulls many dependencies

### 1.2 TypeScript Configuration Issues

**Problem Pattern 1: Inconsistent rootDir**
```json
// packages/services/model-gateway/tsconfig.json
{
  "compilerOptions": {
    "rootDir": "src"  // But includes "tests/**/*"
  },
  "include": ["src/**/*", "tests/**/*"]  // Conflict!
}
```

**Problem Pattern 2: Missing composite: true**
```json
// Some packages lack composite flag
{
  "compilerOptions": {
    "composite": false  // Or missing entirely
  }
}
```

**Problem Pattern 3: Path Resolution Conflicts**
- Packages reference workspace dependencies via paths
- Base tsconfig.json paths may conflict with local paths
- Cross-workspace imports don't resolve correctly

### 1.3 Build Error Symptoms

```
error TS5056: Cannot write file 'dist/xyz.d.ts' because it would be overwritten by multiple input files.
error TS6059: File 'tests/xyz.test.ts' is not under 'rootDir' 'src'.
```

---

## 2. External Standards & References

### 2.1 TypeScript Project References

**Official Documentation**: [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)

**Key Requirements**:
- All referenced projects must have `composite: true`
- `rootDir` must encompass all files in `include`
- `references` array must list dependencies
- Build order determined by reference graph

### 2.2 Nx Workspace TypeScript Configuration

**Nx Best Practices**:
- Use `tsconfig.base.json` for shared paths
- Each package has own `tsconfig.json` extending base
- Use `composite: true` for all buildable libs
- Separate `tsconfig.lib.json` and `tsconfig.spec.json`

### 2.3 Monorepo TypeScript Patterns

**Industry Standards**:
- **Turborepo Pattern**: Individual tsconfig per package with minimal base
- **Lerna Pattern**: Shared config with per-package overrides
- **PNPM Workspace Pattern**: Workspace protocol with path mapping

---

## 3. Technology Research

### Option 1: Standardized Project Structure

**Approach**: Create consistent structure across all packages

```
packages/
  <package>/
    src/           # Source code only
    tests/         # Test code
    scripts/       # Build scripts
    tsconfig.json      # Main config (src only, composite: true)
    tsconfig.spec.json # Test config (extends main, includes tests)
    tsconfig.build.json # Build config (production)
```

**Pros**:
- Clear separation of concerns
- Consistent across entire monorepo
- Standard Nx pattern
- Easy to understand

**Cons**:
- Requires restructuring many packages
- Breaking change for existing build scripts
- May need migration period

### Option 2: Per-Package rootDir Elimination

**Approach**: Remove `rootDir` constraints, use include/exclude only

```json
{
  "compilerOptions": {
    "outDir": "dist",
    "composite": true
    // No rootDir
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["dist", "node_modules"]
}
```

**Pros**:
- Minimal changes required
- Maintains current structure
- Quick fix

**Cons**:
- Less explicit structure
- May cause output path issues
- Harder to maintain long-term

### Option 3: Workspace-Wide Project References Graph

**Approach**: Create explicit reference graph for all packages

```json
// packages/gateway/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "rootDir": ".",
    "outDir": "dist"
  },
  "references": [
    {"path": "../model-gateway"},
    {"path": "../transport"}
  ],
  "include": ["src", "tests", "scripts"]
}
```

**Pros**:
- Correct TypeScript project references
- Enables incremental builds
- Type-safe cross-package imports
- Future-proof

**Cons**:
- Most complex to implement
- Requires mapping all dependencies
- Initial setup time intensive

---

## 4. Comparative Analysis

| Criteria | Option 1: Standardized | Option 2: Remove rootDir | Option 3: Project References |
|----------|------------------------|-------------------------|------------------------------|
| **Implementation Time** | High (1-2 weeks) | Low (1-2 days) | Very High (2-3 weeks) |
| **Long-term Maintainability** | Excellent | Fair | Excellent |
| **Build Performance** | Good | Fair | Excellent (incremental) |
| **Breaking Changes** | High | Low | Medium |
| **Type Safety** | Good | Fair | Excellent |
| **Nx Compatibility** | Excellent | Good | Excellent |
| **Developer Experience** | Excellent | Fair | Excellent |

---

## 5. Recommended Approach

**Hybrid Strategy: Phased Implementation**

### Phase 1: Quick Fix (P0 - Immediate)
Apply Option 2 to failing packages (`model-gateway`, `gateway`) to unblock builds:
- Remove restrictive `rootDir` settings
- Add proper `include`/`exclude` arrays
- Ensure `composite: true` is set
- Verify builds pass

### Phase 2: Standardization (P1 - Next Sprint)
Apply Option 1 pattern to all packages:
- Create template tsconfig structure
- Migrate packages one-by-one
- Use `tsconfig.lib.json` for source
- Use `tsconfig.spec.json` for tests
- Update build scripts

### Phase 3: Project References (P2 - Future)
Implement Option 3 for optimization:
- Map full dependency graph
- Add `references` arrays
- Enable `--build` mode
- Configure incremental compilation

**Rationale**:
- **Immediate**: Unblock builds without disruption
- **Sustainable**: Move toward industry standard structure
- **Optimized**: Enable TypeScript's best features long-term
- **brAInwav Aligned**: Maintains quality standards throughout

---

## 6. Constraints & Considerations

### 6.1 brAInwav-Specific Requirements

- **Zero Breaking Changes to APIs**: Only internal build config changes
- **Maintain Test Coverage**: 90%+ coverage must be preserved
- **CI/CD Compatibility**: All changes must pass existing quality gates
- **Documentation**: Update CODESTYLE.md with new patterns
- **Accessibility**: No impact (build-only changes)

### 6.2 Technical Constraints

- **Nx Integration**: Must work with Nx 21.4.1 caching
- **PNPM Workspaces**: Must respect workspace protocol
- **Existing Scripts**: Minimize changes to `package.json` scripts
- **IDE Support**: VSCode must still provide IntelliSense

### 6.3 Migration Risks

- **Build Script Changes**: May affect CI/CD pipelines
- **Import Path Changes**: Should not affect runtime imports
- **Developer Workflow**: Minimize disruption to active development
- **Rollback Plan**: Each phase must be independently reversible

---

## 7. Open Questions

### Q1: Which packages are affected beyond model-gateway and gateway?
**Action**: Run `pnpm build` across all packages to identify failures

### Q2: Are there circular dependencies in the project graph?
**Action**: Use `nx graph` to visualize dependencies

### Q3: Do any packages use custom build scripts that rely on current structure?
**Action**: Audit `package.json` build scripts across workspace

### Q4: What is the impact on developer hot-reload/watch mode?
**Action**: Test `pnpm dev` with new configs

### Q5: Are there external tools (IDE extensions, linters) that depend on current structure?
**Action**: Test with VSCode TypeScript extension and ESLint

---

## 8. Next Steps

### Immediate Actions
1. ✅ Complete this research document
2. ⬜ Create specification document with acceptance criteria
3. ⬜ Identify all affected packages (audit script)
4. ⬜ Document current vs. desired tsconfig for each package type
5. ⬜ Create migration checklist

### Phase 1 Implementation
1. Fix `packages/services/model-gateway/tsconfig.json`
2. Fix `packages/gateway/tsconfig.json`
3. Fix `packages/model-gateway/tsconfig.json`
4. Verify builds pass
5. Run full test suite

### Documentation Updates
1. Update `CODESTYLE.md` with new TypeScript project structure guidelines
2. Create migration guide for future packages
3. Update repository README with build instructions

---

## 9. References

- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Nx TypeScript Configuration](https://nx.dev/recipes/tips-n-tricks/typescript-projects)
- [PNPM Workspace Protocol](https://pnpm.io/workspaces)
- [brAInwav CODESTYLE.md](../../CODESTYLE.md)

---

**Research Completed By**: brAInwav Development Team  
**Next Phase**: Create specification and TDD plan  
**Status**: ✅ Ready for planning phase
