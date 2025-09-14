---
title: User Guide
sidebar_label: User Guide
---

# User Guide

## Send an Inference Request

```bash
curl -X POST http://localhost:3000/v1/models/gpt-4/infer \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Hello"}'
```

## Execute a Workflow

```typescript
import { run } from '@cortex-os/service-orchestration';
await run(workflow, { workflowId: 'demo' });
```

Interactions are command-line and API based; no keyboard shortcuts are required.

```