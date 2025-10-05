# Just Installation and Setup Guide - brAInwav

## Overview

Just is a modern, cross-platform task runner that provides a simpler alternative to Make. This guide shows how to install and configure Just for Cortex-OS development.

## Installation

### macOS (Homebrew)
```bash
brew install just
```

### Windows (Chocolatey)
```powershell
choco install just
```

### Windows (Scoop)
```powershell
scoop install just
```

### Linux (Ubuntu/Debian)
```bash
sudo apt install just
```

### Using Cargo (All Platforms)
```bash
cargo install just
```

### Using Pre-compiled Binaries
Download from: https://github.com/casey/just/releases

## Verification

After installation, verify Just is working:

```bash
just --version
# Should output: just 1.x.x (or similar)
```

## Cortex-OS Setup

Once Just is installed, you can use it immediately in the Cortex-OS project:

```bash
# Show all available recipes
just --list

# Get system information
just info

# Run a quick setup
just setup
```

## Quick Start Commands

### For New Developers
```bash
just setup          # Set up development environment
just dev             # Quick development build
just test            # Run comprehensive tests  
just quality         # Run all quality checks
just dev-cycle       # Complete development workflow
```

### Common Tasks
```bash
just clean           # Clean build artifacts
just format          # Format code
just lint            # Run linter
just security        # Run security scans
just docs-build      # Build documentation
```

### MCP Development
```bash
just mcp-setup       # Set up MCP environment
just mcp-test        # Run MCP tests
just mcp-validate    # Validate MCP implementations
```

### Production Tasks
```bash
just op-build        # Full operational build
just ci-check        # Simulate CI checks
just deploy-mcp      # Deploy MCP package
```

## Configuration

### Custom Recipes

To add custom recipes, edit the `justfile` in the project root:

```just
# Example custom recipe
my-task:
    @echo "[brAInwav] Running my custom task..."
    # Your commands here
```

### Environment Variables

Just supports environment variables and can be configured via:

```bash
# Run with specific environment
ENVIRONMENT=production just build-for-deployment

# Set focus for builds
CORTEX_SMART_FOCUS=@cortex-os/security just dev
```

## IDE Integration

### VS Code

Install the "Just" extension for syntax highlighting and command palette integration:

1. Open VS Code
2. Go to Extensions (Ctrl/Cmd + Shift + X)
3. Search for "Just"
4. Install the extension by "skellock"

### Other Editors

- **Vim/Neovim**: Available syntax highlighting plugins
- **Emacs**: just-mode available
- **Sublime Text**: Just syntax package available

## Comparison with Make

| Feature | Just | Make |
|---------|------|------|
| Syntax | Simple, readable | Complex, tab-sensitive |
| Cross-platform | ✅ Excellent | ⚠️ Limited on Windows |
| Task discovery | `just --list` | Need to read Makefile |
| Documentation | Built-in comments | Manual documentation |
| Dependencies | Simple syntax | Complex dependency graph |

## Troubleshooting

### Just Not Found
```bash
# Check if just is in PATH
which just

# If not found, ensure installation directory is in PATH
echo $PATH
```

### Permission Issues (Linux/macOS)
```bash
chmod +x $(which just)
```

### Recipe Not Found
```bash
# Make sure you're in the project root directory
pwd
# Should show: /path/to/Cortex-OS

# Check if justfile exists
ls -la justfile
```

### Windows Path Issues
Make sure the installation directory is in your system PATH:
1. Open System Properties
2. Click "Environment Variables"
3. Add Just installation path to PATH variable

## Advanced Usage

### Parameterized Recipes
```bash
# Pass parameters to recipes
just tdd-validate FILES="src/test.ts"
just codemap SCOPE="package:security"
```

### Dry Run Mode
```bash
# Preview commands without execution (if supported by underlying scripts)
pnpm build:smart --dry-run  # Use the underlying pnpm script for dry-run
```

### Shell Completion

Enable shell completion for better experience:

```bash
# Bash
echo 'source <(just --completions bash)' >> ~/.bashrc

# Zsh  
echo 'source <(just --completions zsh)' >> ~/.zshrc

# Fish
just --completions fish > ~/.config/fish/completions/just.fish
```

## Benefits for Cortex-OS Development

1. **Simplified Onboarding** - New developers can start with `just setup`
2. **Cross-platform Consistency** - Same commands work on all platforms
3. **Task Discovery** - `just --list` shows all available tasks
4. **Readable Syntax** - Easy to understand and modify
5. **brAInwav Branding** - All outputs include brAInwav messaging
6. **Existing Integration** - Works with current pnpm scripts and Make workflows

## Next Steps

After installation:

1. Run `just info` to verify system compatibility
2. Try `just setup` to initialize your development environment
3. Use `just dev-cycle` for your first complete workflow
4. Read [docs/task-runners.md](../task-runners.md) for the complete guide

Co-authored-by: brAInwav Development Team <dev@brainwav.dev>
