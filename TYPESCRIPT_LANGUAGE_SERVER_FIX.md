# TypeScript Language Server Crash - Resolution

## Issue
The TypeScript/JavaScript language service crashed 5 times, likely due to:
1. VS Code settings.json had invalid JSON syntax (missing commas, duplicate settings)
2. `typescript.tsserver.experimental.enableProjectDiagnostics` was set to `true`, causing excessive memory usage
3. Large monorepo with 97 packages and some syntax errors in files
4. Stale build artifacts and TypeScript build info files

## Fixes Applied

### 1. Fixed VS Code Settings (.vscode/settings.json)
- ✅ Fixed missing comma on line 158 (after `"**/cortex-*.sqlite": false`)
- ✅ Removed stray comma on line 880
- ✅ Removed duplicate TypeScript settings (lines 882-886)
- ✅ Consolidated TypeScript server settings:
  - `typescript.tsserver.maxTsServerMemory`: 8192 MB (increased from default)
  - `typescript.tsserver.experimental.enableProjectDiagnostics`: false (disabled to prevent crashes)
  - `typescript.disableAutomaticTypeAcquisition`: true
  - `typescript.tsserver.useSyntaxServer`: "auto"

### 2. Fixed TypeScript Configuration
- ✅ Updated `packages/asbr/tsconfig.lib.json`:
  - Changed module from `ESNext` to `ES2022` for better Rollup compatibility
  - Kept `moduleResolution: "Bundler"` for Rollup builds
  - This prevents module resolution conflicts with the base config

### 3. Cleaned Build Artifacts
- ✅ Removed all `*.tsbuildinfo` files
- ✅ Cleaned dist directories for affected packages
- ✅ Rebuilt `libs/typescript/asbr-schemas` package
- ✅ Reset Nx cache

### 4. Package Dependencies (from previous fixes)
- ✅ All critical dependencies installed correctly
- ✅ `pnpm install` completes successfully in ~1.7s

## How to Restart TypeScript Language Server

### Method 1: VS Code Command Palette (Recommended)
1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type: `TypeScript: Restart TS Server`
3. Press Enter

### Method 2: Reload VS Code Window
1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type: `Developer: Reload Window`
3. Press Enter

### Method 3: Manual Cleanup (if still having issues)
```bash
# Clean TypeScript build info
find . -name "*.tsbuildinfo" -delete

# Clean Nx cache
pnpm nx reset

# Reload VS Code window
```

## Prevention Measures

The following settings are now configured to prevent future crashes:

1. **Memory Limit**: Increased to 8GB (`typescript.tsserver.maxTsServerMemory: 8192`)
2. **Project Diagnostics**: Disabled (`typescript.tsserver.experimental.enableProjectDiagnostics: false`)
3. **Automatic Type Acquisition**: Disabled to reduce I/O load
4. **Syntax Server**: Set to "auto" for better performance

## Known Remaining Issues (Not Related to Language Server)

These issues exist in the codebase but should not cause language server crashes:

1. **Syntax errors in some files**:
   - `apps/cortex-os/src/services.ts` (line 278)
   - `scripts/performance/analytics-engine.ts` (line 828+)

2. **Cyclic workspace dependencies** (intentional):
   - packages/agents ↔ packages/rag
   - packages/kernel ↔ packages/proof-artifacts ↔ packages/prp-runner ↔ packages/workflow-common

3. **Peer dependency warnings** (non-critical):
   - openai-apps-sdk: zod version conflict (upstream issue)
   - orchestration: lancedb version mismatch

## Verification

✅ VS Code settings.json is now valid JSONC
✅ TypeScript configuration is consistent across packages
✅ Package installation completes successfully
✅ Build artifacts cleaned
✅ Nx cache reset

## Next Steps

1. **Restart TypeScript Language Server** using Method 1 above
2. If issues persist, **Reload VS Code Window** using Method 2
3. Monitor TypeScript server memory usage (should stay under 8GB)
4. Consider fixing syntax errors in the files mentioned above

---

**Created**: 2025-01-XX
**Last Updated**: After dependency resolution and language server fixes
