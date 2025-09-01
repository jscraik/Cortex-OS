# MCP Registry TDD Plan

## Test Matrix
| Action | Node Versions | OS | Notes |
|---|---|---|---|
| register | 20.x, 22.x | linux-x64, darwin-arm64, win32-x64 | validate schema and signing |
| resolve | 20.x, 22.x | linux-x64, darwin-arm64, win32-x64 | verify content-addressed fetch |
| deprecate | 20.x, 22.x | linux-x64, darwin-arm64, win32-x64 | ensure warning emitted |
| yank | 20.x, 22.x | linux-x64, darwin-arm64, win32-x64 | reject further installs |
| migrate | 20.x, 22.x | linux-x64, darwin-arm64, win32-x64 | maintain backward compatibility |

## Fixtures
- Example server manifest with all transports
- Registry index with multiple versions

## Coverage Budget
- Statements: 95%
- Branches: 95%
- Functions: 95%
- Lines: 95%

## Property & Mutation Gates
- Fuzz JSON parser with malformed manifests
- Mutation testing on version resolver

## Given/When/Then
- **Given** a valid manifest, **when** registering, **then** it is stored with checksum and signature.
- **Given** a registry index, **when** resolving, **then** the latest compatible version is returned.
- **Given** a deprecated version, **when** clients request install, **then** a warning is returned.

## Commands
- Local: `pnpm --filter @cortex-os/mcp-registry test -- --coverage`
- CI: `pnpm lint && pnpm --filter @cortex-os/mcp-registry test -- --coverage`
