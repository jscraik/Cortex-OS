---
applyTo: "**"
---

- user-goal: shrink dependency footprint ~40%; pnpm workspace (monorepo)
- baseline: node_modules 2.6G; pnpm-lock.yaml 26,176 lines
- plan: add safe pnpm overrides + scripts (dedupe/prune), run dedupe -r, reinstall, validate tests, re-measure, document
- status: baseline captured; ready to add overrides + run dedupe
- note: watch for failing @cortex-os/orchestration tests post-change
- completed: integrated chatterbox-tts + avaturl packages; full TS/Python bridge impl; workspace verified

## session-summary-2025-08-16
- scope: audit → fix test orchestration → remediation wave → test re-run
- key edits: root vitest exclude dist/build/.next; iOS test setup bridge; ASBR winston mock+alias; MCP minimal McpConnection; added missing tsconfigs (apps/api, cli/mcp); jsdom clipboard polyfill in cli-tools setup.
- latest run: pnpm test → 72 passed, 46 failed, 1 skipped, 5 unhandled errors (duration ~8s). Engines warning in mcp-server (>=18 <=22) under Node 24; non-blocking.
- failure clusters:
	- cli-tools React tests running in node env (document undefined, user-event clipboard navigator issues) → needs jsdom env + setup for that package.
	- jest-axe reporter uses chalk.grey (not a function under chalk v5) → add shim/pin chalk@4 or custom reporter.
	- WorkflowNode a11y tests expect single role=button but multiple are rendered → switch to getAllByRole or narrower queries.
	- mcp-server tests emit ECONNREFUSED 127.0.0.1:80 after teardown → mock net/ws or ensure sockets closed and awaits done.
	- security/atlas-engine: missing Python module leads to fallback path with JSON parse error → stabilize fallback payload for tests.
	- external scanners (clamscan/yara/binwalk) absent; tests mostly tolerant; logs noisy only.
- branch: docs/cleanup-generated-html-artifacts → main. Next actions: set jsdom env for cli-tools component tests; fix jest-axe/chalk; refine a11y queries; mock/close sockets in MCP tests; harden atlas fallback; rerun lint/tests.

## session-summary-2025-08-16 (ops-delta)
- ran full workspace tests to validate infra fixes; captured failure clusters and engines warning
- tightened root vitest excludes; verified iOS/jsdom setup bridges; injected winston mock; added minimal McpConnection; added missing tsconfigs; polyfilled clipboard
- identified env mismatch: cli-tools React tests running under node from app-level vitest config; plan to route to jsdom via environmentMatchGlobs/split projects
- found chalk v5 incompat with jest-axe reporter (chalk.grey); plan shim or pin for tests
- a11y tests too strict on role=button; plan to use getAllByRole or role+name queries
- MCP tests hitting real network (ECONNREFUSED:80); plan to mock ws/net and ensure teardown closes sockets
- atlas Python fallback returns empty/invalid JSON on error; plan to return stable structured fallback when Python missing
