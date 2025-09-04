# codex-core

This crate implements the business logic for Codex. It is designed to be used by the various Codex UIs written in Rust.

## Provider Abstraction System

The Codex Core includes a comprehensive provider abstraction layer that enables seamless integration with multiple AI model providers through a unified interface.

### Provider Features

- 🔌 **Unified Provider Interface**: Single trait for all AI model providers
- 🔄 **Dynamic Provider Registry**: Runtime provider registration and discovery
- 📡 **Streaming Support**: Infrastructure for streaming responses with futures
- 🧪 **Mock Providers**: Comprehensive mock implementations for testing
- ⚙️ **Configuration Integration**: Provider-specific configuration and validation
- 🔒 **Error Handling**: Structured error handling for provider operations

### Provider Usage

```rust
use codex_core::providers::{ModelProvider, ProviderRegistry, Message};

// Create and register providers
let mut registry = ProviderRegistry::new();
registry.register("openai".to_string(), Box::new(openai_provider));
registry.register("anthropic".to_string(), Box::new(anthropic_provider));

// Use provider through unified interface
let provider = registry.get("openai").unwrap();
let messages = vec![Message {
    role: "user".to_string(),
    content: "Hello, world!".to_string(),
}];

let response = provider.complete(&messages, "gpt-4", Some(0.7)).await?;
```

## Configuration System

The Codex Core includes a robust, TDD-driven configuration management solution with support for profiles, overrides, environment variables, and comprehensive validation.

### Configuration Features

- 📋 **TOML-based Configuration**: Human-readable configuration files
- 🔄 **Profile Support**: Development, production, and custom profiles
- ⚙️ **Override System**: Dot-notation configuration overrides (e.g., `model.provider=openai`)
- 🌍 **Environment Variables**: Runtime configuration via `CODEX_MODEL_PROVIDER`, `CODEX_API_TIMEOUT_SECONDS`
- ✅ **Validation**: Comprehensive configuration validation
- 🔄 **Serialization**: Bidirectional TOML serialization

### Configuration Usage

```rust
use codex_core::SimpleConfig;

// Load default configuration
let config = SimpleConfig::default();

// Load from file (returns default if file doesn't exist)
let config = SimpleConfig::load_from_file("config.toml")?;

// Load specific profile
let config = SimpleConfig::load_with_profile("config.toml", "development")?;

// Apply overrides
let config = SimpleConfig::with_overrides(vec![
    "model.provider=openai".to_string(),
    "model.temperature=0.3".to_string(),
])?;
```

### Testing

The core system is built using Test-Driven Development (TDD) with 29/29 tests passing:

- **Configuration Tests**: 11 tests covering all configuration scenarios
- **Provider Abstraction Tests**: 10 tests covering provider interface and registry
- **Error Handling Tests**: 4 tests for comprehensive error scenarios  
- **Logging Tests**: 4 tests for logging infrastructure

```bash
cargo +nightly test --package codex-core
```

All tests use realistic scenarios and mock implementations to ensure robust, maintainable code.

## Dependencies

Note that `codex-core` makes some assumptions about certain helper utilities being available in the environment.

### macOS

Expects `/usr/bin/sandbox-exec` to be present.

### Linux

Expects the binary containing `codex-core` to run the equivalent of `codex debug landlock` when `arg0` is `codex-linux-sandbox`. See the `codex-arg0` crate for details.

### All Platforms

Expects the binary containing `codex-core` to simulate the virtual `apply_patch` CLI when `arg1` is `--codex-run-as-apply-patch`. See the `codex-arg0` crate for details.
