# Testing & QA

Run unit tests:

```bash
pnpm test packages/github
```

Coverage goals: critical paths > 80%.

Use `mockito` for HTTP stubs and `insta` for snapshot testing.
