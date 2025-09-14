# A2A Common Services

This package provides shared middleware and utilities for A2A (Agent-to-Agent) communication within Cortex OS.

## Features

### Rate Limiting

#### In-Memory Rate Limiter
Basic rate limiting middleware for development and testing purposes. **Not recommended for production use** due to in-memory storage limitations.

```typescript
import { createRateLimiter } from '@cortex-os/a2a-common';

app.use(createRateLimiter({ 
  limit: 5, 
  windowMs: 60000 
}));
```

#### Redis Rate Limiter (Production)
Durable rate limiter with Redis backend for production environments. Provides:

- Persistent storage: Request counts survive process restarts
- Efficient cleanup: Uses Redis TTL for automatic cleanup of stale entries
- Better performance: Atomic operations via Lua scripts
- Fallback mechanism: Automatically falls back to in-memory when Redis is unavailable

```typescript
import { createRedisRateLimiter } from '@cortex-os/a2a-common';

app.use(createRedisRateLimiter({ 
  limit: 100,
  windowMs: 60000,
  redisUrl: 'redis://localhost:6379',
  prefix: 'a2a:rate-limit'
}));
```

### Middleware

- **Burst Smoother**: Token bucket algorithm for smoothing request bursts
- **Quota**: Global quota enforcement
- **Per-Agent Quota**: Per-agent quota enforcement
- **Rate Limiter**: IP-based rate limiting (in-memory and Redis variants)

### Utilities

- **Schema Cache**: In-memory caching for schema registry
- **Registry Client**: Client for interacting with schema registry service
- **Service Metrics**: Metrics collection and reporting

## Installation

```bash
npm install @cortex-os/a2a-common
```

## Usage

```typescript
import { 
  createRedisRateLimiter,
  createBurstSmoother,
  createQuota,
  createPerAgentQuota
} from '@cortex-os/a2a-common';

// Apply middleware in order
app.use(createBurstSmoother());
app.use(createRedisRateLimiter());
app.use(createQuota());
app.use(createPerAgentQuota());
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection URL for rate limiter | `redis://localhost:6379` |