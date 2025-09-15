# Structure Guard

Enforces repository layout, security, and dependency boundary policies based on `policy.json`.

## Hot Reload Documentation

For runtime policy hot reload (watch + validation + atomic consumer pattern), see:
[../../simple-tests/README.md#policy-hot-reload-structure-guard](../../simple-tests/README.md#policy-hot-reload-structure-guard)

## Files

- `policy.json` – Source policy definition (validated via `policy-schema.ts`)
- `policy-schema.ts` – Zod schema & validation helpers
- `guard.ts` / `guard-enhanced.ts` – Validation entrypoints
- `mutation-tests.spec.ts` – Mutation scenarios for guard behaviors
- `integration-guide.md` – Integration and CI steps

## Contract Stability

Schema guarded by contract test at `contracts/tests/policy-schema.contract.test.ts`.

## Quick Validate Command

```bash
pnpm tsx tools/structure-guard/guard-enhanced.ts
```
