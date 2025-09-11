# Testing & QA

ASBR uses [Vitest](https://vitest.dev/).

Run unit tests:
```bash
pnpm --filter @cortex-os/asbr test
```

For coverage:
```bash
pnpm --filter @cortex-os/asbr test:coverage
```

Adopt TDD by writing failing tests before implementing features.
