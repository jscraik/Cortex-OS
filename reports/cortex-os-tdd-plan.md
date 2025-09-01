# Cortex-OS TDD Plan
## Test Matrix
| Layer | Target | Command |
|---|---|---|
| Unit | `pnpm nx:test:core` | blocked until Node ≥22 |
| Integration | `pnpm test:integration` | requires services in `infra/compose` |
| Security | `pnpm security:scan` | ensure `cross-env` and semgrep installed |
| Accessibility | `pnpm test:a11y` | depends on wcag roadmap |

## Fixtures & Golden Queries
- Mock service responses for CLI and WebUI
- Golden embeddings for RAG models in `cortex-config.json`

## Failing Tests First
1. Add failing tests for secret scanning
2. Add failing accessibility tests for missing labels

## CI Commands
```
pnpm format:check
pnpm lint
pnpm test:coverage:threshold
pnpm security:scan:ci
pnpm sbom:generate
```
