---
title: Examples
sidebar_label: Examples
---

# Examples & Tutorials

## Basic span
```ts
import { initializeObservability, withSpan } from '@cortex-os/observability';

initializeObservability('example');
await withSpan('work', async () &#61;&gt; {
  // do work
});
```

## Flamegraph generation
```bash
node -e "require('@cortex-os/observability').generateFlamegraph('app.js','./flame')"
```
