# Architecture

```
packages/a2a-services
├── common            # Shared utilities (rate limiter)
└── schema-registry   # Express service exposing schema APIs
```

The schema registry uses Express for routing and relies on the `@cortex-os/a2a-common` package for middleware. Data is stored in memory; persistence layers are planned for future releases.
