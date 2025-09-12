# Examples & Tutorials

## Basic span
```ts
import { initializeObservability, withSpan } from '@cortex-os/observability';

initializeObservability('example');
await withSpan('work', async () => {
  // do work
});
```

## Flamegraph generation
```bash
node -e "require('@cortex-os/observability').generateFlamegraph('app.js','./flame')"
```
