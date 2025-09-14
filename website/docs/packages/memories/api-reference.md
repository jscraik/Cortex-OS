---
title: Api Reference
sidebar_label: Api Reference
---

# API Reference

## MemoryService
```typescript
import { MemoryService } from '@cortex-os/memories';
const svc = await MemoryService.fromEnv(embedder);
await svc.upsert({ id: '1', text: 'hello' });
const result = await svc.search('hello');
```
Key methods:
- `initialize()` - connect to configured stores
- `upsert(entry)` - insert or update a memory item
- `retrieve(id)` - fetch by identifier
- `search(query)` - semantic search across stores

## Helper Factories
- `createMemoryService(store, embedder)` - compose a service manually
- `createPolicyAwareStoreFromEnv()` - build store using env vars
- `createEmbedderFromEnv()` - build embedding pipeline from env vars

```