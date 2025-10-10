# [PACKAGE_NAME]
> Purpose: [one sentence mission]. Owner: [OWNER]. Status: [Alpha/Beta/GA].

## Quickstart
```bash
pnpm -w --filter [PACKAGE_NAME] build
pnpm -w --filter [PACKAGE_NAME] dev
pnpm -w --filter [PACKAGE_NAME] test
```

## Interfaces
- Inputs: [API, topics, files]
- Outputs: [API, events]
- Ports: [PORT]/[PROTOCOL]

## Configuration
- Required env: `[KEY]=...`
- Optional: `[FLAG]=true` (dev only)

## Observability
- Logs: structured JSON with `runId`
- Metrics: `/metrics`
- Traces: OTEL enabled

## Security
- Auth: [API-key/Bearer/None(dev)]
- CORS/Host allowlist: [values]

## Definition of Done
- [Copy from CHECKLIST]

## Test Plan
- Unit: `pnpm test`
- Integration: [describe]
- E2E: [describe]

## A11y (if UI)
- Keyboard walkthrough
- No color-only signaling
- Screen-reader labels
