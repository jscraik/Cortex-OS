# Examples & Tutorials

## Ingest and Search with MLX
See `examples/memories-mlx/ingest-and-search.ts` for a script that indexes files and queries them using the MLX embedder.

## Web Service Integration
A minimal Express integration:
```typescript
import express from 'express';
import { createMemoryService, createEmbedderFromEnv, createPolicyAwareStoreFromEnv } from '@cortex-os/memories';
const app = express();
const svc = createMemoryService(createPolicyAwareStoreFromEnv(), createEmbedderFromEnv());
app.post('/remember', async (req, res) => {
  await svc.upsert({ id: req.body.id, text: req.body.text });
  res.sendStatus(204);
});
```
