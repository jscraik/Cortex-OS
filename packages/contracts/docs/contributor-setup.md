# Contributor Setup

1. Install dependencies:
```bash
pnpm install
```
2. Build the package:
```bash
pnpm --filter @cortex-os/contracts-v2 build
```
3. Run lint and tests:
```bash
pnpm lint --filter @cortex-os/contracts-v2
pnpm test --filter @cortex-os/contracts-v2
```
