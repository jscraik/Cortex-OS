---
title: Examples
sidebar_label: Examples
---

# Examples & Tutorials

## Node.js Inference Script
```typescript
import fetch from 'node-fetch';


await fetch('http://localhost:3000/v1/models/gpt-4/infer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'Hello' })
});
```

## Simple Workflow
```typescript
import { run } from '@cortex-os/service-orchestration';
const workflow = { graph: { start: [] }, steps: { start: async () ⇒ 'ok' } };
await run(workflow);

```