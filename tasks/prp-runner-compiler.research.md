# prp-runner compiler research (2025-10-05)

## Commands executed

- `pnpm exec tsc -p packages/prp-runner/tsconfig.json --noEmit`

## Observations

- NodeNext module resolution surfaces `.ts` extension import errors from unrelated package
  `packages/cortex-sec`, indicating shared tsconfig extends base settings without
  `allowImportingTsExtensions`.
- `@cortex-os/prompts` and `@cortex-os/kernel` packages have missing type declarations or
  project references, causing unresolved module errors in `packages/prp-runner`.
- `packages/prp-runner/src/lib/prp-langgraph-workflow.ts` uses dynamic import lacking explicit `.js` extension, conflicting with NodeNext expectations.
- Redis typings rely on the class default export from `ioredis`, but current import appears to
  grab the namespace without proper typing, leading to construct signature errors.
- Several files assume `unknown` types (e.g., `gate` in `documentation/prp-generator.ts` and
  `err` in `lib/server/error-handler.ts`), implying strict type checking requires refinements.
- Additional `packages/cortex-sec` errors involve `.ts` extension imports and `null` index
  usage; we may need to guard or adjust tsconfig references to prevent cross-package issues when
  targeting prp-runner.
