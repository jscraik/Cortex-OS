# Cortex-OS — Open WebUI-style Chat Integration (MVP)

Operational Controls: REASONING_EFFORT=medium; VERBOSITY=balanced; SCOPE=MVP first, vNext later. [ASSUMPTIONS] below.

[ASSUMPTIONS]

- Feature goal: deliver an Open WebUI-modeled chat interface and agent bridge for Cortex-OS, not a fork of Open WebUI.
- UI lives in `apps/cortex-web` and talks to ASBR Runtime in `apps/cortex-os` via HTTP/WebSocket; cross-feature communication uses A2A events.
- Model/tool execution remains in existing services (MCP, orchestration, memories). We do not introduce new providers in MVP.
- Persistence uses the existing memories service and/or current DBs; no schema changes beyond minimal chat/session tables.

---

## 1. Executive Summary

- Elevator Pitch: Add an accessible, fast, Open WebUI-style chat UI to Cortex-OS with streaming responses and tool-call visualization, wired to ASBR and MCP—shippable as an MVP.
- Problem Statement: Users lack a cohesive chat surface to converse with Cortex-OS agents, select models, see streaming output, and inspect tool usage.
- Target Audience: Internal teams, early adopters, solution engineers, and enterprise evaluators needing a self-hostable, accessible chat.
- Unique Selling Proposition: Open WebUI familiarity with Cortex-OS strengths—A2A messaging, MCP tools, and strict contracts.
- Success Metrics:
  1. p95 message round-trip < 2s (no tool call) and < 5s (with simple tool call)
  2. a11y audit (WCAG 2.2 AA) ≥ 95% pass with zero critical issues
  3. 99% successful message streaming sessions (>30s stability) under 250 concurrent users

## 2. Scope and Slices

- MVP Goals:
  - Streamed chat conversation with history
  - Minimal model selection (default + dropdown)
  - Tool-call preview pane (read-only visualization)
  - Basic session persistence and shareable conversation URL
  - Observability hooks (logs/metrics/events)
- Feature List:
  - MVP: Chat surface, streaming, history, model dropdown, tool-call visualization, a11y AA, basic analytics events
  - vNext: Multi-agent handoff, prompt templates, attachments, function calling controls, personas, fine-tuned model routing, theming, plugin marketplace
- Out of Scope (MVP): Uploads/attachments, marketplace, prompt-editing workflows, multi-tenant RBAC, fine-grained cost reporting

## 3. Personas and Jobs

- Evaluator Erin (needs a reliable demoable chat)
- Engineer Eva (needs a testable, observable chat surface)
- Operator Omar (needs basic controls and audit trails)

Top Jobs:

- Converse with an agent, see results stream, and review tool usage.
- Switch models without reconfiguration.
- Retrieve past session context.

## 4. User Stories and Acceptance Criteria

Feature: FEAT-001 Chat Messaging

- User Story: As a user, I want to send a message and see a streamed response so I can iterate quickly.
- Acceptance Criteria:
  - GIVEN chat loaded WHEN I send a message THEN response streams token-by-token until completion or error
  - Edge: GIVEN network loss WHEN reconnect THEN session restores and resumes/recaps last assistant state safely
- Priority: P0 (core value)
- Dependencies: WebSocket/HTTP SSE from ASBR; memories persistence
- Technical Constraints: Use A2A events/contracts; idempotent send; graceful cancel
- UX Considerations: Visible typing indicator, cancel button, error toast with retry

Feature: FEAT-002 Model Selection

- User Story: As a user, I want to pick a model for my session so I can optimize speed/cost.
- Acceptance Criteria:
  - GIVEN model dropdown WHEN I select a model THEN subsequent messages use that model and UI shows active model
  - Edge: GIVEN unavailable model WHEN selected THEN fallback to default and notify
- Priority: P0
- Dependencies: model list API; ASBR routing
- Technical Constraints: Enforce allowlist; persist in session
- UX Considerations: Disabled states; tooltips with brief tradeoffs

Feature: FEAT-003 Conversation History

- User Story: As a user, I want session persistence with a shareable URL.
- Acceptance Criteria:
  - GIVEN saved session WHEN I reload URL THEN messages and model choice are restored
  - Edge: GIVEN stale link WHEN opened THEN show not-found and option to start new
- Priority: P0
- Dependencies: memories service; session store
- Technical Constraints: Soft delete; pagination; size caps
- UX Considerations: Loaders, empty state, truncation notice

Feature: FEAT-004 Tool-Call Visualization

- User Story: As a user, I want to see tool calls invoked during a response so I can understand behavior.
- Acceptance Criteria:
  - GIVEN tool-capable agent WHEN tool is invoked THEN UI shows tool name, args, and status (pending/success/fail)
  - Edge: GIVEN sensitive args WHEN detected THEN redact tokens per policy
- Priority: P1 (valuable but not blocking chat)
- Dependencies: MCP events and schemas
- Technical Constraints: Redaction policy; no secrets in UI
- UX Considerations: Collapsible panel; copy-safe sanitized payloads

Feature: FEAT-005 Accessibility AA

- User Story: As an assistive-tech user, I need the chat to be WCAG 2.2 AA compliant.
- Acceptance Criteria:
  - GIVEN keyboard navigation WHEN traversing UI THEN logical focus order and visible focus ring
  - Edge: GIVEN screen reader WHEN reading streaming THEN live-region announces updates without overwhelm
- Priority: P0
- Dependencies: a11y tests; Playwright a11y checks
- Technical Constraints: No color-only signaling; aria labels; contrast ≥ 4.5:1
- UX Considerations: Skip-to-content; reduced motion option

## 5. Functional Requirements

- Flows: load session -> send -> stream -> (optional tool calls) -> finalize -> persist; switch model -> confirm -> apply to next turn
- State Management: sessionId, messages[], modelId, streamingState, toolEvents[]; optimistic sends with server ack
- Validation Rules: message length caps, model allowlist, sessionId UUIDv4, tool args schema
- Integrations: A2A events for agent orchestration; MCP for tools; memories for persistence; ASBR HTTP/WebSocket endpoints

## 6. Non-Functional Requirements

- Performance: UI p95 < 2000 ms, API p95 < 500 ms for non-generation APIs; streamed token latency < 250 ms first-byte
- Scalability: 250 concurrent users (MVP), plan to 1000 in vNext; sessions up to 10k tokens retained per chat
- Security: session-bound auth token; server-side redaction; CSP; no secrets client-side
- Privacy: retain chat for 30 days by default; configurable; residency per deployment
- Accessibility: WCAG 2.2 AA conformance with automated and manual checks
- Observability: logs (structured), metrics (RPS, p95, errors), traces (request/span)
- Reliability: availability SLO 99.9%; error budgets applied to releases

## 7. Information Architecture and UX Notes

- IA: Left—session list; Center—chat; Right—tool panel (collapsible). Header—model select, settings.
- Progressive Disclosure: show tool details only on demand; show advanced model metadata via tooltip.
- Error Prevention: confirmation for destructive actions (delete session); input length indication.
- Feedback: distinct loading states, success toasts, actionable errors.
- Keyboard/Screen Reader: ARIA live-region for stream; tab order top-to-bottom; shortcuts for send (Cmd+Enter) and stop (Esc).

## 8. Data and API Surface

- Entities:
  - Session { id, title, modelId, createdAt, updatedAt, owner, isDeleted }
  - Message { id, sessionId, role, content, tokens, createdAt }
  - ToolEvent { id, sessionId, turnId, name, args(redacted), status, startedAt, endedAt }
- APIs (MVP):
  - POST /api/chat/{sessionId}/messages { content, modelId? } -> { messageId }; stream via WS/SSE at /api/chat/{sessionId}/stream
  - GET /api/chat/{sessionId} -> { session, messages[] }
  - GET /api/models -> { models: [{ id, label, speed, costTier }] }
  - GET /api/chat/{sessionId}/tools -> { events: ToolEvent[] }
  - Idempotency: client generates messageId; server upserts
- Events/Analytics:
  - message_sent, message_stream_started, message_completed, message_failed
  - tool_call_started, tool_call_completed, tool_call_failed
  - session_created, session_restored, model_selected

## 9. Risks, Assumptions, and Open Questions

- Risks: streaming stability (medium); tool payload leakage (low); a11y regressions (medium)
- Mitigation: retry/backoff and resumable streams; strict redaction; CI a11y gate
- Owners: Eng Lead (runtime), FE Lead (web), QA Lead (a11y/tests)
- Assumptions: single-tenant deployments initially; SSO out of scope
- Open Questions: Which transport (SSE vs WS) default? Due: next planning; What is minimal model list source of truth? Due: MVP planning

## 10. Release and Rollout

- Feature Flags: chat-ui.enabled, tool-visualizer.enabled
- Experiment Plan: optional—compare SSE vs WS first-byte latency; stop if p95 worsens by >10%
- Migration: create chat tables if absent; backfill from existing memories when possible
- Support: quickstart docs, fallback to CLI chat if UI unavailable

## 11. Traceability Matrix (see CSV)

Columns: Feature, StoryID, ACID, TestID, Metric, Owner

---

## Roadmap — Strict TDD and Engineering Principles (modeled on Open WebUI)

Guiding Principles: TDD-first, small vertical slices, ESM modules, hexagonal boundaries, SOLID, a11y-first, deterministic tests, contracts via Zod.

Milestone M0: Contracts and Tests (week 1)

- Define Zod schemas for Session, Message, ToolEvent and API contracts
- Write contract tests and pact-style mocks for ASBR <-> Web
- Add Playwright a11y baseline test (blank page structure) and Lighthouse CI config

Milestone M1: Streaming Kernel (weeks 1–2)

- Tests: unit for stream controller; integration test for SSE/WS echo; e2e: send/stream happy path
- Impl: backend streaming endpoint; client stream handler; first-byte < 250 ms target

Milestone M2: Chat Basics (weeks 2–3)

- Tests: message send validation; retry on network glitch; persistence round-trip; a11y tab order
- Impl: message composer, send, render assistant stream; optimistic UI; error handling

Milestone M3: Model Selection (week 3)

- Tests: allowlist enforcement; unavailable model fallback; persisted selection
- Impl: GET /models; dropdown; per-session model state

Milestone M4: History and Shareable URL (week 4)

- Tests: deep link restore; pagination; soft delete; empty state
- Impl: session route, loader, persistence hooks

Milestone M5: Tool Visualization (week 4–5)

- Tests: event rendering; redaction; failure states; no-secrets checks
- Impl: tool panel; event stream listener; collapsible UI

Milestone M6: Hardening and NFRs (week 5)

- Tests: load 250 concurrents; stability >30s; p95 API <500 ms; Lighthouse a11y ≥ 95%
- Impl: perf tuning, backpressure, logging/metrics/traces

CI Gates (per PR)

- pnpm format && pnpm lint && pnpm test && pnpm test:integration
- a11y: pnpm pw:test with axe; Lighthouse budget JSON
- Coverage ≥ 80% for changed lines; contract tests must pass; TypeScript strict true

Release Checklist

- Feature flags default off → on for canary → full rollout
- Error budget review and runbooks updated
- Docs: quickstart + troubleshooting
