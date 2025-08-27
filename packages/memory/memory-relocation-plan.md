# Memory Files Relocation Inventory and Plan

## Executive Summary

Comprehensive scan of specified directories found 47 memory-related files that need consolidation into the `apps/cortex-os/packages/memory/enhanced/` structure.

## Current Memory File Inventory

### 🔧 Tools Directory (`/tools`) - TO RELOCATE

**Found:** 3 memory consolidation tools

- `tools/memory-consolidation-audit.ts` → `apps/cortex-os/packages/memory/tools/audit/consolidation-audit.ts`
- `tools/memory-consolidation-executor.ts` → `apps/cortex-os/packages/memory/tools/audit/consolidation-executor.ts`
- `tools/memory-discovery.ts` → `apps/cortex-os/packages/memory/tools/discovery/memory-discovery.ts`

**Purpose:** Memory system auditing, discovery, and consolidation tools
**Action:** Move to `memory/tools/` subdirectories with proper categorization

### 📋 Tests Directory (`/tests`) - TO RELOCATE

**Found:** 1 test file

- `tests/phase1-validation/memory-performance.test.ts` → `apps/cortex-os/packages/memory/enhanced/performance/__tests__/phase1-validation.test.ts`

**Purpose:** Memory performance validation test
**Action:** Move to performance test directory to keep with related tests

### 🏗️ Source Directory (`/src`) - NO MEMORY FILES

**Found:** 0 direct memory files (only UI references in cortex-cli-ui)
**Action:** No relocation needed

### 📦 Packages Directory (`/packages`) - ALREADY CORRECTLY LOCATED

**Found:** All memory files already in correct structure under `apps/cortex-os/packages/memory/`
**Action:** No relocation needed - already consolidated

### 📚 Documentation (`/docs`) - TO ORGANIZE

**Found:** 2 memory documentation files

- `docs/concepts/memory.md` → Keep in docs (cross-reference from memory package README)
- `docs/api/python/bw_agent/memory_enhanced.html` → Keep in docs (generated API docs)

**Action:** Add cross-references in memory package documentation

### � Development Directory (`/dev`) - TO RELOCATE

**Found:** 3 memory development documentation files

- `dev/memory-patch-summary.md` → `apps/cortex-os/packages/memory/docs/dev/patch-summary.md`
- `dev/memory-changelog.md` → `apps/cortex-os/packages/memory/docs/dev/changelog.md`
- `dev/memory-bug-list.md` → `apps/cortex-os/packages/memory/docs/dev/bug-list.md`

**Purpose:** Development notes, patch summaries, and bug tracking for memory package work
**Action:** Move to memory package development documentation

### �📋 Instructions (`/instructions`) - TO RELOCATE

**Found:** 2 memory instruction files

- `instructions/memory.ts` → `apps/cortex-os/packages/memory/tools/cli/simple-memory-manager.ts`
- `.github/instructions/memory.instructions.md` → `apps/cortex-os/packages/memory/docs/github-instructions.md`

**Purpose:** CLI memory management and GitHub workflow instructions
**Action:** Move to memory package with appropriate categorization

### 🧠 External Dependencies - ALREADY INTEGRATED

**Found:** Multiple external memory implementations already integrated:

- External cipher memory tools (keep as-is - external dependency)
- Cortex-web temp memory components (part of web app - keep as-is)

**Action:** No changes needed - properly separated

## Consolidated Target Structure

```
apps/cortex-os/packages/memory/
├── enhanced/                          # ✅ Already correct
│   ├── mem0/                         # ✅ Already correct
│   ├── graphiti/                     # ✅ Already correct
│   ├── letta/                        # ✅ Already correct
│   ├── performance/                  # ✅ Already correct
│   └── unified/                      # ✅ Already correct
├── tools/                            # 🔄 ADD: Move tools here
│   ├── audit/
│   │   ├── consolidation-audit.ts    # ← FROM tools/memory-consolidation-audit.ts
│   │   └── consolidation-executor.ts # ← FROM tools/memory-consolidation-executor.ts
│   ├── discovery/
│   │   └── memory-discovery.ts       # ← FROM tools/memory-discovery.ts
│   └── cli/
│       └── simple-memory-manager.ts  # ← FROM instructions/memory.ts
├── docs/                             # 🔄 ADD: Memory-specific docs
│   └── github-instructions.md        # ← FROM .github/instructions/memory.instructions.md
└── tests/                            # ✅ Already has tests, ADD validation
    └── phase1-validation.test.ts     # ← FROM tests/phase1-validation/memory-performance.test.ts
```

## Migration Actions Required

### Phase 1: File Relocations (6 files to move)

1. **Tools migration:**
   - Create `apps/cortex-os/packages/memory/tools/{audit,discovery,cli}/` directories
   - Move 3 tool files with import path updates
2. **Instructions migration:**
   - Create `apps/cortex-os/packages/memory/docs/` directory
   - Move 2 instruction files
3. **Test migration:**
   - Move 1 validation test to performance test directory

### Phase 2: Reference Updates

1. **Update imports:** Search and replace import paths in 47+ files
2. **Update scripts:** Check package.json scripts and turbo.json tasks
3. **Update documentation:** Add cross-references and update READMEs

### Phase 3: Validation

1. **Build verification:** Ensure TypeScript compilation succeeds
2. **Test execution:** Run all memory tests to confirm no breakage
3. **Import verification:** Check all memory imports resolve correctly

## Files That Stay in Place (Correctly Located)

- `apps/cortex-os/packages/memory/enhanced/**` - ✅ Already consolidated
- `external/cipher/src/core/**` - ✅ External dependency, keep separate
- `apps/cortex-web/cortex-web-temp/src/components/memory/**` - ✅ Web UI components
- `docs/concepts/memory.md` - ✅ Cross-project documentation
- `docs/api/python/**` - ✅ Generated API docs

## Dependencies to Update After Migration

- Update any CLI commands referencing old memory tool paths
- Update turbo.json task definitions if they reference moved files
- Update any GitHub workflows that might import memory tools
- Update internal imports in moved files

## Risk Assessment

- **Low Risk:** Most memory files already properly consolidated
- **Medium Risk:** Import path updates needed in multiple files
- **Validation Required:** TypeScript build and test execution post-move

## Next Steps

1. Execute file moves with proper directory creation
2. Update import statements and references
3. Run comprehensive validation (build + tests)
4. Update documentation cross-references
