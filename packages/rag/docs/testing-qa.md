# Testing & QA

## Unit Tests
```bash
pnpm test
```
Generates coverage reports via `vitest`.

## Coverage Threshold
```bash
pnpm verify:coverage
```
Fails if coverage drops below the configured minimum.

## Documentation
```bash
pnpm docs:verify
```
Ensures README snippets compile and docs are linted.
