# @cortex-os/kernel-contracts

Shared type contracts between `@cortex-os/kernel` and `@cortex-os/orchestration` packages.

## Purpose

This package breaks the circular dependency that previously existed:
```
kernel → orchestration → kernel (CIRCULAR ❌)
```

Now both packages depend on this shared contracts package:
```
kernel → kernel-contracts ← orchestration (LINEAR ✅)
```

## Exports

### N0 State Types
- `N0Session`, `N0SessionSchema` - Session metadata
- `N0Budget`, `N0BudgetSchema` - Resource budgets
- `N0State`, `N0StateSchema` - Complete N0 state
- `N0AdapterOptions` - Adapter configuration

### Kernel Tool Types
- `BoundKernelTool` - Bound tool with brAInwav policies
- `BindKernelToolsOptions` - Tool binding configuration
- `KernelToolBinding` - Binding operation result
- `KernelTool` - Generic tool definition

## Usage

```typescript
import { N0State, N0Session, BoundKernelTool } from '@cortex-os/kernel-contracts';
```

## Architecture Decision

Created as part of circular dependency resolution (2025-01-XX).

See: `/Users/jamiecraik/.Cortex-OS/CIRCULAR_DEP_FIX_REQUIRED.md`
