# Refresh Cycle Architecture (MCP Performance Optimization)

```
┌───────────────────────────────────────────────────────────┐
│                 Connector Refresh Flow                     │
├───────────────────────────────────────────────────────────┤
│ 1. RefreshScheduler.start()                                │
│    • Interval derived from feature flags                   │
│    • Applies ±20% jitter to avoid thundering herd          │
│    • Logs every run with brand:"brAInwav"                  │
│                                                           │
│ 2. Scheduler triggers loadConnectorServiceMap()           │
│    • Shares an undici.Agent for keep-alive reuse           │
│    • Verifies signature + TTL                             │
│                                                           │
│ 3. ManifestCache.set(payload, ttlMs)                      │
│    • Stores fresh payload + expiry                        │
│    • Moves previous payload to stale slot                 │
│    • Allows stale read on error to keep runtime warm      │
│                                                           │
│ 4. ConnectorProxyManager.sync()                           │
│    • Reads ManifestCache                                  │
│    • Registers tools and updates metrics                  │
│    • Uses p-limit (max 4) for parallel proxy hydration     │
│                                                           │
│ 5. RegistryMemoryCache flush (separate task)              │
│    • Persists connector metadata without blocking runtime │
└───────────────────────────────────────────────────────────┘
```

**Key properties**
- Deterministic timing via injectable clock/random sources.
- Stale-on-error ensures degraded mode instead of downtime.
- Shared undici agent avoids socket churn across refresh cycles.
