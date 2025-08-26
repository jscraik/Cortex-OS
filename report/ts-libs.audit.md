# TypeScript Libraries Audit

This audit covers packages under `libs/typescript` focusing on API stability, ESM readiness, type safety, telemetry and testing helpers.

## Package overview

| Package | API/Version | ESM & Exports | Types & JSDoc | Notes |
|---------|-------------|---------------|---------------|-------|
| `@cortex-os/a11y-utils` | version `1.0.0` with no `type` field; entry points reference raw sources | lacks explicit ESM declaration and exports map | TypeScript sources without published typings | needs build step and export map |
| `@cortex-os/contracts` | private `1.0.0` tokens contract | marked as ESM but uses `main`/`types` only | simple symbol map, no JSDoc | add `exports` map for tree-shaking |
| `@cortex-os/telemetry` | private `1.0.0` stub tracer/meter/logger | ESM with minimal API | types compiled from source but no span schema tests | expand telemetry schema & tests |
| `@cortex-os/types` | private `1.0.0` utilities | ESM, single `Json` type | lacks release/exports metadata | add exports map |
| `@cortex-os/utils` | private `1.0.0` helpers with barrel re-exports | ESM but imports `.js` in source | typings rely on build output | verify tree-shaking and adjust source imports |
| `testing` | tsconfig only; no package metadata | N/A | N/A | initialise package with exports map |

## Fix plan

1. Add `"type": "module"`, `exports` map and build targets to every package.
2. Move source imports to `.ts` paths and emit ESM in `dist/`.
3. Introduce API contract tests and dtslint/type tests per package.
4. Define telemetry span schema and add tests validating spans.
5. Provide ergonomic testing helpers package.

## Score

Overall readiness: **58/100**

- API stability & SemVer discipline: 60
- ESM & tree-shaking: 55
- Type safety & JSDoc: 60
- Telemetry & testing helpers: 55

