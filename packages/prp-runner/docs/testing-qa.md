# Testing & QA

Run unit tests and lint checks from the package root:

```bash
pnpm -C packages/prp-runner lint
pnpm -C packages/prp-runner test
```

Tests use [Vitest](https://vitest.dev) with coverage thresholds enforced in CI.
