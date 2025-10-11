## 1) File Tree of Proposed Changes
packages/openai-apps-sdk/
├─ src/agents/openai-agents-js-adapter.ts    NEW
├─ src/agents/instructor-js-adapter.ts       NEW
├─ src/index.ts                              UPDATE
├─ tests/agents/openai-agents-js.test.ts     NEW
├─ tests/agents/instructor-js.test.ts        NEW
└─ package.json                              UPDATE

packages/model-gateway/
├─ src/providers/openai-agents.provider.ts   NEW
├─ src/config/hybrid-loader.ts               UPDATE
├─ src/routes/health.ts                      UPDATE
└─ project.json                              UPDATE

apps/cortex-py/
├─ src/agents/openai_agents_py_adapter.py    NEW
├─ src/agents/instructor_adapter.py          NEW
├─ tests/test_openai_agents_py_adapter.py    NEW
├─ tests/test_instructor_adapter.py          NEW
└─ pyproject.toml                            UPDATE

config/
├─ hybrid-model-strategy.json                NO-CHANGE
├─ hybrid-model-enforcement.json             NO-CHANGE
└─ hybrid-deployment.yml                     NO-CHANGE

## 2) Implementation Plan
1. JS adapters: implement createOpenAIAgentsAdapter(chat) and createInstructorAdapter(parse); export via src/index.ts.
2. Tests (JS): vitest unit tests for success/error paths; no network.
3. Python adapters: add OpenAIAgentsPyAdapter.chat and InstructorAdapter.parse with branded errors.
4. Tests (Py): pytest unit tests with fakes; mark as no-network.
5. Model Gateway: add openai-agents.provider.ts composing JS adapter; update hybrid-loader.ts to read config/*.json|yml and enforce MLX-first + conjunction; update health.ts with brAInwav-branded checks.
6. Manifests: openai-apps-sdk/package.json add sideEffects:false; cortex-py/pyproject.toml add [project.optional-dependencies].agents with instructor and openai-agents-python VCS dep.
7. Governance gates: call Vibe Check after plan, persist LocalMemoryEntryId, run pnpm ci:governance and pnpm ci:memory:enforce.

## 3) Technical Rationale
- Adapters isolate vendor SDKs behind stable package boundaries; provider wiring stays in model-gateway per routing concerns.
- Config-driven selection honors MLX-first and cloud conjunction without code toggles; Zod/Pydantic for validation.

## 4) Dependency Impact
- JS: keep adapter generic; no hard dependency on SDKs yet to avoid registry instability; tests use fakes.
- Python: optional "agents" extra adds instructor>=1.3.0 and openai-agents-python via git URL.
- No root package.json changes; Nx unaffected.

## 5) Risks & Mitigations
- SDK naming/availability [Unverified] → pin VCS refs; encapsulate behind adapters.
- Test flakiness via network → use mocks/fakes; block network in CI.
- Config drift → strict schema validation and branded errors.

## 6) Testing & Validation Strategy
- Unit: adapter success/error, schema parsing; router config selection.
- Integration: provider with mocked HTTP; health endpoint reflects hybrid state.
- Security: semgrep clean; no secrets/random.
- Observability: logs include brand:"brAInwav"; assert in tests.

## 7) Rollout / Migration Notes
- Use CORTEX_HYBRID_MODE and enforcement JSON for gating; default off until validated.
- Fallback chains per enforcement.json; no breaking changes.

## 8) Completion Criteria
- [ ] Tests ≥90% on changed; lint/type pass; structure/security gates pass.
- [ ] Vibe Check evidence logged; LocalMemoryEntryId recorded and verified.
- [ ] Docs in tasks/* updated; provider wired and health branded.
