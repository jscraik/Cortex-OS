# Structure Guard Integration - Required Changes

## 1. Update the structure:validate script in package.json

The current script points to a non-existent file:
```json
"structure:validate": "node scripts/validate-structure.mjs",
```

This should be updated to use the enhanced structure guard:
```json
"structure:validate": "tsx tools/structure-guard/guard-enhanced.ts",
```

## 2. Dependency Resolution

The structure-guard package has dependency conflicts with the root package. To resolve this:

Option A: Update tools/structure-guard/package.json to use the root dependencies:
```json
{
  "name": "@cortex-os/structure-guard",
  "private": true,
  "type": "module",
  "main": "guard.ts",
  "scripts": {
    "test": "cd ../.. && npx vitest run tools/structure-guard/guard.spec.ts",
    "test:enhanced": "cd ../.. && npx vitest run tools/structure-guard/guard-enhanced.spec.ts tools/structure-guard/mutation-tests.spec.ts",
    "validate": "cd ../.. && npx tsx tools/structure-guard/guard-enhanced.ts"
  }
}
```

Option B: Remove local dependencies and use root dependencies directly:
```json
{
  "name": "@cortex-os/structure-guard",
  "private": true,
  "type": "module",
  "main": "guard.ts",
  "scripts": {
    "test": "cd ../.. && npx vitest run tools/structure-guard/guard.spec.ts",
    "test:enhanced": "cd ../.. && npx vitest run tools/structure-guard/guard-enhanced.spec.ts tools/structure-guard/mutation-tests.spec.ts",
    "validate": "cd ../.. && npx tsx tools/structure-guard/guard-enhanced.ts"
  }
  // Remove dependencies and devDependencies sections
}
```

## 3. CI Integration

Add the structure guard to the CI workflow in .github/workflows/ci.yml:

```yaml
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      - run: pnpm install
      - name: Validate structure
        run: pnpm structure:validate
```

## 4. Pre-commit Hook

Add to .husky/pre-commit:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

pnpm structure:validate
```

These changes will integrate the enhanced structure guard into the Cortex OS monorepo, providing robust policy enforcement for file placement, package structure, and security compliance.