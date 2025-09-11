# Testing & QA

Run unit tests and regenerate the OpenAPI spec:
```bash
pnpm --filter @cortex-os/gateway test
```

For coverage:
```bash
pnpm --filter @cortex-os/gateway test:coverage
```

The project follows Test-Driven Development; add tests alongside new features.
