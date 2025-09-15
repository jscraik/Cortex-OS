# Codex CLI (Rust Implementation)
<!-- markdownlint-disable MD013 -->

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/jamiescottcraik/Cortex-OS)
[![Phase 2](https://img.shields.io/badge/Phase%202-Core%20Features%20In%20Progress-yellow.svg)](https://github.com/jamiescottcraik/Cortex-OS)
[![Task 2.2](https://img.shields.io/badge/Task%202.2-Provider%20Abstraction%20✅-brightgreen.svg)](https://github.com/jamiescottcraik/Cortex-OS)
[![TDD](https://img.shields.io/badge/TDD-29%2F29%20tests%20passing-brightgreen.svg)](https://github.com/jamiescottcraik/Cortex-OS)
[![Rust Edition](https://img.shields.io/badge/rust-edition%202024-orange.svg)](https://rust-lang.org)
[![License](https://img.shields.io/badge/license-Apache_2.0-blue.svg)](LICENSE)

We provide Codex CLI as a standalone, native executable to ensure a zero-dependency install.

## Installing Codex

Today, the easiest way to install Codex is via `npm`, though we plan to publish Codex to other package managers soon.

```shell
npm i -g @openai/codex@native
codex
```

You can also download a platform-specific release directly from our [GitHub Releases](https://github.com/openai/codex/releases).

## What's new in the Rust CLI

While we are [working to close the gap between the TypeScript and Rust implementations of Codex CLI](https://github.com/openai/codex/issues/1262), note that the Rust CLI has a number of features that the TypeScript CLI does not!

### Config

Codex supports a rich set of configuration options. Note that the Rust CLI uses `config.toml` instead of `config.json`. See [`docs/configuration.md`](./docs/configuration.md) for details.

### Model Context Protocol Support

Codex CLI functions as an MCP client that can connect to MCP servers on startup. See the [`mcp_servers`](../docs/config.md#mcp_servers) section in the configuration documentation for details.

It is still experimental, but you can also launch Codex as an MCP _server_ by running `codex mcp`. Use the [`@modelcontextprotocol/inspector`](https://github.com/modelcontextprotocol/inspector) to try it out:

```shell
npx @modelcontextprotocol/inspector codex mcp
```

### Notifications

You can enable notifications by configuring a script that is run whenever the agent finishes a turn. The [notify documentation](../docs/config.md#notify) includes a detailed example that explains how to get desktop notifications via [terminal-notifier](https://github.com/julienXX/terminal-notifier) on macOS.

### `codex exec` to run Codex programmatially/non-interactively

To run Codex non-interactively, run `codex exec PROMPT` (you can also pass the prompt via `stdin`) and Codex will work on your task until it decides that it is done and exits. Output is printed to the terminal directly. You can set the `RUST_LOG` environment variable to see more about what's going on.

## Development Status

### ✅ Completed Features

- **Foundation (Phase 1)**: Complete TDD foundation with configuration, error handling, and project structure
- **Provider Abstraction (Task 2.2)**: Complete provider abstraction layer with registry system and mock implementations
- **Chat Interface (Task 2.1)**: Message management, conversation state, and chat subcommand implementation
- **Test Coverage**: 29 comprehensive tests covering all implemented functionality

### 🔄 Current Development

- **Streaming Support (Task 2.3)**: Infrastructure in place, TUI integration pending
- **Provider Integration (Phase 3)**: Ready for real provider implementations (OpenAI, Anthropic, Ollama)

### 📋 Architecture Overview

The Rust CLI implements a modern, TDD-driven architecture with:

- **Provider Abstraction**: Unified interface for multiple AI model providers
- **Conversation Management**: Stateful message handling with persistence
- **Configuration System**: Type-safe, validated configuration with TOML support
- **Error Handling**: Comprehensive error types with structured propagation
- **Test Coverage**: Full TDD implementation with mock providers for testing

Typing `@` triggers a fuzzy-filename search over the workspace root. Use up/down to select among the results and Tab or Enter to replace the `@` with the selected path. You can use Esc to cancel the search.

### Esc–Esc to edit a previous message

When the chat composer is empty, press Esc to prime “backtrack” mode. Press Esc again to open a transcript preview highlighting the last user message; press Esc repeatedly to step to older user messages. Press Enter to confirm and Codex will fork the conversation from that point, trim the visible transcript accordingly, and pre‑fill the composer with the selected user message so you can edit and resubmit it.

In the transcript preview, the footer shows an `Esc edit prev` hint while editing is active.

### `--cd`/`-C` flag

Sometimes it is not convenient to `cd` to the directory you want Codex to use as the "working root" before running Codex. Fortunately, `codex` supports a `--cd` option so you can specify whatever folder you want.

This is additive and does not affect existing commands.

#### Chat flags for multi‑turn and sessions

- `--session NAME`: persist history to `$CODEX_HOME/sessions/NAME.jsonl`
- `--session-file PATH`: persist history to a custom JSONL path
- `--reset`: start fresh, truncating the session file
- `--repl`: stay in a simple line‑based REPL (type `:q` to quit)
- `-C, --cd DIR`: run Chat using DIR as the working root (same semantics as `codex exec -C`)
- `PROMPT` can be `-` to read from stdin; optional when `--repl` is used

Note: When using `--repl` or sessions, the JSONL history includes both user and assistant items. This is expected and allows full turn-by-turn replay.

Examples:

```shell
# Single turn (unchanged)
codex chat "Start a plan for Phase 2"

# Read entire prompt from stdin
echo "Write a haiku about Codex" | codex chat -

# Persist a named session
codex chat --session demo "Initial message"

# Reset an existing session
codex chat --session demo --reset "Fresh start"

# REPL with session persistence
codex chat --session demo --repl

# Change the working directory for a one-off chat
codex chat -C ./examples "List files in the project and suggest a cleanup plan"
```

Developer notes:

- Session metadata may include Git details (commit, branch, repo URL) when Codex runs inside a git repo.
- For hermetic testing, you can set `CODEX_RS_SSE_FIXTURE` to a local `.sse` file to bypass network calls in CLI/exec tests.

### Experimenting with the Codex Sandbox

To test to see what happens when a command is run under the sandbox provided by Codex, we provide the following subcommands in Codex CLI:

```shell
# macOS
codex debug seatbelt [--full-auto] [COMMAND]...

# Linux
codex debug landlock [--full-auto] [COMMAND]...
```

### Selecting a sandbox policy via `--sandbox`

The Rust CLI exposes a dedicated `--sandbox` (`-s`) flag that lets you pick the sandbox policy **without** having to reach for the generic `-c/--config` option:

```shell
# Run Codex with the default, read-only sandbox
codex --sandbox read-only

# Allow the agent to write within the current workspace while still blocking network access
codex --sandbox workspace-write

# Danger! Disable sandboxing entirely (only do this if you are already running in a container or other isolated env)
codex --sandbox danger-full-access
```

The same setting can be persisted in `~/.codex/config.toml` via the top-level `sandbox_mode = "MODE"` key, e.g. `sandbox_mode = "workspace-write"`.

### Streaming Modes

Codex supports multiple streaming presentation modes for model responses. These control how incremental output is surfaced in the TUI and non‑interactive `exec` flows.

Modes:

- `auto` (default): Behaves like the Responses API aggregate mode — Codex buffers partial deltas and prints a single finalized assistant message when complete (unless a provider only supports raw, in which case raw is shown).
- `aggregate`: Force aggregation even if raw token streaming is available. Useful for cleaner logs or when piping output.
- `raw`: Display token deltas as they arrive with minimal post‑processing.
- `json`: Emit structured NDJSON events (one JSON object per line) describing the streaming lifecycle (`delta`, `item`, `completed`). Intended for tooling and programmatic consumption.

CLI flags (mutually exclusive shortcuts):

```shell
# Explicit mode selection
codex exec --stream-mode raw "Explain the streaming design"

# Convenience aliases
codex exec --aggregate "Summarize this project"
codex exec --raw "Draft a README section"
codex exec --json-stream "Generate structured output"

Deprecated legacy aliases (still accepted with a warning, prefer the above):

```shell
# Old forms (will print deprecation notices)
codex chat --no-aggregate "Stream tokens"      # -> --stream-mode raw
codex chat --aggregate   "One final answer"    # -> --stream-mode aggregate
codex chat --stream-json "Structured events"   # -> --stream-mode json
codex chat --json        "Structured events"   # -> --stream-mode json
```

The unified `--stream-mode <auto|aggregate|raw|json>` flag is the canonical interface going forward; legacy flags may be removed in a future release once external automation migrates.

TUI supports the same flags; when `--json-stream` is used, Codex still renders a human‑friendly view while internally consuming the structured events.

Configuration precedence (lowest to highest):

1. `~/.codex/config.toml` `stream_mode = "..."`
2. Environment variable `CODEX_STREAM_MODE` (warns & falls back to `auto` if unrecognized)
3. CLI flags (`--stream-mode`, `--aggregate`, `--raw`, `--json-stream`)

Example config snippet:

```toml
stream_mode = "aggregate"
```

Environment override example:

```shell
CODEX_STREAM_MODE=raw codex exec "Tail the build output and summarize issues"
```

JSON streaming format (illustrative):

```json
{"type":"delta","id":"msg_1","text":"Hello"}
{"type":"delta","id":"msg_1","text":" world"}
{"type":"item","id":"msg_1","final":true,"text":"Hello world"}
{"type":"completed","conversation_id":"abc123"}
```

NOTE: The `json` mode is currently an extended feature not yet present in upstream `openai/codex` `codex-rs`. If you share a single `config.toml` across binaries and run an upstream build that does not know `json`, it will fall back to `auto` (with a warning) rather than failing.

## Code Organization

This folder is the root of a Cargo workspace. It contains quite a bit of experimental code, but here are the key crates:

- [`core/`](./core) contains the business logic for Codex. Ultimately, we hope this to be a library crate that is generally useful for building other Rust/native applications that use Codex.
- [`exec/`](./exec) "headless" CLI for use in automation.
- [`tui/`](./tui) CLI that launches a fullscreen TUI built with [Ratatui](https://ratatui.rs/).
- [`cli/`](./cli) CLI multitool that provides the aforementioned CLIs via subcommands.

## Testing & Coverage

We provide unified scripts, Makefile targets, and Nx run-commands for exercising the Rust workspace in isolation from the larger monorepo.

### Quick Commands

From repo root (via `pnpm` scripts):

```shell
pnpm codex:test             # All workspace crates (unit + doc + ignored excluded by default)
pnpm codex:test:unit        # Focus on fast unit-style tests (skips those tagged integration/slow)
pnpm codex:test:integration # Only tests marked with #[ignore] (live / external)
pnpm codex:test:coverage    # Instrument with LLVM source-based coverage, emit lcov if grcov present
```

Makefile shortcuts:

```shell
make codex-test
make codex-test-unit
make codex-test-integration
make codex-test-coverage
```

Nx targets (optional, integrates with `nx run` & dep graph):

```shell
pnpm nx test cortex-code-rust
pnpm nx run cortex-code-rust:test-unit
pnpm nx run cortex-code-rust:test-integration
pnpm nx run cortex-code-rust:coverage
```

### Integration Test Heuristic

Currently, we treat tests annotated with `#[ignore]` (e.g. those in `core/tests/suite/live_cli.rs`) as integration/live tests. This keeps default `cargo test` runs deterministic and free of real API calls. To run them:

```shell
cargo test --workspace -- --ignored
```

### Coverage Details

We now use [`cargo-llvm-cov`](https://github.com/taiki-e/cargo-llvm-cov) for source-based coverage. The script `pnpm codex:test:coverage` runs:

```shell
cargo llvm-cov --workspace --lcov --output-path target/coverage/lcov.info --html
```

This produces:

- `apps/cortex-codex/target/coverage/lcov.info` (CI/IDE ingestion)
- `apps/cortex-codex/target/coverage/html/` (human browsable report)

Open the HTML report via:

```shell
open apps/cortex-codex/target/coverage/html/index.html
```

Install the tool once with:

```shell
pnpm codex:install:coverage-tools   # installs cargo-llvm-cov
```

### Fast Inner Loop

During development you can narrow to a single crate or test:

```shell
cd apps/cortex-codex
cargo test -p core stream_mode
```

Or continuously watch (requires `cargo-watch`):

```shell
cargo watch -x 'test -p core'
```

### Tool Installation Helper

Install `cargo-llvm-cov` (idempotent):

```shell
pnpm codex:install:coverage-tools
```

### xtask Automation

We ship an `xtask` helper crate (`apps/cortex-codex/xtask`) with subcommands:

```shell
pnpm codex:coverage:xtask            # cargo llvm-cov run (lcov + html)
pnpm codex:coverage:report           # cargo llvm-cov --no-run (re-generate reports)
cd apps/cortex-codex/xtask && cargo run -- doctor  # tool availability summary
```

Pass extra test filters after `--`:

```shell
cd apps/cortex-codex/xtask
cargo run -- coverage -- stream_mode
```

### CI Artifact (Example Snippet)

Add a job step (GitHub Actions example) to persist `lcov.info` + HTML:

```yaml
- name: Codex coverage
  run: pnpm codex:test:coverage
- name: Upload coverage (lcov)
  uses: actions/upload-artifact@v4
  with:
    name: codex-coverage-lcov
    path: apps/cortex-codex/target/coverage/lcov.info
- name: Upload coverage html
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: codex-coverage-html
    path: apps/cortex-codex/target/coverage/html
```

### Future Improvements

- Distinguish `slow` tests with a custom attribute macro
- Provide a `cargo-xtask` wrapper for richer workflows
- Gate live tests behind an explicit `CODEx_LIVE=1` env toggle for clarity

### Providers and Keys

See [`docs/providers.md`](./docs/providers.md) for configuring OpenAI/ChatGPT, Anthropic, Z.ai, Ollama, and MLX.

Quick examples:

```bash
export ANTHROPIC_API_KEY=... && codex -c model_provider=anthropic
export ZAI_API_KEY=... && codex-exec -c model_provider=zai "Hello"
codex -c model_provider=oss chat "Hello"     # Ollama local
export MLX_BASE_URL=http://127.0.0.1:8080/v1 && codex -c model_provider=mlx chat "Hello"
```

The cortex Node wrapper launches the Rust binary and falls back to `~/.cargo/bin/codex` when needed.
If you see a "binary not found" error:

```bash
cd apps/cortex-code && cargo build --release
# or
cd apps/cortex-code && cargo install --path .
```

### Overlay Tool Use and Round-Trip

- Overlay providers (Anthropic/Z.ai) can execute tools and send a follow-up request with `tool_result` so the assistant continues with tool output inline.
- This behavior is guarded by `CODEX_OVERLAY_ROUNDTRIP=true` for both CLI and TUI (default off):

```bash
export CODEX_OVERLAY_ROUNDTRIP=true
export ZAI_API_KEY=...
codex chat --provider zai --repl

export ANTHROPIC_API_KEY=...
codex -c model_provider=anthropic
```

- Tool execution order: MCP tools (if configured; case-insensitive name match; input JSON passed as-is) → local fallback (`echo`, `time`).
- See docs/cortex-code-docs/providers.md for details and MCP configuration snippet.
