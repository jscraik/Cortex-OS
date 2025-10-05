# Task Runners - brAInwav Development Standards

This document explains the task runner ecosystem in Cortex-OS and when to use each tool.

## Overview

Cortex-OS uses a **hybrid task management approach** with multiple complementary tools:

- **Just** (`justfile`) - Developer-friendly task runner for common workflows
- **Make** (`Makefile`) - Production-grade MCP and TDD enforcement workflows  
- **pnpm scripts** (`package.json`) - Comprehensive build system integration
- **nx-smart** - Intelligent build orchestration and caching

## Quick Reference

### For New Developers (Recommended: Just)

```bash
just setup          # Set up development environment
just dev             # Quick development build
just test            # Run tests
just quality         # Run all quality checks
just dev-cycle       # Complete development workflow
```

### For Production/CI (Use Make)

```bash
make tdd-quality-gates    # Run comprehensive quality validation
make mcp-setup           # Set up MCP development environment
make tdd-enforce         # Enforce TDD practices with quality gates
```

### For Package-Specific Tasks (Use pnpm)

```bash
pnpm build:smart         # Smart build with affected project detection
pnpm test:smart          # Smart test execution
pnpm op:build           # Full operational build
```

## When to Use Each Tool

### Use Just When
- ✅ **Getting started** - Simple, readable syntax
- ✅ **Cross-platform development** - Works consistently on Windows/Mac/Linux
- ✅ **Quick development tasks** - Common workflows simplified
- ✅ **Task discovery** - `just --list` shows available commands
- ✅ **Developer onboarding** - Easier to understand than Make

### Use Make When
- ✅ **TDD enforcement** - Integrated with brAInwav quality standards
- ✅ **MCP development** - Specialized MCP workflow automation
- ✅ **Production processes** - Battle-tested for critical operations
- ✅ **CI/CD pipelines** - Reliable for automated environments
- ✅ **Company branding** - Built-in brAInwav messaging

### Use pnpm Scripts When
- ✅ **Package-specific builds** - Direct integration with package.json
- ✅ **Nx/Turbo integration** - Leverages monorepo build optimization
- ✅ **Advanced features** - Coverage, security scanning, etc.
- ✅ **IDE integration** - VS Code and other editors understand npm scripts

## Migration Strategy

**Phase 1: Coexistence (Current)**
- Just provides developer-friendly interface
- Make handles production workflows
- Both tools call the same underlying pnpm scripts

**Phase 2: Gradual Adoption (Optional)**
- Teams can migrate common workflows to Just
- Keep Make for critical production processes
- Maintain backward compatibility

**Phase 3: Optimization (Future)**
- Consider consolidating if team prefers Just
- Preserve brAInwav branding requirements
- Maintain CI/CD reliability

## Examples

### Developer Workflow with Just

```bash
# Start working on a feature
just setup

# Make changes, then test them
just quality
just test

# Complete development cycle
just dev-cycle
```

### Production Workflow with Make

```bash
# Enforce quality gates
make tdd-quality-gates

# Set up MCP environment
make mcp-setup

# Validate and deploy
make mcp-validate
make mcp-test
```

### Advanced Tasks with pnpm

```bash
# Smart builds (only affected packages)
pnpm build:smart

# Coverage with thresholds
pnpm test:coverage:threshold

# Security scanning
pnpm security:scan:all
```

## Task Mapping

| Task | Just | Make | pnpm |
|------|------|------|------|
| Setup | `just setup` | `make mcp-setup` | `pnpm install` |
| Build | `just dev` | - | `pnpm build:smart` |
| Test | `just test` | `make mcp-test` | `pnpm test:smart` |
| Quality | `just quality` | `make tdd-enforce` | `pnpm lint:smart` |
| Security | `just security` | - | `pnpm security:scan` |
| Clean | `just clean` | `make mcp-clean` | `pnpm nx reset` |

## Configuration

### Just Configuration

Edit `justfile` to:
- Add new recipes
- Modify brAInwav branding
- Update default parameters

### Make Configuration

Edit `Makefile` to:
- Update TDD enforcement rules
- Modify MCP workflows
- Change quality gate thresholds

### pnpm Configuration

Edit `package.json` scripts to:
- Add new build targets
- Configure test runners
- Update security policies

## Best Practices

1. **Start with Just** for new developers
2. **Use Make for production** workflows that require brAInwav branding
3. **Leverage pnpm scripts** for complex build orchestration
4. **Document team preferences** in project README
5. **Maintain consistency** with existing CI/CD pipelines

## Troubleshooting

### Just Issues
```bash
just --version          # Check installation
just --list             # Show available recipes
just --dry-run <recipe> # Preview commands without execution
```

### Make Issues
```bash
make --version          # Check installation (should be GNU Make)
make help              # Show Makefile help
make -n <target>       # Dry run mode
```

### Integration Issues
- Both Just and Make call the same underlying pnpm scripts
- If a pnpm script fails, both task runners will report the error
- Check `package.json` scripts if commands fail in both systems

Co-authored-by: brAInwav Development Team <dev@brainwav.dev>
