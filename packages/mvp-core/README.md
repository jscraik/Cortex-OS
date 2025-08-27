# @cortex-os/mvp-core

Core primitives for ASBR:
- Env+Config validation (Zod)
- Logger (Pino)
- Problem+JSON errors
- Result helpers
- Retry + Circuit breaker
- IDs + Time
- Health checks
- OTEL span wrapper

Usage:
```ts
import { loadEnv, createLogger, withSpan, retry } from "@cortex-os/mvp-core";
const env = loadEnv();
const log = createLogger("cortex-os", env.LOG_LEVEL);
await withSpan("op", async ()=> retry(async ()=>{} , { maxRetries: 2, backoffMs: 200, jitter: true })));
```

