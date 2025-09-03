# Cortex Code Enhancement Plan: Features to Transfer

## 🔍 Analysis Summary

After comparing the legacy backup (now removed) with the new `~/.Cortex-OS/apps/cortex-code`, I've identified significant missing functionality that should be transferred to enhance the new implementation.

> Note: The cortex-code-backup directory has been removed as obsolete. This plan remains for historical context.

## 📊 Capability Comparison

| Feature Category | Backup Implementation | New Implementation | Status |
|------------------|----------------------|-------------------|---------|
| CLI Interface | Rich subcommands (tui, run, exec, daemon) | Basic multitool structure | ⚠️ NEEDS ENHANCEMENT |
| Approval Modes | 4 modes: auto-edit, suggest, full-auto, plan | None implemented | ❌ MISSING |
| Provider Support | OpenAI, Anthropic, GitHub, Local MLX, Ollama, Google Gemini, Cohere, Mistral | Basic protocol only | ❌ MISSING |
| Feature Toggles | Complete feature flag system | None | ❌ MISSING |
| Memory System | Advanced memory storage & context | None | ❌ MISSING |
| RAG Integration | None | Cortex-OS RAG pipeline available | 🔄 NEEDS INTEGRATION |
| A2A Integration | None | Cortex-OS A2A pipeline available | 🔄 NEEDS INTEGRATION |
| AST Code Analysis | None | None | 🔄 NEEDS INTEGRATION (ast-grep) |
| Config System | Hierarchical TOML config | Basic | ⚠️ NEEDS ENHANCEMENT |
| Image Support | Multimodal input via --image flag | None | ❌ MISSING |
| MCP Integration | Full MCP service integration | Protocol placeholders only | ❌ MISSING |

## 🎯 High-Priority Features to Transfer

### 1. Enhanced CLI with Approval Modes ⭐⭐⭐

Impact: Critical for production use

```rust
// From backup: src/app.rs
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, clap::ValueEnum)]
pub enum ApprovalMode {
    AutoEdit,
    Suggest,
    FullAuto,
    Plan,
}
```

Transfer to: `cortex-cli/src/main.rs`

### 2. Multiple Model Providers ⭐⭐⭐

Impact: Essential for flexibility and choice

Frontier Model Providers to Implement:

- `src/providers/openai.rs` - OpenAI GPT models
- `src/providers/anthropic.rs` - Anthropic Claude models  
- `src/providers/github.rs` - GitHub Models
- `src/providers/google.rs` - Google Gemini models
- `src/providers/cohere.rs` - Cohere Command models
- `src/providers/mistral.rs` - Mistral models
- `src/providers/ollama.rs` - Local Ollama models
- `src/providers/local.rs` - Local MLX support (Apple Silicon)

Transfer to: New `cortex-core/src/providers/` module

### 3. Rich TUI Components ⭐⭐

Impact: Better user experience

Components to transfer:

- `src/view/chat.rs` - Advanced chat interface
- `src/view/github_dashboard.rs` - GitHub integration view
- `src/view/a2a_stream.rs` - Agent-to-Agent event stream
- `src/view/cortex_command_palette.rs` - Command palette
- `src/view/mcp_manager.rs` - MCP management interface

Transfer to: Enhance existing `cortex-tui/src/` components

### 4. Feature Toggle System ⭐⭐

Impact: Production-ready configuration management

```rust
// From backup: src/features.rs
pub struct FeatureManager {
    config: Arc<RwLock<FeatureConfig>>,
}
```

Transfer to: New `cortex-core/src/features/`
