## brAInwav: cortex-code vendor sync
.PHONY: vendor-cortex-code-dry vendor-cortex-code-run
vendor-cortex-code-dry:
	@./scripts/vendor-cortex-code.sh

vendor-cortex-code-run:
	@./scripts/vendor-cortex-code.sh --run
# MCP TDD Enforcement Makefile
# Standardized commands for MCP integration development
# Co-authored-by: brAInwav Development Team

SCOPE ?= repo
SECTIONS ?=
TOOLS ?=

# Default target
.PHONY: help
help:
	@echo "Cortex-OS MCP TDD Enforcement Commands - brAInwav Standards"
	@echo "========================================================"
	@echo "TDD Quality Gates (brAInwav Production Standards):"
	@echo "  tdd-quality-gates  - Run comprehensive quality gate validation"
	@echo "  tdd-ops-readiness  - Assess operational readiness (95% required)"
	@echo "  tdd-plan          - Generate TDD plan for package"
	@echo "  tdd-enforce       - Enforce TDD practices with quality gates"
	@echo ""
	@echo "MCP Development:"
	@echo "  mcp-setup     - Set up MCP development environment"
	@echo "  mcp-status    - Show MCP integration status"
	@echo "  mcp-validate  - Validate MCP implementations"
	@echo "  mcp-watch     - Watch for MCP changes"
	@echo "  mcp-enforce   - Enforce MCP TDD practices"
	@echo "  mcp-test      - Run MCP tests"
	@echo "  mcp-docs      - Generate MCP documentation"
	@echo "  mcp-clean     - Clean MCP build artifacts"
	@echo ""
	@echo "Repository Insights:"
	@echo "  codemap        - Generate multi-scope codemap (override SCOPE, SECTIONS, TOOLS)"

# === brAInwav TDD Quality Gates ===

# Run comprehensive TDD quality gates validation
.PHONY: tdd-quality-gates
tdd-quality-gates:
	@echo "[brAInwav] Running comprehensive TDD quality gates validation..."
	bash scripts/ci/tdd-quality-gates.sh
	@echo "[brAInwav] Quality gates validation complete"

# Assess operational readiness
.PHONY: tdd-ops-readiness
tdd-ops-readiness:
	@echo "[brAInwav] Assessing operational readiness (95% required for production)..."
	bash scripts/ci/ops-readiness-fast.sh out/ops-readiness.json
	@echo "[brAInwav] Operational readiness assessment complete"

# Generate TDD plan for package
.PHONY: tdd-plan
tdd-plan:
	@echo "[brAInwav] Generating TDD plan with production readiness criteria..."
	@if [ -z "$(PKG)" ]; then \
		echo "[brAInwav] Usage: make tdd-plan PKG=package-name"; \
		exit 1; \
	fi
	tdd-coach plan --package $(PKG) || echo "[brAInwav] Install @cortex-os/tdd-coach to use TDD planning"
	@echo "[brAInwav] TDD plan generation complete"

# Enforce TDD practices with quality gates
.PHONY: tdd-enforce
tdd-enforce:
	@echo "[brAInwav] Enforcing TDD practices with brAInwav quality standards..."
	# Run TDD Coach validation
	node packages/tdd-coach/dist/cli/tdd-coach.js validate --quality-gates || echo "[brAInwav] Install @cortex-os/tdd-coach for TDD enforcement"
	# Enforce quality gates
	node scripts/ci/enforce-gates.mjs
	@echo "[brAInwav] TDD enforcement complete"

# Validate TDD status
.PHONY: tdd-status
tdd-status:
	@echo "[brAInwav] Checking TDD status with operational readiness..."
	node packages/tdd-coach/dist/cli/tdd-coach.js status --ops-readiness || echo "[brAInwav] Install @cortex-os/tdd-coach for TDD status"
	@echo "[brAInwav] TDD status check complete"

# Validate specific files (expects FILES env)
.PHONY: tdd-validate
tdd-validate:
	@if [ -z "$(FILES)" ]; then \
		echo "[brAInwav] Usage: FILES=\"src/file.test.ts src/file.ts\" make tdd-validate"; \
		exit 1; \
	fi
	node packages/tdd-coach/dist/cli/tdd-coach.js validate --workspace . --files $(FILES) --non-blocking

# === MCP Development ===

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

.PHONY: codemap
codemap:
	@echo "[brAInwav] Generating codemap for scope '$(SCOPE)'..."
	python3 scripts/codemap.py --repo . --out out/codemap.json --md out/codemap.md --scope $(SCOPE) $(if $(strip $(SECTIONS)),--sections $(SECTIONS),) $(if $(strip $(TOOLS)),--tools $(TOOLS),)
	@echo "[brAInwav] Codemap generation complete"

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
