# TypeScript Configuration Troubleshooting

**brAInwav Cortex-OS Development Guide**

---

## Common TypeScript Configuration Errors

### TS6059: File is not under 'rootDir'

**Full Error**:
```
error TS6059: File '/path/to/file.ts' is not under 'rootDir' '/path/to/src'. 
'rootDir' is expected to contain all source files.
```

**Cause**: The `rootDir` compiler option doesn't cover all files in the `include` array.

**Solution**: 
1. **Option A (Recommended)**: Remove `rootDir` from tsconfig.json
   ```json
   {
     "compilerOptions": {
       "outDir": "dist",
       // Remove "rootDir": "src"
     },
     "include": ["src/**/*", "tests/**/*"]
   }
   ```

2. **Option B**: Set rootDir to "." to include all directories
   ```json
   {
     "compilerOptions": {
       "rootDir": ".",
       "outDir": "dist"
     }
   }
   ```

3. **Option C (Best Practice)**: Separate test configuration
   ```json
   // tsconfig.json (for src only)
   {
     "compilerOptions": {
       "rootDir": "src",
       "outDir": "dist"
     },
     "include": ["src/**/*"]
   }
   
   // tsconfig.spec.json (for tests)
   {
     "extends": "./tsconfig.json",
     "compilerOptions": {
       "rootDir": ".",
       "outDir": "dist-spec"
     },
     "include": ["tests/**/*", "src/**/*.test.ts"]
   }
   ```

---

### TS5056: Cannot write file (would be overwritten)

**Full Error**:
```
error TS5056: Cannot write file 'dist/xyz.d.ts' because it would be overwritten by multiple input files.
```

**Cause**: Multiple input files compile to the same output location, usually due to:
- Duplicate files in `include` array
- Overlapping glob patterns
- Missing `exclude` for generated files

**Solution**:
1. **Add proper excludes**:
   ```json
   {
     "exclude": [
       "dist",
       "node_modules",
       "**/*.test.ts",
       "**/*.spec.ts"
     ]
   }
   ```

2. **Check for duplicate includes**:
   ```json
   {
     "include": [
       "src/**/*",
       // Don't also include "src/index.ts" - already covered!
     ]
   }
   ```

3. **Ensure generated files are excluded**:
   ```json
   {
     "exclude": [
       "dist",
       "**/*.generated.ts"  // Exclude code-generated files
     ]
   }
   ```

---

### TS6307: File is not listed within the file list

**Full Error**:
```
error TS6307: File '/path/to/file.ts' is not listed within the file list of project 
'/path/to/tsconfig.json'. Projects must list all files or use an 'include' pattern.
```

**Cause**: When using `composite: true`, TypeScript requires explicit file listing or include patterns for cross-package references.

**Solution** (Requires Phase 3 - Project References):
1. **Add project references**:
   ```json
   {
     "compilerOptions": {
       "composite": true
     },
     "references": [
       { "path": "../other-package" }
     ]
   }
   ```

2. **Ensure all referenced packages have composite: true**

**Phase 1 Workaround**: This error occurs when importing from other workspace packages. Phase 1 focuses on local tsconfig correctness. Full resolution requires Phase 3 implementation.

---

### Missing composite: true

**Error**: Build system or IDE shows errors about missing composite flag.

**Cause**: Package is buildable but missing `composite: true` in tsconfig.

**Solution**:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,      // Required for buildable packages
    "outDir": "dist",
    "noEmit": false         // Must emit when composite is true
  }
}
```

**Why it matters**:
- Enables incremental compilation
- Required for TypeScript project references
- Generates `.tsbuildinfo` for faster rebuilds
- brAInwav standard for all buildable libraries

---

### Include/Exclude Best Practices

**Recommended Pattern**:
```json
{
  "compilerOptions": {
    "composite": true,
    "outDir": "dist"
  },
  "include": [
    "src/**/*"            // Source code only
  ],
  "exclude": [
    "dist",               // Build output
    "node_modules",       // Dependencies
    "**/*.test.ts",       // Test files (use tsconfig.spec.json)
    "**/*.spec.ts",
    "tests/**/*"
  ]
}
```

**For packages with tests**, create separate `tsconfig.spec.json`:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "dist-spec",
    "composite": false,
    "noEmit": true,
    "types": ["vitest/globals", "node"]
  },
  "include": [
    "tests/**/*",
    "src/**/*.test.ts",
    "src/**/*.spec.ts"
  ]
}
```

---

## brAInwav TypeScript Configuration Standards

### Required Fields

All buildable packages MUST have:
- ✅ `composite: true`
- ✅ `outDir: "dist"`
- ✅ `noEmit: false` (when composite is true)
- ✅ Extends workspace `tsconfig.base.json`

### Standard Structure

```
package/
├── src/
│   └── (source code)
├── tests/
│   └── (test files)
├── tsconfig.json       # Main config (src only)
└── tsconfig.spec.json  # Test config (optional)
```

### Template Location

Templates will be available in `.cortex/templates/tsconfig/` (Phase 2):
- `tsconfig.lib.json` - For new libraries
- `tsconfig.spec.json` - For test configuration
- `README.md` - Usage instructions

---

## Checking Configuration

### Validate tsconfig
```bash
# Check for errors in a specific package
cd packages/your-package
pnpm tsc --noEmit

# Build package
pnpm build
```

### Run Structure Validation
```bash
# Validate all TypeScript configurations
pnpm structure:validate
```

### Quality Gates
```bash
# Full validation before PR
pnpm lint:smart
pnpm typecheck:smart
pnpm test:smart
pnpm security:scan
```

---

## Quick Fixes

### Package won't build

1. **Check tsconfig has composite: true**
   ```bash
   cat tsconfig.json | jq '.compilerOptions.composite'
   ```

2. **Check outDir is set**
   ```bash
   cat tsconfig.json | jq '.compilerOptions.outDir'
   ```

3. **Remove rootDir if present**
   ```bash
   # Edit tsconfig.json and remove rootDir line
   ```

4. **Ensure proper exclude array**
   ```json
   {
     "exclude": ["dist", "node_modules", "**/*.test.ts"]
   }
   ```

### IDE shows errors but build works

1. **Restart TypeScript server** (VSCode: Cmd+Shift+P → "Restart TS Server")
2. **Delete .tsbuildinfo files**: `find . -name "*.tsbuildinfo" -delete`
3. **Clean build**: `rm -rf dist && pnpm build`

### Cross-package import errors

**Phase 1 Limitation**: Cross-package TypeScript compilation errors (TS6307, TS6059 from other packages) are expected until Phase 3 project references implementation.

**Workaround**: Use runtime builds with `pnpm build:smart` which handles workspace dependencies correctly.

---

## Phase Implementation Status

✅ **Phase 1 Complete**: Local tsconfig correctness
- No rootDir conflicts
- composite: true set
- Proper include/exclude arrays

⬜ **Phase 2 (Next)**: Standardization
- Templates created
- Migration script
- Automated validation

⬜ **Phase 3 (Future)**: Project References
- Cross-package type checking
- Incremental compilation
- Full build optimization

---

## Related Documentation

- [CODESTYLE.md](../../CODESTYLE.md) - brAInwav coding standards
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Nx TypeScript Configuration](https://nx.dev/recipes/tips-n-tricks/typescript-projects)

---

**Maintained by**: brAInwav Development Team  
**Last Updated**: 2025-01-09  
**Phase**: 1 (Quick Fix Complete)
