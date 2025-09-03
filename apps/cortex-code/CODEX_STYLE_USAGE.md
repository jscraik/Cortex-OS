# Codex-Style Interface for Cortex-Code

This guide shows how to use the new codex-style interface that recreates the codex experience within cortex-code.

## Building and Installation

1. **Build the codex-style binary:**

```bash
cargo build --release --bin cortex-codex
```

2. **Install or create symlink:**

```bash
# Option A: Copy to PATH
cp target/release/cortex-codex ~/.local/bin/cortex-codex

# Option B: Create symlink for development
ln -sf $(pwd)/target/release/cortex-codex ~/.local/bin/cortex-codex
```

## Basic Usage

### Default TUI Mode (Codex-like)

```bash
# Start TUI interface (default behavior)
cortex-codex

# Start with an initial prompt
cortex-codex "Help me refactor this function"

# Include images
cortex-codex -i screenshot.png "Explain this UI mockup"
```

### Model Selection

```bash
# Specify a model
cortex-codex -m gpt-4o "Write a Python script"

# Use local OSS models (requires Ollama)
cortex-codex --oss "Review my code"
```

### Configuration Profiles

```bash
# Use a specific profile
cortex-codex -p work "Analyze this codebase"

# Profile with model override
cortex-codex -p personal -m claude-3-5-sonnet "Write documentation"
```

### Configuration Overrides (Key Feature)

```bash
# Override specific config values
cortex-codex -c model_provider=openai -c model=gpt-4o

# Multiple overrides
cortex-codex -c providers.default=anthropic -c security.sandbox_mode=strict

# Complex JSON values
cortex-codex -c 'providers.config.openai.temperature=0.7'
```

### Approval and Sandbox Modes

```bash
# Full automatic mode (safe sandboxing)
cortex-codex --full-auto "Fix all linting errors"

# Always ask for approval
cortex-codex -a always "Make changes to the database"

# Dangerous bypass mode (use with caution!)
cortex-codex --yolo "Quick prototype"
```

### Working Directory

```bash
# Change to specific directory
cortex-codex -C /path/to/project "Analyze this codebase"

# Work on different project
cortex-codex --cd ~/other-project
```

### Non-Interactive Mode

```bash
# CI/automation mode
cortex-codex --non-interactive "Generate unit tests"

# With specific working directory
cortex-codex -C /project --non-interactive "Run code analysis"
```

## Configuration Profiles

### Creating Profiles

1. **Create profile directory:**

```bash
mkdir -p ~/.cortex/profiles
```

2. **Create a profile file (e.g., `work.json`):**

```json
{
  "providers": {
    "default": "openai",
    "config": {
      "openai": {
        "model": "gpt-4o",
        "temperature": 0.3
      }
    }
  },
  "security": {
    "sandbox_mode": "workspace-write",
    "approval_policy": "on-failure"
  },
  "features": {
    "web_search": true,
    "github_integration": true
  }
}
```

3. **Create profiles for different scenarios:**

**Personal Development (`personal.json`):**

```json
{
  "providers": {
    "default": "anthropic",
    "config": {
      "anthropic": {
        "model": "claude-3-5-sonnet"
      }
    }
  },
  "security": {
    "approval_policy": "always"
  }
}
```

**OSS/Local Development (`oss.json`):**

```json
{
  "providers": {
    "default": "oss",
    "config": {
      "oss": {
        "base_url": "http://localhost:11434",
        "model": "codellama:7b"
      }
    }
  }
}
```

## Advanced Configuration Overrides

### Available Override Keys

| Key | Description | Example |
|-----|-------------|---------|
| `providers.default` | Default provider | `openai`, `anthropic`, `oss` |
| `providers.config.<provider>.model` | Model for provider | `gpt-4o`, `claude-3-5-sonnet` |
| `providers.config.<provider>.temperature` | Model temperature | `0.7` |
| `security.sandbox_mode` | Sandbox policy | `workspace-write`, `danger-full-access` |
| `security.approval_policy` | When to ask approval | `always`, `on-failure`, `never` |
| `features.web_search` | Enable web search | `true`, `false` |
| `features.github_integration` | Enable GitHub tools | `true`, `false` |

### Complex Override Examples

```bash
# Set multiple provider configs
cortex-codex \
  -c providers.default=openai \
  -c providers.config.openai.model=gpt-4o \
  -c providers.config.openai.temperature=0.3 \
  -c security.sandbox_mode=workspace-write

# JSON-style nested overrides
cortex-codex -c 'features={"web_search":true,"github_integration":false}'

# Environment-style overrides
cortex-codex -c model_provider=anthropic -c model=claude-3-5-sonnet
```

## Comparison with Original Codex

### Command Equivalents

| Codex Command | Cortex-Codex Equivalent |
|---------------|-------------------------|
| `codex` | `cortex-codex` |
| `codex --model gpt-4` | `cortex-codex -m gpt-4o` |
| `codex --oss` | `cortex-codex --oss` |
| `codex -c key=value` | `cortex-codex -c key=value` |
| `codex --full-auto` | `cortex-codex --full-auto` |
| `codex --profile work` | `cortex-codex -p work` |
| `codex -C /project` | `cortex-codex -C /project` |

### Key Differences

1. **Binary name:** `cortex-codex` instead of `codex`
2. **Model names:** Use cortex-code model identifiers
3. **Configuration:** Uses cortex-code config structure
4. **Features:** Inherits all cortex-code capabilities

## Tips and Best Practices

### 1. Create Workflow-Specific Profiles

```bash
# Different profiles for different tasks
cortex-codex -p review "Review this pull request"
cortex-codex -p debug "Help debug this issue"
cortex-codex -p docs "Generate documentation"
```

### 2. Use Configuration Overrides for Quick Adjustments

```bash
# Temporarily use different model
cortex-codex -c model=claude-3-5-sonnet "Complex reasoning task"

# Adjust creativity for different tasks
cortex-codex -c temperature=0.1 "Generate precise code"
cortex-codex -c temperature=0.9 "Brainstorm creative solutions"
```

### 3. Combine with Directory Navigation

```bash
# Quick project switching
alias codex-frontend="cortex-codex -C ~/projects/frontend -p frontend"
alias codex-backend="cortex-codex -C ~/projects/backend -p backend"
```

### 4. Repository-Specific Configuration

```bash
# Create .cortex-codex in project root
echo '{"profile": "work", "overrides": {"model": "gpt-4o"}}' > .cortex-codex
```

## Troubleshooting

### Common Issues

1. **Profile not found:**
   - Ensure profile exists in `~/.cortex/profiles/`
   - Check JSON syntax

2. **Configuration override errors:**
   - Use quotes for complex values
   - Check key path syntax

3. **Model not available:**
   - Verify provider configuration
   - Check API keys and credentials

### Debug Mode

```bash
# Enable debug logging
cortex-codex --debug "Debug this issue"
```

This codex-style interface provides the same user experience as the original codex while leveraging all the powerful features of cortex-code!
