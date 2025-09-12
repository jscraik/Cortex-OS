# Configuration

## Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port for the schema registry service | `3000` |

## Rate Limiter Options
The rate limiter middleware accepts the following options:
- `limit` (requests per window, default `5`)
- `windowMs` (window size in milliseconds, default `60000`)

Customize by creating a new limiter:
```ts
import { createRateLimiter } from '@cortex-os/a2a-common';
app.use(createRateLimiter({ limit: 10, windowMs: 30_000 }));
```
