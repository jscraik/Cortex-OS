# Comprehensive PRD & Implementation Plan: Cortex-CLI v2.0 with Ratatui TUI

## Executive Summary

Transform cortex-cli from a basic command-line tool into a comprehensive terminal-first AI coding agent that combines the best innovations from sst/opencode and openai/codex, using Codex's current Ratatui 0.29.0 TUI implementation while following strict TDD and SOLID principles.

## Repository Analysis & Golden Nuggets

### sst/opencode - Key Innovations to Adopt

- **Comment-as-API pattern**: `/cortex` triggers in GitHub issues/PRs
- **Client/Server architecture**: Enables multiple clients (terminal, mobile, web)
- **Provider-agnostic design**: Support for OpenAI, Anthropic, Google, local models
- **GitHub Actions workflows**: Automated triage, stats, duplicate detection
- **Stainless SDK generation**: Automated client SDK generation

### openai/codex - Current TUI Technology

- **Ratatui 0.29.0**: Most current TUI framework with advanced features
- **MCP Protocol support**: First-class Model Context Protocol integration
- **AGENTS.md memory**: Persistent agent memory system
- **CI/Non-interactive mode**: Built for automation
- **Zero-data-retention**: Privacy-first local execution
- **Rust performance**: 97% Rust for maximum speed

### GitHub Models REST API - Opportunities

- **Free tier**: No API key required for basic usage
- **OpenAI-compatible**: Drop-in replacement
- **Actions integration**: `models: read` permission enables workflows
- **Streaming support**: Real-time responses
- **Organization attribution**: Track usage per org

## Current Cortex-CLI Gaps

1. No TUI interface (command-only)
2. No GitHub Actions integration
3. No provider-agnostic model support
4. No CI/non-interactive mode
5. No persistent agent memory
6. No GitHub Models integration
7. No client/server architecture

## TDD-Driven Architecture with SOLID Principles

### 1. Core Architecture (MVC + SOLID)

```rust
// Single Responsibility Principle
trait Renderable {
    fn render(&self, frame: &mut Frame, area: Rect);
}

trait EventHandler {
    fn handle_event(&mut self, event: Event) -> Result<EventResponse>;
}

trait StatePersistence {
    fn save_state(&self) -> Result<()>;
    fn load_state(&mut self) -> Result<()>;
}

// Open/Closed + Dependency Inversion
trait ModelProvider {
    async fn complete(&self, prompt: &str) -> Result<String>;
    async fn stream(&self, prompt: &str) -> Result<ResponseStream>;
}

// Liskov Substitution - All providers interchangeable
struct GitHubModelsProvider;
struct OpenAIProvider;
struct AnthropicProvider;
struct LocalMLXProvider;

impl ModelProvider for GitHubModelsProvider { /* ... */ }
impl ModelProvider for OpenAIProvider { /* ... */ }
impl ModelProvider for AnthropicProvider { /* ... */ }
impl ModelProvider for LocalMLXProvider { /* ... */ }

// Interface Segregation
trait ConfigProvider {
    fn get_config(&self) -> &Config;
}

trait ConfigWriter {
    fn update_config(&mut self, config: Config) -> Result<()>;
}
```

### 2. Test-First Specifications

```rust
// tests/unit/chat_widget_spec.rs
#[cfg(test)]
mod chat_widget_tests {
    use super::*;
    use insta::assert_snapshot;

    #[test]
    fn test_chat_renders_messages() {
        // Given
        let mut chat = ChatWidget::new();
        chat.add_message(Message::user("Hello"));
        chat.add_message(Message::assistant("Hi there!"));

        // When
        let mut terminal = TestTerminal::new(80, 24);
        terminal.draw(|f| chat.render(f, f.area())).unwrap();

        // Then
        assert_snapshot!(terminal.backend().buffer());
    }

    #[test]
    fn test_wcag_keyboard_navigation() {
        // Given
        let mut chat = ChatWidget::new();

        // When/Then - Tab cycles through focusable elements
        assert_eq!(chat.focused_element(), FocusElement::Input);
        chat.handle_event(Event::Key(KeyCode::Tab)).unwrap();
        assert_eq!(chat.focused_element(), FocusElement::SendButton);
    }
}

// tests/integration/github_models_spec.rs
#[tokio::test]
async fn test_github_models_streaming() {
    // Given
    let _m = mock("POST", "/inference/chat/completions")
        .with_status(200)
        .with_header("content-type", "text/event-stream")
        .with_body_from_fn(|w| {
            w.write_all(b"data: {\"choices\":[{\"delta\":{\"content\":\"Hello\"}}]}\n\n")
        })
        .create();

    let provider = GitHubModelsProvider::new();

    // When
    let response = provider.stream("Hi").await.unwrap();

    // Then
    assert_eq!(response.collect().await, "Hello");
}

// tests/e2e/full_flow_spec.rs
#[test]
fn test_ci_mode_with_approval_gates() {
    // Given
    let app = CortexApp::new();

    // When
    let result = app.run_ci("--prompt 'explain code' --require-approval");

    // Then
    assert_eq!(result.exit_code, 0);
    assert!(result.output.contains("Waiting for approval"));
}
```

## Implementation Phases

### Phase 1: Foundation & TUI Core (Week 1-2)

#### 1.1 Project Setup

```bash
# Create Rust TUI project
apps/cortex-tui/
├── Cargo.toml
├── src/
│   ├── main.rs
│   ├── app.rs
│   ├── config.rs
│   ├── model/
│   │   ├── mod.rs
│   │   ├── conversation.rs
│   │   └── memory.rs
│   ├── view/
│   │   ├── mod.rs
│   │   ├── chat.rs
│   │   ├── diff.rs
│   │   └── palette.rs
│   ├── controller/
│   │   ├── mod.rs
│   │   └── events.rs
│   └── providers/
│       ├── mod.rs
│       ├── github.rs
│       ├── openai.rs
│       └── local.rs
├── tests/
│   ├── unit/
│   ├── integration/
│   └── snapshots/
└── benches/
    └── tui_bench.rs
```

#### 1.2 Dependencies (Matching Codex)

```toml
[package]
name = "cortex-tui"
version = "0.1.0"
edition = "2021"

[dependencies]
# TUI Framework (exact Codex version)
ratatui = { version = "0.29.0", features = [
    "scrolling-regions",
    "unstable-rendered-line-info",
    "unstable-widget-ref"
]}
crossterm = "0.28.1"
tui-input = "0.14.0"
tui-markdown = "0.3.3"
ratatui-image = "8.0.0"

# Async Runtime
tokio = { version = "1", features = ["full"] }

# HTTP & API
reqwest = { version = "0.12", features = ["stream", "json"] }
eventsource-stream = "0.2"

# Configuration
serde = { version = "1", features = ["derive"] }
toml = "0.8"
directories = "5.0"

# CLI
clap = { version = "4", features = ["derive"] }

# Testing
insta = { version = "1.34", features = ["yaml"] }
mockito = "1.2"
tempfile = "3"
```

#### 1.3 Configuration System

```toml
# ~/.cortex/config.toml
[provider]
default = "github-models"
fallback = ["openai", "local-mlx"]

[github-models]
model = "openai/gpt-4o-mini"
endpoint = "https://models.github.ai"

[mcp]
servers = ["cortex.fs", "cortex.git", "cortex.search"]

[memory]
path = "~/.cortex/agents.md"
retention_days = 30
audit = true

[privacy]
zdr = true
telemetry = false
redact_secrets = true

[tui]
theme = "dark"
scrollback = 1000
highlight_syntax = true
```

### Phase 2: Provider Integration (Week 3)

#### 2.1 GitHub Models Client

```rust
// src/providers/github.rs
pub struct GitHubModelsProvider {
    client: reqwest::Client,
    config: GitHubConfig,
}

impl GitHubModelsProvider {
    pub fn new() -> Self {
        let client = reqwest::Client::builder()
            .default_headers(headers! {
                "Accept" => "application/vnd.github+json",
                "X-GitHub-Api-Version" => "2022-11-28",
            })
            .build()
            .unwrap();

        Self { client, config: GitHubConfig::from_env() }
    }
}

#[async_trait]
impl ModelProvider for GitHubModelsProvider {
    async fn complete(&self, prompt: &str) -> Result<String> {
        let response = self.client
            .post("https://models.github.ai/inference/chat/completions")
            .bearer_auth(&self.config.token)
            .json(&json!({
                "model": self.config.model,
                "messages": [
                    {"role": "system", "content": "You are Cortex AI"},
                    {"role": "user", "content": prompt}
                ],
                "stream": false
            }))
            .send()
            .await?;

        // Parse response
        Ok(response.json::<CompletionResponse>().await?.content)
    }
}
```

#### 2.2 Provider Factory

```rust
// src/providers/mod.rs
pub fn create_provider(config: &Config) -> Box<dyn ModelProvider> {
    match config.provider.default.as_str() {
        "github-models" => Box::new(GitHubModelsProvider::new()),
        "openai" => Box::new(OpenAIProvider::new()),
        "anthropic" => Box::new(AnthropicProvider::new()),
        "local-mlx" => Box::new(LocalMLXProvider::new()),
        _ => panic!("Unknown provider: {}", config.provider.default),
    }
}
```

### Phase 3: GitHub Actions Integration (Week 4)

#### 3.1 Comment Dispatcher Workflow

```yaml
# .github/workflows/cortex-agent.yml
name: Cortex Agent
on:
  issue_comment:
    types: [created]

permissions:
  contents: read
  issues: write
  pull-requests: write
  models: read # Required for GitHub Models

jobs:
  dispatch:
    if: contains(github.event.comment.body, '/cortex')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Cortex
        run: |
          curl -L https://github.com/${{ github.repository }}/releases/latest/download/cortex-linux-x64 -o cortex
          chmod +x cortex

      - name: Parse Command
        id: parse
        run: |
          COMMAND=$(echo "${{ github.event.comment.body }}" | sed 's|/cortex ||')
          echo "command=$COMMAND" >> $GITHUB_OUTPUT

      - name: Run Cortex Agent
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CORTEX_PROVIDER: github-models
        run: |
          ./cortex run --ci \
            --prompt "${{ steps.parse.outputs.command }}" \
            --output response.json

      - name: Post Response
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const response = JSON.parse(fs.readFileSync('response.json'));

            await github.rest.issues.createComment({
              ...context.repo,
              issue_number: context.issue.number,
              body: `## Cortex Response\n\n${response.message}\n\n---\n*Generated by Cortex-CLI v2.0*`
            });
```

#### 3.2 PR Review Automation

```yaml
# .github/workflows/cortex-review.yml
name: Cortex PR Review
on:
  pull_request:
    types: [opened, synchronize]

permissions:
  pull-requests: write
  models: read

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Get PR Diff
        run: |
          git diff origin/${{ github.base_ref }}..HEAD > pr.diff

      - name: Run Cortex Review
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          ./cortex review \
            --diff pr.diff \
            --output review.md

      - name: Post Review
        uses: actions/github-script@v7
        with:
          script: |
            const review = fs.readFileSync('review.md', 'utf8');
            await github.rest.pulls.createReview({
              ...context.repo,
              pull_number: context.issue.number,
              body: review,
              event: 'COMMENT'
            });
```

### Phase 4: MCP & Memory Enhancement (Week 5)

#### 4.1 MCP Server Management

```rust
// src/mcp/manager.rs
pub struct McpManager {
    servers: HashMap<String, McpServer>,
    registry: McpRegistry,
}

impl McpManager {
    pub async fn add_server(&mut self, name: &str, config: McpConfig) -> Result<()> {
        let server = McpServer::connect(config).await?;
        self.servers.insert(name.to_string(), server);
        Ok(())
    }

    pub async fn list_tools(&self) -> Vec<Tool> {
        self.servers.values()
            .flat_map(|s| s.tools())
            .collect()
    }
}
```

#### 4.2 Agent Memory System

```rust
// src/memory/mod.rs
pub struct AgentMemory {
    path: PathBuf,
    entries: Vec<MemoryEntry>,
    schema: MemorySchema,
}

impl AgentMemory {
    pub fn add_entry(&mut self, entry: MemoryEntry) -> Result<()> {
        // Validate with Zod-like schema
        self.schema.validate(&entry)?;

        // Add audit trail
        let audited = entry.with_audit(Audit::new());
        self.entries.push(audited);

        // Persist to AGENTS.md
        self.save()?;
        Ok(())
    }
}
```

### Phase 5: Client/Server Architecture (Week 6)

#### 5.1 Daemon Service

```rust
// src/server/daemon.rs
pub struct CortexDaemon {
    server: Server,
    state: Arc<Mutex<AppState>>,
}

impl CortexDaemon {
    pub async fn start(port: u16) -> Result<()> {
        let app = Router::new()
            .route("/complete", post(handle_completion))
            .route("/ws", get(websocket_handler))
            .with_state(self.state.clone());

        let addr = SocketAddr::from(([127, 0, 0, 1], port));
        axum::Server::bind(&addr)
            .serve(app.into_make_service())
            .await?;

        Ok(())
    }
}
```

#### 5.2 REST API

```rust
// src/server/api.rs
async fn handle_completion(
    State(state): State<Arc<Mutex<AppState>>>,
    Json(request): Json<CompletionRequest>,
) -> Result<Json<CompletionResponse>> {
    let provider = state.lock().await.provider();
    let response = provider.complete(&request.prompt).await?;
    Ok(Json(CompletionResponse { content: response }))
}
```

## Testing Strategy

### 1. Test Pyramid

```
         /\
        /  \  E2E Tests (10%)
       /----\
      /      \  Integration Tests (30%)
     /--------\
    /          \  Unit Tests (60%)
   /____________\
```

### 2. Test Commands

```bash
# Unit tests
cargo test --lib

# Integration tests
cargo test --test '*'

# Snapshot tests
cargo insta test && cargo insta review

# Coverage
cargo tarpaulin --out Html --output-dir coverage

# Benchmarks
cargo bench

# Security audit
cargo audit

# Linting
cargo clippy -- -D warnings
```

### 3. CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions-rust-lang/setup-rust-toolchain@v1

      - name: Run tests
        run: cargo test --all-features

      - name: Check coverage
        run: |
          cargo tarpaulin --out Xml
          if [ $(cargo tarpaulin --print-summary | grep "Coverage" | awk '{print int($2)}') -lt 90 ]; then
            echo "Coverage below 90%"
            exit 1
          fi

      - name: Security audit
        run: cargo audit

      - name: Clippy
        run: cargo clippy -- -D warnings
```

## Migration Strategy

### Option A: Gradual Migration (Recommended)

1. **Phase 1**: Keep TypeScript CLI, add Rust TUI as separate binary
2. **Phase 2**: Share configuration via TOML
3. **Phase 3**: Migrate commands one by one to Rust
4. **Phase 4**: Deprecate TypeScript, single Rust binary

### Option B: Parallel Development

1. Maintain TypeScript for existing users
2. Develop Rust version as `cortex-v2`
3. Feature parity, then switch

## Success Metrics

1. **Performance**: <100ms command response time
2. **Reliability**: 99.9% daemon uptime
3. **Coverage**: 90% test coverage maintained
4. **Security**: Zero CVEs, passing cargo audit
5. **Accessibility**: WCAG 2.2 AA compliant
6. **Adoption**: 1000+ installs within 3 months

## Key Differentiators

| Feature            | OpenCode | Codex        | Cortex-CLI v2 |
| ------------------ | -------- | ------------ | ------------- |
| TUI Technology     | Go+TS    | Ratatui 0.29 | Ratatui 0.29  |
| ASBR Integration   | ❌       | ❌           | ✅            |
| A2A Protocol       | ❌       | ❌           | ✅            |
| Governance Layer   | ❌       | ❌           | ✅            |
| GitHub Models      | ❌       | ❌           | ✅            |
| MCP Marketplace    | ❌       | Partial      | ✅            |
| TDD from Start     | ❌       | ❌           | ✅            |
| SOLID Architecture | Partial  | Partial      | ✅            |

## Risk Mitigation

| Risk                     | Mitigation                                      |
| ------------------------ | ----------------------------------------------- |
| Rust learning curve      | Start with TypeScript bridge, gradual migration |
| Provider API changes     | Abstraction layer with versioned adapters       |
| TUI complexity           | Use Codex's proven Ratatui patterns             |
| Performance issues       | Benchmark from day 1, profile regularly         |
| Security vulnerabilities | Automated auditing, sandboxing, least privilege |

## Conclusion

This comprehensive plan combines:

- **Best of OpenCode**: Provider-agnostic, GitHub integration, client/server
- **Best of Codex**: Ratatui 0.29 TUI, MCP support, Rust performance
- **Cortex-OS Unique**: ASBR runtime, A2A protocol, governance layer
- **Engineering Excellence**: TDD from start, SOLID principles, 90% coverage

The phased approach ensures rapid delivery while maintaining quality through strict TDD and architectural principles.

## Next Steps

1. **Week 1**: Create `apps/cortex-tui/` with Cargo.toml and basic structure
2. **Week 1**: Write failing tests for config system and provider factory
3. **Week 1**: Implement config loading and provider abstraction
4. **Week 2**: Write TUI component tests and implement basic widgets
5. **Week 2**: Add GitHub Models provider with streaming support
6. **Week 3**: Implement GitHub Actions workflows and comment triggers
7. **Week 4**: Add MCP server management and agent memory
8. **Week 5**: Implement client/server architecture with REST API
9. **Week 6**: Performance optimization, security audit, and documentation

## Implementation Checklist

### Phase 1: Foundation

- [ ] Create Rust project structure in `apps/cortex-tui/`
- [ ] Add Ratatui 0.29.0 with exact Codex dependencies
- [ ] Write config system tests (RED)
- [ ] Implement TOML config loading (GREEN)
- [ ] Write provider factory tests (RED)
- [ ] Implement provider abstraction (GREEN)
- [ ] Write terminal initialization tests (RED)
- [ ] Implement basic TUI setup (GREEN)

### Phase 2: TUI Components

- [ ] Write ChatWidget tests with snapshots (RED)
- [ ] Implement ChatWidget with scrolling (GREEN)
- [ ] Write keyboard navigation tests (RED)
- [ ] Implement WCAG-compliant navigation (GREEN)
- [ ] Write DiffViewer tests (RED)
- [ ] Implement DiffViewer with syntax highlighting (GREEN)

### Phase 3: Provider Integration

- [ ] Write GitHub Models API tests with mocks (RED)
- [ ] Implement GitHub Models REST client (GREEN)
- [ ] Write streaming tests (RED)
- [ ] Implement streaming response handling (GREEN)
- [ ] Write provider fallback tests (RED)
- [ ] Implement fallback mechanism (GREEN)

### Phase 4: GitHub Integration

- [ ] Create cortex-agent.yml workflow
- [ ] Create cortex-review.yml workflow
- [ ] Write CI mode tests (RED)
- [ ] Implement `cortex run --ci` (GREEN)
- [ ] Write approval gate tests (RED)
- [ ] Implement approval via PR comments (GREEN)

### Phase 5: MCP & Memory

- [ ] Write MCP manager tests (RED)
- [ ] Implement MCP server management (GREEN)
- [ ] Write agent memory tests (RED)
- [ ] Implement AGENTS.md memory system (GREEN)
- [ ] Write audit trail tests (RED)
- [ ] Implement memory audit system (GREEN)

### Phase 6: Client/Server

- [ ] Write daemon service tests (RED)
- [ ] Implement REST API server (GREEN)
- [ ] Write WebSocket tests (RED)
- [ ] Implement WebSocket real-time updates (GREEN)
- [ ] Write client library tests (RED)
- [ ] Implement client SDK (GREEN)

Each checkbox represents a complete RED-GREEN-REFACTOR cycle following TDD principles.
