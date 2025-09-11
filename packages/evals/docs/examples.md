# Examples & Tutorials

## Custom RAG Evaluation

```ts
import { runGate } from '@cortex-os/evals';
import { createDeps } from './rag-deps';
import config from './rag.config.json' assert { type: 'json' };

await runGate(config, { rag: await createDeps() });
```

## Router Latency Check

```ts
import { runGate } from '@cortex-os/evals';
import router from './router';

await runGate({ suites: [{ name: 'router' }] }, { router });
```
