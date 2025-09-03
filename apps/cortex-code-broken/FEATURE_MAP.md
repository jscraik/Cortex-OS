# Cortex Code Feature Map: OpenAI Codex CLI Integration Status

This document tracks the integration status of OpenAI Codex CLI features in Cortex Code, showing which features are already implemented and which need to be added.

## Feature Comparison Matrix

| Feature                       | OpenAI Codex CLI                                       | Cortex Code Status           | Notes                                                  |
| ----------------------------- | ------------------------------------------------------ | ---------------------------- | ------------------------------------------------------ |
| **Installation & Invocation** | `npm install -g @openai/codex` or `brew install codex` | ⚠️ **PARTIALLY IMPLEMENTED** | Uses `cargo install` instead, needs npm/brew packaging |
| **Interactive Run Mode**      | `codex` opens interactive TUI                          | ✅ **IMPLEMENTED**           | Cortex Code TUI provides similar functionality         |
| **Approval Modes**            | `--approval-mode suggest/auto-edit/full-auto`          | ✅ **IMPLEMENTED**           | Added Plan mode as well                                |
| **Model & Provider Flags**    | `--model gpt-4.1`, `--provider groq`                   | ✅ **IMPLEMENTED**           | Supports multiple providers via config                 |
| **Multimodal Input**          | `--image "/path/to/image.png"`                         | ❌ **NOT IMPLEMENTED**       | No image support yet                                   |
| **Quiet Execution**           | `codex exec "prompt" --quiet`                          | ✅ **PARTIALLY IMPLEMENTED** | Has `--ci` flag for non-interactive mode               |
| **Context Configuration**     | `~/.codex/config.toml`, `codex.md`                     | ✅ **IMPLEMENTED**           | Uses TOML config files and project context             |

## Detailed Feature Status

### 1. Installation & Invocation

**Status**: ⚠️ PARTIALLY IMPLEMENTED

- Cortex Code uses Rust/Cargo instead of npm/brew
- Installation via `cargo install --path .` in the repository
- Invocation via `cortex-code` command
- **TODO**: Add npm and Homebrew packaging support for wider distribution

### 2. Interactive Run Mode

**Status**: ✅ IMPLEMENTED

- TUI mode provides interactive coding session
- Real-time AI responses with streaming
- Multi-view interface (Chat, GitHub, A2A Stream)

### 3. Approval Modes

**Status**: ✅ IMPLEMENTED

- Added `--approval-mode` CLI argument with suggest/auto-edit/full-auto/plan options
- Implementation of mode checking in command execution paths
- Configuration support for default approval mode
- **Modes**:
  - `suggest`: Suggest edits, await user approval (default)
  - `auto-edit`: Apply edits automatically, require approval for shell commands
  - `full-auto`: Completely autonomous (sandboxed, network-disabled)
  - `plan`: Generate a plan but don't execute

### 4. Model & Provider Flags

**Status**: ✅ IMPLEMENTED

- Configuration supports multiple providers (GitHub, OpenAI, Anthropic, MLX)
- Provider switching capability
- Model selection per provider

### 5. Multimodal Input (Image)

**Status**: ❌ NOT IMPLEMENTED

- No support for image input to guide code generation
- **Action Required**: Add image processing capabilities

### 6. Quiet Execution

**Status**: ✅ PARTIALLY IMPLEMENTED

- Has `--ci` flag for non-interactive mode
- JSON/text output formats supported
- Could be enhanced with `exec` subcommand

### 7. Context Configuration

**Status**: ✅ IMPLEMENTED

- TOML-based configuration system
- Project-specific context files
- Environment-specific overrides

## Implementation Priority

### High Priority

1. Multimodal Input - Differentiates the product with advanced capabilities
2. npm/Homebrew packaging - Improves accessibility and adoption

### Medium Priority

1. Enhanced CLI structure with `exec` subcommand
2. Additional provider/model flexibility

### Low Priority

1. Brew/npm-style installation (already has Cargo installation)

## Roadmap for Missing Features

### npm/Homebrew Packaging Implementation

**Files to create**:

- `package.json` - npm package configuration
- `install.js` - Platform-specific binary downloader
- `index.js` - Node.js module entry point
- Homebrew formula - For macOS users

**Approach**:

1. Create npm package structure with postinstall script
2. Implement platform detection and binary download
3. Create Homebrew formula for macOS users
4. Publish to npm registry and submit to homebrew-core

### Multimodal Input Implementation

**Files to modify**:

- `src/main.rs` - Add `--image` CLI argument
- `src/app.rs` - Add image processing capabilities
- `src/providers/` - Update provider interfaces to handle image input

**Approach**:

1. Add image input CLI flag
2. Implement image processing and encoding
3. Update provider interfaces to accept multimodal input
4. Add image support to configuration
