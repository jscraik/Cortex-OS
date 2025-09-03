# codex-core

This crate implements the business logic for Codex. It is designed to be used by the various Codex UIs written in Rust.

## Configuration System

The Codex Core includes a robust, TDD-driven configuration management solution with support for profiles, overrides, environment variables, and comprehensive validation.

### Features

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

The configuration system is built using Test-Driven Development (TDD) with 11/11 tests passing:

```bash
cargo test --package codex-core --test config_tests
```

## Dependencies

Note that `codex-core` makes some assumptions about certain helper utilities being available in the environment. Currently, this

### macOS

Expects `/usr/bin/sandbox-exec` to be present.

### Linux

Expects the binary containing `codex-core` to run the equivalent of `codex debug landlock` when `arg0` is `codex-linux-sandbox`. See the `codex-arg0` crate for details.

### All Platforms

Expects the binary containing `codex-core` to simulate the virtual `apply_patch` CLI when `arg1` is `--codex-run-as-apply-patch`. See the `codex-arg0` crate for details.
