---
title: Api Reference
sidebar_label: Api Reference
---

# API Reference

## createKernel
Creates a new `CortexKernel` instance.

```ts
import { createKernel } from '@cortex-os/kernel';
const kernel = createKernel();
```

## CortexKernel
High-level interface for executing workflow graphs.

### Methods
- `run()`: execute the registered graph
- `addNode(node)`: register custom nodes

## History helpers
- `createHistory()` - start a new history store
- `addToHistory(entry)` - append state transitions
- `getExecutionHistory()` - read recorded transitions

## MCPAdapter
Integrates Model Context Protocol tools. Configure with API keys via environment variables.
