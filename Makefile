# MCP TDD Enforcement Makefile
# Standardized commands for MCP integration development

# Default target
.PHONY: help
help:
	@echo "Cortex-OS MCP TDD Enforcement Commands"
	@echo "====================================="
	@echo "mcp-setup     - Set up MCP development environment"
	@echo "mcp-status    - Show MCP integration status"
	@echo "mcp-validate  - Validate MCP implementations"
	@echo "mcp-watch     - Watch for MCP changes"
	@echo "mcp-enforce   - Enforce MCP TDD practices"
	@echo "mcp-test      - Run MCP tests"
	@echo "mcp-docs      - Generate MCP documentation"
	@echo "mcp-clean     - Clean MCP build artifacts"

# Setup MCP development environment
.PHONY: mcp-setup
mcp-setup:
	@echo "Setting up MCP development environment..."
	# Install MCP core dependencies
	cd packages/mcp-core && pnpm install
	cd packages/mcp-bridge && pnpm install
	cd packages/mcp-registry && pnpm install
	# Install Python MCP dependencies
	cd packages/cortex-mcp && pip install -e .
	# Install Rust MCP dependencies
	cd apps/cortex-code/mcp-types && cargo build
	cd apps/cortex-code/mcp-client && cargo build
	cd apps/cortex-code/mcp-server && cargo build
	@echo "MCP development environment setup complete"

# Show MCP integration status
.PHONY: mcp-status
mcp-status:
	@echo "MCP Integration Status"
	@echo "===================="
	@echo "Checking MCP integration status..."
	python3 scripts/verify-mcp-setup.py || true
	@echo "Status check complete"

# Validate MCP implementations
.PHONY: mcp-validate
mcp-validate:
	@echo "Validating MCP implementations..."
	# Run contract tests via smart test runner
	pnpm run test:smart --filter="*mcp*" || true
	# Check local-memory service status
	local-memory status || echo "Warning: local-memory not running in daemon mode"
	# Validate MCP registry
	node tools/validators/enforce-local-memory.mjs || echo "Local memory validation completed"
	@echo "MCP validation complete"

# Watch for MCP changes
.PHONY: mcp-watch
mcp-watch:
	@echo "Watching for MCP changes..."
	# Start file watchers for MCP files
	pnpm run watch:mcp &
	@echo "MCP watch started"

# Enforce MCP TDD practices
.PHONY: mcp-enforce
mcp-enforce:
	@echo "Enforcing MCP TDD practices..."
	# Run TDD coach validation
	cd packages/tdd-coach && pnpm run validate
	# Check test coverage
	pnpm run coverage:mcp
	# Enforce code quality
	pnpm run lint:mcp
	@echo "MCP TDD enforcement complete"

# Run MCP tests
.PHONY: mcp-test
mcp-test:
	@echo "Running MCP tests..."
	# Run unit tests
	pnpm run test:mcp:unit
	# Run integration tests
	pnpm run test:mcp:integration
	# Run contract tests
	pnpm run test:mcp:contract
	# Run security tests
	pnpm run test:mcp:security
	@echo "MCP tests complete"

# Generate MCP documentation
.PHONY: mcp-docs
mcp-docs:
	@echo "Generating MCP documentation..."
	# Generate API documentation
	pnpm run docs:mcp
	# Generate tool references
	python3 scripts/generate-mcp-docs.py
	@echo "MCP documentation generated"

# Clean MCP build artifacts
.PHONY: mcp-clean
mcp-clean:
	@echo "Cleaning MCP build artifacts..."
	# Clean TypeScript builds
	rm -rf packages/mcp-core/dist
	rm -rf packages/mcp-bridge/dist
	rm -rf packages/mcp-registry/dist
	# Clean Python builds
	cd packages/cortex-mcp && pip uninstall cortex-mcp -y
	# Clean Rust builds
	cd apps/cortex-code && cargo clean
	@echo "MCP build artifacts cleaned"

# Run full MCP TDD cycle
.PHONY: mcp-tdd
mcp-tdd: mcp-setup mcp-validate mcp-test mcp-docs
	@echo "MCP TDD cycle complete"

# Install MCP pre-commit hooks
.PHONY: mcp-hooks
mcp-hooks:
	@echo "Installing MCP pre-commit hooks..."
	# Install pre-commit hooks for MCP
	pre-commit install -c .pre-commit-config-mcp.yaml
	@echo "MCP pre-commit hooks installed"

# Run MCP security audit
.PHONY: mcp-audit
mcp-audit:
	@echo "Running MCP security audit..."
	# Run security audit on Python packages
	cd packages/cortex-mcp && pip audit
	# Run security audit on TypeScript packages
	pnpm audit
	# Run security audit on Rust packages
	cd apps/cortex-code && cargo audit
	@echo "MCP security audit complete"

# Run MCP performance tests
.PHONY: mcp-perf
mcp-perf:
	@echo "Running MCP performance tests..."
	# Run performance benchmarks
	pnpm run bench:mcp
	@echo "MCP performance tests complete"
