# ChatGPT Dashboard Widget

React widget bundled with Webpack 5 and rendered inside ChatGPT Apps to visualize brAInwav Cortex-OS connector health, availability, and sample tool actions. The bundle is served by `packages/connectors`, relies on the manifest-driven `/v1/connectors/service-map` contract, and uses the official OpenAI Apps SDK for runtime interactions.

---

## Features

- Fetches the signed connector map via the OpenAI Apps SDK and renders availability, TTL countdown, and scopes.
- Allows operators to trigger sample MCP actions (ping, memory search, task lifecycle).
- Surfaces branded error states with remediation steps when connectors are offline.
- Emits accessibility-friendly status updates (aria-live) and keyboard shortcuts for navigation.

---

## Getting Started

```bash
# Install dependencies
pnpm --filter apps/chatgpt-dashboard install

# Run in development mode (with mocked API)
pnpm --filter apps/chatgpt-dashboard start

# Build production bundle (output consumed by connectors server)
pnpm --filter apps/chatgpt-dashboard build
```

Development server (webpack-dev-server) proxies API requests to `http://localhost:3026` by default. Override with `CONNECTORS_BASE_URL` or edit `webpack.dev.ts` during setup.

---

## Architecture

- `src/index.tsx`: bootstraps widget and mounts root React component.
- `src/hooks/useConnectorState.ts`: fetches manifest data with abortable requests and caches using TTL from service map while calling the OpenAI Apps SDK client.
- `src/sdk/appsClient.ts`: initializes and exports the OpenAI Apps SDK instance used across the widget.
- `src/components/ConnectorCard.tsx`: renders individual connector status with accessible markup.
- `src/components/ActionPanel.tsx`: allows sample tool invocations via `window.openai` Apps API.
- `src/utils/telemetry.ts`: emits structured console logs and optional OTel browser spans.

The bundle is exported as ESM with hashed filenames so the connectors server can serve assets directly from `dist/`.

---

## Testing

| Command | Purpose |
|---------|---------|
| `pnpm --filter apps/chatgpt-dashboard test` | Unit tests (Jest + Testing Library) for hooks/components. |
| `pnpm --filter apps/chatgpt-dashboard test:a11y` | Accessibility audits via `jest-axe`. |
| `pnpm --filter apps/chatgpt-dashboard test:perf` | Synthetic performance budget tests (LCP/TBT). |

Enforce ≥94% coverage and capture reports as PR evidence.

---

## Accessibility Checklist

- Provide keyboard shortcuts for switching between connectors (arrow keys + enter).
- Ensure focus outlines meet contrast requirements.
- Announce state transitions through `aria-live` region with brand context (“brAInwav connector Memory API is online”).
- Include skip link to jump to error panel.

---

## Integration with Connectors Server

1. Build assets (`pnpm --filter apps/chatgpt-dashboard build`).
2. Ensure output directory matches `APPS_BUNDLE_DIR` configured in connectors server (default: `dist/apps/chatgpt-dashboard`).
3. Start connectors server (`scripts/connectors/run-connectors-server.sh`).
4. ChatGPT Apps runtime loads widget via the connectors server `/apps/chatgpt-dashboard/index.html` route.

---

## Governance

- Follow `apps/chatgpt-dashboard/AGENTS.md` for local coverage, performance, and accessibility gates.
- Cite `/.cortex/rules/agentic-coding-workflow.md` and `/CODESTYLE.md` in PR notes.
- Record test evidence in the TDD plan (`tasks/connectors-manifest-runtime/tdd-plan.md`).

---

## Support

- Maintainers: @brAInwav-devs (`#cortex-ops`).
- For ChatGPT Apps onboarding questions, reference `docs/connectors/openai-agents-integration.md`.
- For auth failures or 403 responses, follow `PLAYBOOK.403-mcp.md`.
