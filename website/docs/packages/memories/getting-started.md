---
title: Getting Started
sidebar_label: Getting Started
---

# Getting Started

## Prerequisites
- Node.js 18+
- pnpm or npm
- Optional: Docker with Neo4j and Qdrant containers

## Installation
```bash
pnpm add @cortex-os/memories
```

## First Use
```typescript
import { MemoryStore } from '@cortex-os/memories';
const store &#61; new MemoryStore();
await store.upsert({ id: 'greeting', text: 'hello' });
```
