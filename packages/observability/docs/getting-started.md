# Getting Started

1. Install the package:
   ```bash
   pnpm add @cortex-os/observability
   ```
2. Initialize observability in your service entry:
   ```ts
   import { initializeObservability } from '@cortex-os/observability';
   initializeObservability('demo-service');
   ```
3. Wrap work in spans:
   ```ts
   await withSpan('task', async () => { /* ... */ });
   ```
