# Cortex-OS Task Runner (brAInwav Development)
# Simplified task orchestration using Just
# Co-authored-by: brAInwav Development Team <dev@brainwav.dev>

# Show available recipes
default:
    @just --list

# Development setup
setup:
    @echo "[brAInwav] Setting up development environment..."
    pnpm install
    @echo "[brAInwav] Installing efficiency tools..."
    bash scripts/ensure-efficiency-tools.sh
    @echo "[brAInwav] Development setup complete"

# Quick development build
dev:
    @echo "[brAInwav] Starting development build..."
    pnpm build:smart

# Run comprehensive tests
test:
    @echo "[brAInwav] Running comprehensive test suite..."
    pnpm test:smart

# Quality checks (lint + typecheck + security)
quality:
    @echo "[brAInwav] Running quality checks..."
    pnpm lint:smart
    pnpm typecheck:smart
    pnpm security:scan

# Full operational build (production-ready)
op-build:
    @echo "[brAInwav] Running operational build with all quality gates..."
    pnpm op:build

# MCP development workflow
mcp-setup:
    @echo "[brAInwav] Setting up MCP development environment..."
    make mcp-setup

mcp-test:
    @echo "[brAInwav] Running MCP test suite..."
    make mcp-test

mcp-validate:
    @echo "[brAInwav] Validating MCP implementations..."
    make mcp-validate

# TDD enforcement
tdd-enforce:
    @echo "[brAInwav] Enforcing TDD practices with quality gates..."
    make tdd-enforce

tdd-validate FILES="":
    @echo "[brAInwav] Validating TDD compliance for files: {{FILES}}"
    @if [ -z "{{FILES}}" ]; then echo "Usage: just tdd-validate FILES='src/file.ts'"; exit 1; fi
    make tdd-validate FILES="{{FILES}}"

# Security scanning
security:
    @echo "[brAInwav] Running security scans..."
    pnpm security:scan:all

security-ci:
    @echo "[brAInwav] Running CI security pipeline..."
    pnpm security:scan:ci

# Documentation
docs-build:
    @echo "[brAInwav] Building documentation..."
    pnpm docs:build

docs-lint:
    @echo "[brAInwav] Linting documentation..."
    pnpm docs:lint

# Code quality tools
format:
    @echo "[brAInwav] Formatting code..."
    pnpm format

lint:
    @echo "[brAInwav] Running linter..."
    pnpm lint:smart

# Memory management
memory-clean:
    @echo "[brAInwav] Cleaning memory (gentle)..."
    pnpm memory:clean:gentle

memory-monitor:
    @echo "[brAInwav] Starting memory monitor..."
    pnpm memory:monitor

# Deployment helpers
deploy-mcp:
    @echo "[brAInwav] Deploying MCP package..."
    bash scripts/deployment/deploy-mcp.sh

build-for-deployment:
    @echo "[brAInwav] Building for deployment..."
    bash scripts/deployment/build-for-deployment.sh

# Repository insights
codemap SCOPE="repo" SECTIONS="" TOOLS="":
    @echo "[brAInwav] Generating codemap for scope '{{SCOPE}}'..."
    python3 scripts/codemap.py --repo . --out out/codemap.json --md out/codemap.md --scope {{SCOPE}} {{ if SECTIONS != "" { "--sections " + SECTIONS } else { "" } }} {{ if TOOLS != "" { "--tools " + TOOLS } else { "" } }}

# Clean up
clean:
    @echo "[brAInwav] Cleaning build artifacts..."
    find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
    find . -name "build" -type d -exec rm -rf {} + 2>/dev/null || true
    pnpm nx reset

# Health checks
health:
    @echo "[brAInwav] Running health checks..."
    bash scripts/health-check.sh

# Git workflow helpers (using existing Graphite integration)
git-status:
    @echo "[brAInwav] Checking git status..."
    pnpm graphite:status

git-sync:
    @echo "[brAInwav] Syncing with remote..."
    pnpm graphite:sync

# Quick development workflow
dev-cycle: setup quality test
    @echo "[brAInwav] Development cycle complete"

# CI/CD simulation
ci-check: quality test security
    @echo "[brAInwav] CI checks complete"

# Show system information
info:
    @echo "[brAInwav] System Information:"
    @echo "Node.js: $(node --version)"
    @echo "pnpm: $(pnpm --version)"
    @echo "Git: $(git --version)"
    @echo "Platform: $(uname -s)"
    @echo "Architecture: $(uname -m)"
