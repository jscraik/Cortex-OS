# brAInwav Tooling Guidelines

**Status:** Active  
**Last Updated:** 2025-10-05  
**Owner:** brAInwav Engineering

## Overview

This document defines mandatory tooling policies and automated guardrails for the
Cortex-OS monorepo. All contributors must follow these guidelines to maintain code
quality, consistency, and TypeScript compiler compliance.

## TypeScript Configuration Policy

### Module Resolution Requirements

**Effective Date:** 2025-10-05  
**Enforcement:** Automated CI validation

All TypeScript projects in this repository must comply with TypeScript 5.9+ module
pairing requirements:

- When `moduleResolution: "NodeNext"` is set, `module` **must** also be `"NodeNext"`
- The deprecated `ignoreDeprecations: "6.0"` setting is not supported and must be
  updated to `"5.0"` or removed

### Rationale

TypeScript 5.9+ enforces strict pairing between `module` and `moduleResolution` to
prevent runtime module resolution mismatches. Using `moduleResolution: "NodeNext"`
with `module: "ESNext"` (or other non-matching values) will cause compilation errors
and unpredictable behavior.

### Automated Validation

The repository includes an automated tsconfig validator that runs on every pull request:

**Validator Script:** `scripts/ci/validate-tsconfig.mjs`  
**CI Workflow:** `.github/workflows/validate-tsconfig.yml`  
**Triggers:** Changes to `**/tsconfig*.json` or `scripts/ci/**`

The validator:

- Scans all `tsconfig*.json` files in the repository
- Validates `module`/`moduleResolution` pairing
- Checks for unsupported `ignoreDeprecations` values
- Fails the build if violations are detected
- Generates detailed reports in `reports/logs/tsconfig-validator.txt`

### Local Usage

You can run the validator locally before committing changes:

```bash
# Preview mode (dry-run, shows what would be fixed)
node ./scripts/ci/validate-tsconfig.mjs --preview

# Preview with git-applyable patches
node ./scripts/ci/validate-tsconfig.mjs --preview=patch

# Auto-fix mode (creates .bak backups)
node ./scripts/ci/validate-tsconfig.mjs --fix

# Check specific directory
node ./scripts/ci/validate-tsconfig.mjs --root ./packages/my-package
```

### Fix Mode Options

- `--preview` or `--dry`: Show diff of intended fixes without writing files
- `--preview=patch`: Generate git-applyable patches for review
- `--fix`: Automatically apply fixes (creates `.bak` backup files)
- `--root <path>`: Specify custom root directory (default: current working directory)

### Fixing Violations

When the validator detects issues, you have two options:

#### Option 1: Manual Fix

Edit the affected `tsconfig*.json` file:

```json
{
  "compilerOptions": {
    "moduleResolution": "NodeNext",
    "module": "NodeNext",  // Must match moduleResolution
    "ignoreDeprecations": "5.0"  // Or remove if not needed
  }
}
```

#### Option 2: Automated Fix

Run the validator with `--fix` flag:

```bash
node ./scripts/ci/validate-tsconfig.mjs --fix
```

This will:

- Automatically update `module` to match `moduleResolution`
- Change `ignoreDeprecations: "6.0"` to `"5.0"`
- Create `.bak` backup files before modifications
- Generate a report of all changes made

### Inheritance Chain Resolution

The validator intelligently handles TypeScript configuration inheritance:

- If a tsconfig extends another file, the validator walks the entire chain
- Fixes are applied to the most appropriate file:
  - Prefers files that already declare a `module` setting
  - Falls back to the top-most base configuration
- This prevents duplicate or conflicting module declarations

### CI Workflow Details

**Workflow File:** `.github/workflows/validate-tsconfig.yml`

**Behavior:**

- Runs on all PRs touching tsconfig files or validator scripts
- Executes validator in check mode (fails build on violations)
- Uploads validation reports as GitHub artifacts
- Reports are available in the Actions tab for each PR

**Artifacts Generated:**

- `tsconfig-validator-report`: Full validation log
- `tsconfig-validator-patch`: Git-applyable patches (when violations found)

### Migration Notes

If you need to make package-specific typing changes during migration, add a
brAInwav-branded comment:

```json
{
  "compilerOptions": {
    // brAInwav: migration-note: Custom module config required for X (PR #123)
    "module": "NodeNext"
  }
}
```

### Test Coverage

The validator includes comprehensive test coverage:

**Test File:** `scripts/ci/__tests__/tsconfig-validator.test.ts`

**Coverage:**

- Repository-wide validation sanity check
- Fix mode functionality with temporary files
- All validator modes tested locally before CI

Run tests:

```bash
pnpm vitest run scripts/ci/__tests__/tsconfig-validator.test.ts
```

## Project References

All TypeScript packages must set `composite: true` in their `tsconfig.json` for
optimal Nx task graph performance:

```json
{
  "compilerOptions": {
    "composite": true
  }
}
```

**Enforcement:** Build failures when missing  
**Rationale:** Required for TypeScript project references and Nx incremental builds

## Code Style Requirements

See [CODESTYLE.md](../../CODESTYLE.md) for complete coding standards, including:

- Functions ≤40 lines
- Named exports only (no default exports)
- Async/await exclusively (no `.then()` chains)
- Proper error handling and brAInwav branding

## Quality Gates

All code must pass these automated checks before merge:

- ✅ TypeScript compilation (`pnpm typecheck:smart`)
- ✅ Linting (`pnpm lint:smart`)
- ✅ Testing with 90%+ coverage (`pnpm test:smart`)
- ✅ Security scanning (`pnpm security:scan`)
- ✅ Structure validation (`pnpm structure:validate`)
- ✅ tsconfig validation (automated in CI)

## Getting Help

- **Validator Issues:** Check `reports/logs/tsconfig-validator.txt` for details
- **TypeScript Config Questions:** See [TypeScript Handbook - Modules](https://www.typescriptlang.org/docs/handbook/modules.html)
- **Build Failures:** Run `pnpm readiness:check` to diagnose environment issues
- **Migration Support:** Reference `tasks/node-next-toolchain-hardening-plan.md`

## Related Documentation

- [CODESTYLE.md](../../CODESTYLE.md) - Coding standards and conventions
- [Node/Next Toolchain Hardening Plan](../../tasks/node-next-toolchain-hardening-plan.md)
- [Architecture Guide](../architecture/README.md)
- [Testing Guide](../testing.md)

## Frontend Development Guidelines

### Angular CLI Usage

**Use Angular CLI Directually:**
```bash
# Instead of extension, use CLI in terminal
ng serve                    # Development server
ng build                    # Build project
ng test                     # Run tests
```

**VS Code Extensions:**
- Angular Language Service - Better TypeScript support
- Angular Snippets - Code templates
- ESLint + Prettier - Code formatting

**For Your Workflow:**
Since you disabled the problematic extension, you can still:
1. Use Angular CLI in terminals - More control and debugging
2. Run ng serve manually - When developing Angular apps
3. Use ng build - When building for production

## Policy Updates

This policy is version-controlled and changes require:

1. PR with proposed changes to this document
2. Review by brAInwav Engineering team
3. Update to validator implementation (if needed)
4. Communication to #brAInwav-engineering channel

**Policy Version:** 1.0
**Effective Date:** 2025-10-05
**Next Review:** 2025-11-05

---

**Maintained by:** brAInwav Engineering Team
**Questions:** #brAInwav-engineering or open an issue
