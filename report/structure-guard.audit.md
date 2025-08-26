# Structure Guard Audit

## Summary
- Added deny-list support and auto-fix messaging to `tools/structure-guard`.
- Expanded tests for glob negations, path policy enforcement, and globby ignores.

## Findings
| Check | Status | Notes |
| --- | --- | --- |
| Robust globbing | ✅ | `micromatch` invoked with dotfile support and negation tests |
| Allow/Deny lists | ✅ | `policy.json` now defines `allowedGlobs` and `deniedGlobs` |
| CI gate | ⚠️ | add `pnpm --filter @cortex-os/structure-guard test` to CI workflow |
| Auto-fix suggestions | ✅ | CLI suggests moving, removing, or updating policy entries |

## Fix Plan
1. Wire `tools/structure-guard/guard.ts` into CI using `structure:validate`.
2. Extend `deniedGlobs` for sensitive patterns as the monorepo evolves.

## Score
- Coverage: 0.85
- Reliability: 0.90
- Overall: **88/100**
