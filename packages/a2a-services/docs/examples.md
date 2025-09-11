# Examples & Tutorials

## Using the Rate Limiter
```ts
import express from 'express';
import { rateLimiter } from '@cortex-os/a2a-common';

const app = express();
app.use(rateLimiter);
```

## Querying the Schema Registry
```bash
curl http://localhost:3000/schemas/Example/1.0.0
```
