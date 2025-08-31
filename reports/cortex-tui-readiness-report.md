# cortex-TUI Readiness Report
## 1. Executive Summary
Cortex TUI on commit 8525026edf3a6717c82ca2994df82c7ddb430ad6 provides a Rust-based terminal interface with multi-provider AI integrations and experimental MLX support. Testing failures, missing security documentation, and incomplete features indicate the project is not production-ready.
## 2. Traffic Light Scores
| Area | Score | R/A/G | Evidence |
|---|---:|:---:|---|
| Architecture & Boundaries | 60 | Amber | `src/config.rs` shows provider fallback structure【F:apps/cortex-tui/src/config.rs†L73-L80】 |
| Code Quality & Maintainability | 55 | Red | Unused imports trigger warnings【F:apps/cortex-tui/src/mcp/client.rs†L6-L8】 |
| API & Contracts | 65 | Amber | Server endpoints defined with structured responses【F:apps/cortex-tui/src/server/handlers.rs†L17-L66】 |
| Security & Compliance | 40 | Red | No SECURITY.md found【1e2082†L1-L2】 |
| Testing & Coverage | 30 | Red | Provider factory tests fail【5ea00f†L14-L37】 |
| CI/CD & Release | 50 | Red | Workflow `cortex-tui-ci.yml` exists but provider tests fail【cec774†L1-L21】【5ea00f†L14-L37】 |
| Runtime & Observability | 60 | Amber | Tracing initialized in main【F:apps/cortex-tui/src/main.rs†L76-L83】 |
| Performance & SLOs | 50 | Red | No benchmarks or performance goals documented |
| Accessibility & DX | 45 | Red | README lacks a11y guidance; TUI has no screen-reader mode【F:apps/cortex-tui/README.md†L1-L48】 |
| MLX/Embeddings/Rerankers/Ollama/Frontier | 55 | Amber | Local MLX provider implemented【F:apps/cortex-tui/src/providers/local.rs†L23-L66】 |
## 3. Backward-Compatibility Removals
| File | Lines | Reason | Replacement | Risk |
|---|---|---|---|---|
| src/app.rs | 122-132 | MCP server management placeholders | Implement full server CRUD | Low |
| src/model/mod.rs | 2 | Model layer unimplemented | Add conversation state structs | Medium |
| src/controller/mod.rs | 2 | Controller logic missing | Implement event handlers | Medium |
## 4. TDD Plan
1. **Fix provider factory tests**
   - Given Config defaulting to `github-models`, when `create_provider` is called, then provider name should match.
   - Commands: `cargo test --lib providers::tests`
2. **Implement MCP server CRUD**
   - Add list/add/remove in `CortexApp` and cover with tests.
3. **Memory module coverage**
   - Add edge-case tests for retention and error paths.
## 5. PRD
- **Scope**: Deliver production-ready terminal client for Cortex-OS with multi-provider AI and daemon mode.
- **Goals**: Stable chat flows, configurable providers, ≥95% test coverage.
- **Non-goals**: GUI, browser-based client.
- **Personas**: DevOps engineer, CLI power user.
- **Requirements**: Provider fallback, secure config loading, memory audit trail.
- **Success Metrics**: 95% test coverage; zero high-severity bugs for one month.
- **Dependencies**: Rust 1.75+, tokio, ratatui, tracing.
- **Release Plan**: alpha → beta → GA with semantic versioning.
- **A11y**: Keyboard-only operation, color contrast AA.
- **Security**: API key redaction, configurable network egress.
- **Telemetry**: Structured tracing with optional export.
- **Rollback**: Cargo version pinning and git tag revert.
## 6. Technical Specification
- **Architecture**: Modular Rust crates with provider abstraction and async runtime.
- **Data Flow**: CLI → Controller → Provider → Memory/Server.
- **Configs**: TOML (`config.toml`), validated via `Config::from_file`.
- **APIs**: HTTP server via axum exposing chat, streaming, and memory endpoints.
- **ML Integration**: Prefer `GitHubModelsProvider`; fallback to `OpenAIProvider` then `LocalMLXProvider`.
- **Error Handling**: `anyhow` for CLI, typed errors for provider layer.
- **Testing**: `cargo test`, mockito for HTTP mocks, `insta` for snapshots.
- **Observability**: `tracing` with env-filter.
## 7. Strengths, Weaknesses, Innovations
- **Strengths**
  - Config-driven provider fallback enables multiple backends【F:apps/cortex-tui/src/config.rs†L73-L80】
  - Startup tracing gives unified logs【F:apps/cortex-tui/src/main.rs†L76-L83】
- **Weaknesses**
  - Missing SECURITY.md policy【1e2082†L1-L2】
  - Provider factory tests failing【5ea00f†L14-L37】
- **Innovations**
  - Local MLX provider bridges Python via pyo3【F:apps/cortex-tui/src/providers/local.rs†L23-L66】

## 8. Risk Register
| ID | Risk | Severity | Mitigation | Evidence |
|---|---|---|---|---|
| R1 | Provider factory tests failing | High | Fix logic and expand unit tests | `cargo test` output【5ea00f†L14-L37】 |
| R2 | Security policy missing | High | Add SECURITY.md with disclosure process | `ls` error【1e2082†L1-L2】 |
| R3 | MCP server management incomplete | Medium | Implement full server CRUD | `src/app.rs` placeholders【F:apps/cortex-tui/src/app.rs†L122-L132】 |

## 9. Performance and Resource Profile
- Memory retention defaults to 30 days【F:apps/cortex-tui/src/config.rs†L90-L93】
- TUI scrollback limited to 1000 lines【F:apps/cortex-tui/src/config.rs†L100-L103】
- No benchmarks or latency targets documented

## 10. Future Improvements Backlog
| Item | ROI | Notes |
|---|---|---|
| Add SECURITY.md and threat model | High | Blocks compliance |
| Fix provider tests and raise coverage ≥95% | High | Enables stable releases |
| Implement MCP server CRUD commands | Medium | Removes placeholder code |
| Add screen-reader mode and a11y docs | Medium | Improves DX |
| Introduce performance benchmarks | Low | Optional optimization |
