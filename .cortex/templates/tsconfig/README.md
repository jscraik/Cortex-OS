# brAInwav TypeScript Configuration Templates

**Location**: `.cortex/templates/tsconfig/`  
**Purpose**: Standard TypeScript configurations for brAInwav Cortex-OS monorepo  
**Maintained by**: brAInwav Development Team

---

## Available Templates

### 1. `tsconfig.lib.json` - Standard Library Configuration

Use this for all buildable TypeScript packages in the monorepo.

**Features**:
- ✅ `composite: true` - Enables incremental builds and project references
- ✅ `outDir: "dist"` - Standard output directory
- ✅ `noEmit: false` - Generates declaration files
- ✅ Includes only `src/**/*` files
- ✅ Excludes tests, dist, and node_modules

**Usage**:
```bash
# For a new package at packages/my-package/
cp .cortex/templates/tsconfig/tsconfig.lib.json packages/my-package/tsconfig.json

# Adjust the extends path based on depth
# From packages/my-package/: "../../tsconfig.base.json"
# From packages/services/my-package/: "../../../tsconfig.base.json"
```

### 2. `tsconfig.spec.json` - Test Configuration

Use this for packages with test files to separate test compilation from production builds.

**Features**:
- ✅ Extends main `tsconfig.json`
- ✅ Separate output directory (`dist-spec`)
- ✅ `composite: false` - Tests don't need project references
- ✅ `noEmit: true` - Tests don't emit declarations
- ✅ Includes vitest globals and node types
- ✅ Includes test files from `tests/` and `src/**/*.test.ts`

**Usage**:
```bash
# For packages with tests
cp .cortex/templates/tsconfig/tsconfig.spec.json packages/my-package/tsconfig.spec.json

# No modifications needed - it extends ./tsconfig.json
```

---

## Creating a New TypeScript Package

### Step 1: Create Package Structure

```bash
mkdir -p packages/my-package/src
cd packages/my-package
```

### Step 2: Copy Main Config

```bash
cp ../../.cortex/templates/tsconfig/tsconfig.lib.json tsconfig.json
```

### Step 3: Adjust extends Path (if needed)

For packages at different depths, update the `extends` field:

| Package Location | Extends Path |
|-----------------|--------------|
| `packages/my-package/` | `"../../tsconfig.base.json"` |
| `packages/services/my-package/` | `"../../../tsconfig.base.json"` |
| `apps/my-app/` | `"../../tsconfig.base.json"` |

### Step 4: Add Test Config (if package has tests)

```bash
# Create tests directory
mkdir -p tests

# Copy test config
cp ../../.cortex/templates/tsconfig/tsconfig.spec.json tsconfig.spec.json
```

### Step 5: Create package.json

```json
{
  "name": "@cortex-os/my-package",
  "version": "0.0.1",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "^5.7.2",
    "vitest": "^3.2.4"
  }
}
```

### Step 6: Verify Build

```bash
pnpm build
pnpm typecheck
pnpm test
```

---

## Migrating Existing Packages

If you have an existing package that doesn't conform to the standard:

### Option 1: Manual Migration

1. **Backup current config**: `cp tsconfig.json tsconfig.json.backup`
2. **Copy template**: `cp .cortex/templates/tsconfig/tsconfig.lib.json tsconfig.json`
3. **Adjust extends path** to match your package depth
4. **Add package-specific settings** if needed (e.g., `rootDir` for specific output requirements)
5. **Create test config** if package has tests
6. **Test build**: `pnpm build && pnpm test`

### Option 2: Automated Migration (Phase 2)

```bash
# Run migration script (coming in Phase 2)
pnpm tsx scripts/migrate-tsconfig.ts --package packages/my-package
```

---

## Template Field Reference

### Required Fields (DO NOT REMOVE)

```json
{
  "compilerOptions": {
    "composite": true,      // REQUIRED for buildable libs
    "outDir": "dist",       // REQUIRED - standard output
    "noEmit": false,        // REQUIRED when composite is true
    "module": "NodeNext",   // REQUIRED for ESM support
    "moduleResolution": "NodeNext"  // REQUIRED for ESM
  },
  "include": ["src/**/*"],  // REQUIRED - source files
  "exclude": [              // REQUIRED - prevent compilation issues
    "dist",
    "node_modules"
  ]
}
```

### Optional Fields (Customize as needed)

```json
{
  "compilerOptions": {
    "rootDir": "src",       // OPTIONAL - use only if needed for output layout
    "target": "es2022",     // OPTIONAL - adjust based on runtime
    "strict": true,         // RECOMMENDED - enable strict mode
    "skipLibCheck": true,   // RECOMMENDED - faster builds
    "resolveJsonModule": true  // OPTIONAL - if importing JSON
  }
}
```

### Fields to AVOID

```json
{
  "compilerOptions": {
    // ❌ DO NOT USE - conflicts with NodeNext
    "module": "commonjs",
    
    // ❌ DO NOT USE - conflicts with composite
    "noEmit": true,
    
    // ❌ AVOID - can cause output path issues
    "outDir": "build",  // Use "dist" instead
    
    // ❌ AVOID - conflicts with include patterns
    "rootDir": ".",     // Be specific or omit
  }
}
```

---

## Common Issues & Solutions

### Issue: Build emits to wrong location

**Problem**: Files appear in `dist/src/file.js` instead of `dist/file.js`

**Solution**: Add `"rootDir": "src"` to compilerOptions

### Issue: Tests not found by vitest

**Problem**: Vitest can't find test files

**Solution**: Ensure `tsconfig.spec.json` exists and includes test paths

### Issue: Cross-package import errors

**Problem**: TS6307 errors when importing from other workspace packages

**Solution**: This requires Phase 3 project references - workaround: use runtime builds

### Issue: Type declarations not generated

**Problem**: No `.d.ts` files in dist/

**Solution**: Ensure `"composite": true` and `"noEmit": false` are set

---

## brAInwav Standards Checklist

Before committing a new or modified tsconfig.json:

- [ ] `composite: true` present (for buildable packages)
- [ ] `outDir: "dist"` set
- [ ] `include` array covers only source files
- [ ] `exclude` array includes at minimum: `["dist", "node_modules"]`
- [ ] Extends workspace `tsconfig.base.json`
- [ ] Test files handled by separate `tsconfig.spec.json` OR excluded from main config
- [ ] Builds successfully: `pnpm build`
- [ ] Type checks successfully: `pnpm typecheck`
- [ ] Tests pass: `pnpm test`

---

## Validation

Run structure validation to check compliance:

```bash
# Validate all TypeScript configurations
pnpm structure:validate

# Check specific package
cd packages/my-package
pnpm tsc --noEmit
```

---

## Examples

### Example 1: Simple Library Package

```
packages/utils/
├── src/
│   ├── index.ts
│   └── helpers.ts
├── tests/
│   └── helpers.test.ts
├── tsconfig.json        # From tsconfig.lib.json template
├── tsconfig.spec.json   # From tsconfig.spec.json template
└── package.json
```

### Example 2: Service Package with Scripts

```
packages/gateway/
├── src/
│   └── server.ts
├── scripts/
│   └── build-openapi.cjs  # .cjs file, not compiled by TypeScript
├── tests/
│   └── server.test.ts
├── tsconfig.json        # With rootDir: "src" and scripts excluded
├── tsconfig.spec.json
└── package.json
```

### Example 3: App Package

```
apps/cortex-os/
├── src/
│   ├── index.ts
│   └── config/
├── tests/
├── tsconfig.json        # From tsconfig.lib.json template
├── tsconfig.spec.json
└── package.json
```

---

## Related Documentation

- [CODESTYLE.md](../../../CODESTYLE.md) - brAInwav coding standards
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Troubleshooting Guide](../../../docs/troubleshooting/typescript-config.md)

---

## Updates & Versioning

**Current Version**: 1.0.0 (Phase 2 - Standardization)  
**Last Updated**: 2025-01-09  
**Next Review**: Phase 3 (Project References implementation)

**Changelog**:
- 2025-01-09: Initial templates created (Phase 2)
- Future: Add project references to templates (Phase 3)

---

**Maintained by**: brAInwav Development Team  
**Questions**: See troubleshooting guide or ask in #dev-infrastructure  
**Co-authored-by**: brAInwav Development Team
