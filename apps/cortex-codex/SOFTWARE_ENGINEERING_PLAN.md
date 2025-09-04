# Cortex CLI Software Engineering Plan

[![Phase 1](https://img.shields.io/badge/Phase%201-Foundation%20Complete%20✅-brightgreen.svg)](https://github.com/jamiescottcraik/Cortex-OS)
[![Task 1.1](https://img.shields.io/badge/Task%201.1-Project%20Setup%20✅-brightgreen.svg)](https://github.com/jamiescottcraik/Cortex-OS)
[![Task 1.2](https://img.shields.io/badge/Task%201.2-Configuration%20System%20✅-brightgreen.svg)](https://github.com/jamiescottcraik/Cortex-OS)
[![Task 1.3](https://img.shields.io/badge/Task%201.3-Error%20Handling%20✅-brightgreen.svg)](https://github.com/jamiescottcraik/Cortex-OS)
[![Task 2.1](https://img.shields.io/badge/Task%202.1-Chat%20CLI%20✅-brightgreen.svg)](https://github.com/jamiescottcraik/Cortex-OS)
[![Next](https://img.shields.io/badge/Next-Task%202.2%20Provider%20Abstraction-yellow.svg)](https://github.com/jamiescottcraik/Cortex-OS)
[![TDD](https://img.shields.io-badge/TDD-15%2F15%20tests%20passing-brightgreen.svg)](https://github.com/jamiescottcraik/Cortex-OS)

## TDD-Driven Development Strategy

### Core Software Engineering Principles

#### 1. **Red-Green-Refactor Cycle**

- Write failing tests first (RED)
- Write minimal code to pass tests (GREEN)
- Improve code quality while keeping tests green (REFACTOR)

#### 2. **Single Responsibility Principle**

- Each module/function has one clear purpose
- Easy to test, understand, and modify

#### 3. **Dependency Inversion**

- Depend on abstractions, not concretions
- Enables easy mocking and testing

#### 4. **Fail Fast Philosophy**

- Catch errors early in development
- Comprehensive error handling and validation

#### 5. **Incremental Integration**

- Small, atomic commits that can be easily rolled back
- Feature flags for progressive enhancement

---

## Development Phases

### Phase 1: Foundation & Core Infrastructure (TDD)

**Goal**: Establish stable, testable foundation with cortex-code features integrated into codex-rs base

#### Task 1.1: Project Setup & Build System

- [x] **Test**: Create integration test that verifies project builds
- [x] **Implementation**: Fix Rust edition compatibility issues
- [x] **Verification**: Ensure all workspace members compile
- [x] **Rollback Point**: Git tag `v0.1.0-foundation`

**Files Modified**: `Cargo.toml`, `rust-toolchain.toml`, individual package `Cargo.toml`

```bash
# Test Command
cargo test --workspace --all-features
# Rollback Command  
git reset --hard v0.1.0-foundation
```

#### Task 1.2: Configuration System Integration (TDD) ✅ COMPLETED

- [x] **Test**: Write tests for profile-based configuration loading
- [x] **Test**: Write tests for configuration override parsing
- [x] **Implementation**: Port cortex-code config system to codex core
- [x] **Implementation**: Add dot-notation override support
- [x] **Verification**: All config tests pass (11/11 tests passing)
- [x] **Rollback Point**: Git tag `v0.1.1-config`

**Files Created/Modified**:

- `core/src/config/mod.rs`
- `core/src/config/profiles.rs`
- `core/src/config/overrides.rs`
- `core/tests/config_tests.rs`

```rust
// Test Example
#[test]
fn test_config_profile_loading() {
    let config = Config::load_with_profile("development").unwrap();
    assert_eq!(config.model_provider, "local");
}

#[test] 
fn test_config_override_parsing() {
    let overrides = vec!["model.provider=openai", "api.timeout=30"];
    let config = Config::with_overrides(overrides).unwrap();
    assert_eq!(config.model.provider, "openai");
}
```

#### Task 1.3: Error Handling & Logging (TDD)

- [x] **Test**: Write tests for error propagation and formatting
- [x] **Test**: Write tests for structured logging output
- [x] **Implementation**: Implement comprehensive error types
- [x] **Implementation**: Add structured logging with tracing
- [x] **Verification**: Error handling and logging tests pass
- [x] **Rollback Point**: Git tag `v0.1.2-errors`

**Files Created/Modified**:

- `core/src/error/mod.rs`
- `core/src/error/types.rs`
- `core/src/logging.rs`
- `core/tests/error_tests.rs`

---

### Phase 2: Model Provider Integration (TDD)

**Goal**: Integrate cortex-code's multi-provider system into codex base

#### Task 2.1: Chat CLI, Sessions, REPL (TDD) ✅ COMPLETED

- [x] Tests for one-off chat streaming (mock SSE)
- [x] Tests for session JSONL creation and resume
- [x] REPL mode with `:q` and stdin via `-`
- [x] README updated with examples; JSONL note
- [x] Lints clean; core/cli tests pass

Verification: `cargo +nightly test -p codex-core --test all` and `-p codex-cli` both pass.

Rollback Point: tag `v0.1.2-chat`.

#### Task 2.2: Provider Abstraction Layer (TDD)

- [ ] **Test**: Write tests for provider trait implementation
- [ ] **Test**: Write tests for provider discovery and registration
- [ ] **Implementation**: Create provider trait and registry
- [ ] **Implementation**: Add provider lifecycle management
- [ ] **Verification**: Provider abstraction tests pass
- [ ] **Rollback Point**: Git tag `v0.2.0-provider-base`

**Files Created/Modified**:

- `core/src/providers/mod.rs`
- `core/src/providers/traits.rs`
- `core/src/providers/registry.rs`
- `core/tests/provider_tests.rs`

```rust
// Test Example
#[async_trait]
trait ModelProvider {
    async fn complete(&self, messages: &[Message]) -> Result<String>;
    fn name(&self) -> &str;
    fn supports_streaming(&self) -> bool;
}

#[tokio::test]
async fn test_provider_registration() {
    let mut registry = ProviderRegistry::new();
    let openai_provider = OpenAIProvider::new("test-key");
    registry.register("openai", Box::new(openai_provider));
    
    let provider = registry.get("openai").unwrap();
    assert_eq!(provider.name(), "openai");
}
```

#### Task 2.2: OpenAI Provider Implementation (TDD) keep the chatgpt subscription method currently included; add the OpenAI API implementation as a separate method

- [ ] **Test**: Write tests for OpenAI API integration
- [ ] **Test**: Write tests for streaming responses
- [ ] **Implementation**: Port OpenAI provider from cortex-code
- [ ] **Implementation**: Add retry logic and rate limiting
- [ ] **Verification**: OpenAI provider tests pass (with mocks)
- [ ] **Rollback Point**: Git tag `v0.2.1-openai`

#### Task 2.3: Anthropic Provider Implementation (TDD)  and Anthropic Compatible Provider [`Z.ai API`](https://docs.z.ai/scenario-example/develop-tools/claude)

- [ ] **Test**: Write tests for Anthropic API integration
- [ ] **Implementation**: Port Anthropic provider from cortex-code
- [ ] **Verification**: Anthropic provider tests pass (with mocks)
- [ ] **Rollback Point**: Git tag `v0.2.2-anthropic`

- [ ] **Test**: Write tests for Z.ai API integration
- [ ] **Implementation**: Create Z.ai provider
- [ ] **Verification**: Z.ai provider tests pass (with mocks)
- [ ] **Rollback Point**: Git tag `v0.2.2-zai`

#### Task 2.4: Local/OSS Provider Implementation (TDD)

- [ ] **Test**: Write tests for local model integration (Ollama/MLX)
- [ ] **Implementation**: Port local providers from cortex-code
- [ ] **Verification**: Local provider tests pass
- [ ] **Rollback Point**: Git tag `v0.2.3-local`

---

### Phase 3: MCP Integration (TDD)

**Goal**: Integrate Model Context Protocol support from cortex-code

#### Task 3.1: MCP Client Foundation (TDD)

- [ ] **Test**: Write tests for MCP protocol handling
- [ ] **Test**: Write tests for server discovery and connection
- [ ] **Implementation**: Port MCP client from cortex-code
- [ ] **Implementation**: Add connection pooling and lifecycle management
- [ ] **Verification**: MCP client tests pass
- [ ] **Rollback Point**: Git tag `v0.3.0-mcp-client`

#### Task 3.2: MCP Server Registry (TDD)

- [ ] **Test**: Write tests for server registration and management
- [ ] **Implementation**: Create MCP server registry system
- [ ] **Verification**: MCP registry tests pass
- [ ] **Rollback Point**: Git tag `v0.3.1-mcp-registry`

#### Task 3.3: Tool Integration (TDD)

- [ ] **Test**: Write tests for tool discovery and execution
- [ ] **Implementation**: Integrate MCP tools with codex workflow
- [ ] **Verification**: Tool integration tests pass
- [ ] **Rollback Point**: Git tag `v0.3.2-mcp-tools`

---

---

## Notes on GitHub Integration

**GitHub integration will be handled via GitHub MCP (Model Context Protocol) integration.**

- The existing `mcp-client` and `mcp-server` packages in codex-rs provide the foundation
- GitHub functionality will be accessed through MCP tools rather than direct API integration
- This approach provides better modularity and follows the MCP standard
- MCP GitHub tools will handle: repository management, pull requests, issues, code reviews

---

## Testing Strategy

### Unit Testing

```rust
// Each module has comprehensive unit tests
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_function_name() {
        // Arrange
        let input = create_test_input();
        
        // Act  
        let result = function_under_test(input);
        
        // Assert
        assert_eq!(result.expected_field, expected_value);
    }
}
```

### Integration Testing

```rust
// Integration tests for complete workflows
#[tokio::test]
async fn test_complete_chat_workflow() {
    let app = TestApp::new().await;
    let response = app.send_message("Hello").await;
    assert!(response.is_ok());
}
```

### TDD Cycle

1. **Red**: Write a failing test that describes the desired behavior
2. **Green**: Write the minimum code to make the test pass
3. **Refactor**: Improve the code while keeping tests passing
4. **Commit**: Create a git commit for each complete cycle

### Test Categories

- **Unit Tests**: Individual function/method testing
- **Integration Tests**: Component interaction testing  
- **E2E Tests**: Complete user workflow testing
- **Property Tests**: Random input validation using quickcheck
- **Performance Tests**: Latency and throughput validation

---

## Quality Gates

### Before Each Commit

- [ ] All tests pass locally
- [ ] Code coverage >= 95%
- [ ] Linting passes (clippy)
- [ ] Formatting is correct (rustfmt)
- [ ] Documentation is updated

### Before Each Merge

- [ ] All CI checks pass
- [ ] Code review approved
- [ ] Integration tests pass
- [ ] Performance regression check
- [ ] Security scan passes

### Before Each Release

- [ ] Full test suite passes
- [ ] Performance benchmarks meet targets
- [ ] Security audit complete
- [ ] Documentation is up to date
- [ ] Release notes prepared

---

## Risk Management

### Technical Risks

1. **Complexity**: Keep phases small and independent
2. **Performance**: Regular benchmarking and profiling
3. **Security**: Security review at each phase
4. **Dependencies**: Minimize external dependencies

### Mitigation Strategies

- Comprehensive testing at each step
- Regular code reviews
- Clear rollback points with git tags
- Documentation of architectural decisions
- Monitoring and observability

---

## Tools and Automation

### Development Tools

- **IDE**: VS Code with Rust analyzer
- **Testing**: cargo test, cargo-nextest
- **Linting**: clippy with strict settings
- **Formatting**: rustfmt
- **Coverage**: cargo-llvm-cov

### CI/CD Pipeline

- **Pre-commit**: Format, lint, basic tests
- **PR Checks**: Full test suite, coverage, security scan
- **Release**: Automated versioning and deployment

### Monitoring

- **Performance**: Regular benchmarking
- **Quality**: Code coverage tracking
- **Security**: Dependency vulnerability scanning

---

## Success Metrics

### Phase 1: Foundation

- [ ] All tests pass
- [ ] Build time < 30 seconds
- [ ] Binary size < 50MB

### Phase 2: Core Features  

- [ ] Response time < 2 seconds for simple queries
- [ ] Memory usage < 100MB baseline
- [ ] Configuration loading < 100ms

### Phase 3: Provider Integration

- [ ] Provider switching < 500ms
- [ ] Stream latency < 100ms first token
- [ ] Error recovery rate > 95%

### Overall Success

- [ ] Code coverage >= 95%
- [ ] Performance regression < 10%
- [ ] Security vulnerabilities = 0
- [ ] User experience matches original codex simplicity
