# CRITICAL: Circular Dependency Blocks Build

## Status
Build currently BLOCKED by circular dependencies in the workspace dependency graph.

## Resolved
✅ **Cycle 1**: mcp-registry → tdd-coach → memories → rag → agents → mcp-registry  
**Fix Applied**: Removed unused `@cortex-os/tdd-coach` from `packages/mcp-registry/package.json` devDependencies

✅ **Cycle 2**: orchestration ↔ agents  
**Fix Applied**: Moved `@cortex-os/agents` from devDependencies to peerDependencies in `packages/orchestration/package.json` and replaced type import with inline type definition in `packages/orchestration/tests/tool-system.unified.test.ts`

## Remaining - REQUIRES MANUAL FIX
❌ **Cycle 3**: kernel ↔ orchestration  
**Problem**: Mutual runtime dependency between core packages

### Current Circular Path
```
@cortex-os/orchestration:build --> @cortex-os/kernel:build --> @cortex-os/orchestration:build
```

### Details
- **kernel** imports from orchestration:
  - `N0AdapterOptions`, `N0Session`, `N0State`, `workflowStateToN0`
  - Location: `packages/kernel/src/kernel.ts`

- **orchestration** imports from kernel:
  - `BindKernelToolsOptions`, `bindKernelTools`, `KernelTool`, `KernelToolBinding`, `BoundKernelTool`
  - Locations: `packages/orchestration/src/langgraph/{n0-graph.ts,tool-system.ts}`

### Recommended Solutions (Pick One)

#### Option 1: Extract Shared Contracts (Cleanest)
1. Create new package: `packages/kernel-contracts/`
2. Move shared types (N0*, KernelTool*, etc.) to contracts package
3. Both kernel and orchestration depend on contracts (one-way, no cycle)
4. Benefits: Clean architecture, proper separation of concerns

#### Option 2: Inline Type Definitions (Quickest)
1. Copy N0* type definitions into `packages/kernel/src/types/orchestration-types.ts`
2. Copy KernelTool* types into `packages/orchestration/src/types/kernel-types.ts`
3. Remove mutual dependencies
4. Benefits: Immediate fix, no new packages
5. Drawbacks: Type duplication, maintenance burden

#### Option 3: Remove One Dependency (Surgical)
1. Analyze if kernel truly needs orchestration types at runtime
2. If types-only, use local interface definitions
3. Remove `@cortex-os/orchestration` from `packages/kernel/package.json`
4. Benefits: Minimal changes
5. Drawbacks: May require refactoring kernel usage

## Next Steps for MCP Deployment
Once circular dependency is resolved:

1. **Build packages**:
   ```bash
   pnpm build:smart
   ```

2. **Deploy MCP server** (per your deployment pipeline)

3. **Test discovery manifest**:
   ```bash
   curl https://your-deployment/mcp/.well-known/mcp.json
   ```

4. **Reconnect ChatGPT integration** with new manifest URL

## Files Modified (Already Applied)
- `packages/mcp-registry/package.json` - Removed tdd-coach devDependency
- `packages/orchestration/package.json` - Moved agents to peerDependencies  
- `packages/orchestration/tests/tool-system.unified.test.ts` - Inline Subagent type

## Files Requiring Action
- `packages/kernel/package.json` OR
- `packages/orchestration/package.json` OR  
- New: `packages/kernel-contracts/` (if choosing Option 1)

---
**Created**: 2025-01-XX  
**Priority**: CRITICAL - Blocks all builds  
**Owner**: @jamiescottcraik

## UPDATE 2025-01-XX: Partial Resolution Complete

### ✅ Resolved Cycles
1. **mcp-registry ↔ tdd-coach** - Removed unused dependency
2. **orchestration ↔ agents** - Moved to peerDependencies + inline types  
3. **kernel ↔ orchestration** - Created `@cortex-os/kernel-contracts` package

### ❌ Remaining Cycle - CRITICAL
**agents ↔ rag** - Mutual runtime dependencies

```
@cortex-os/agents:build --> @cortex-os/rag:build --> @cortex-os/agents:build
```

**Analysis**:
- `rag` imports from agents: `src/integrations/remote-mcp.ts` uses dynamic import
- `agents` imports from rag: `src/subagents/ExecutionSurfaceAgent.ts` uses RAG functions

**Recommended Solution**:
Extract shared RAG contracts/interfaces to `@cortex-os/rag-contracts` package, similar to kernel-contracts approach.

**Alternative**: Use dependency injection or service locator pattern to avoid direct imports.

---

## Created Packages
- ✅ `@cortex-os/kernel-contracts` - Shared contracts between kernel and orchestration
  - N0 State types (N0Session, N0Budget, N0State, N0AdapterOptions)
  - Kernel tool types (BoundKernelTool, BindKernelToolsOptions, etc.)

## Modified Packages
- `packages/kernel/package.json` - Uses kernel-contracts, removed proof-artifacts
- `packages/orchestration/package.json` - Uses kernel-contracts + devDep on kernel for runtime functions
- `packages/mcp-registry/package.json` - Removed tdd-coach
- `packages/orchestration/tests/tool-system.unified.test.ts` - Inline Subagent type
- `packages/prp-runner/package.json` - Removed kernel dependency (type-only usage)
- `packages/proof-artifacts/package.json` - Moved prp-runner to devDependencies


## FINAL UPDATE - CIRCULAR DEPENDENCIES RESOLVED ✅

### All Cycles Resolved
1. ✅ **mcp-registry ↔ tdd-coach** - Removed unused dependency
2. ✅ **orchestration ↔ agents** - Moved to peerDependencies + inline types  
3. ✅ **kernel ↔ orchestration** - Created `@cortex-os/kernel-contracts`
4. ✅ **agents ↔ rag** - Created `@cortex-os/rag-contracts`

### Packages Created
- **@cortex-os/kernel-contracts** - N0 State types, Kernel tool types
- **@cortex-os/rag-contracts** - RAG events, MCP client types, Workflow types

### Build Status
- Circular dependency errors: RESOLVED ✅
- Build now proceeds without circular dependency errors
- Remaining build failures are pre-existing TypeScript configuration issues unrelated to circular dependencies

### Next Steps for MCP Deployment
1. Fix pre-existing TypeScript build errors in `@cortex-os/utils`
2. Run `pnpm build:smart` to completion
3. Deploy MCP server
4. Test discovery manifest and reconnect ChatGPT integration

