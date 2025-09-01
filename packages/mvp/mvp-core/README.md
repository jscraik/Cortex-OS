# @cortex-os/mvp-core

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

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
