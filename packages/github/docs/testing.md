# Testing & QA

Run unit tests:

```bash
pnpm --filter github test
```

Coverage goals: critical paths > 80%.

Use `mockito` for HTTP stubs and `insta` for snapshot testing.
