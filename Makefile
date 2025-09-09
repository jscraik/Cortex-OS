SHELL := /bin/sh

# OrbStack dev profiles via Makefile wrappers

.PHONY: dev-min dev-full web api workers obs demo down ps logs codex-test codex-test-unit codex-test-integration codex-test-coverage cortex-code-tui-test-snapshots cortex-code-test submodules-sync tdd-validate tdd-watch tdd-status tdd-setup

dev-min:
	pnpm dev:orbstack:min

dev-full:
	pnpm dev:orbstack:full

web:
	pnpm dev:orbstack:web

api:
	pnpm dev:orbstack:api

workers:
	pnpm dev:orbstack:workers

obs:
	pnpm dev:orbstack:obs

demo:
	# Full stack demo: core + web + observability
	 docker compose --env-file infra/compose/.env.dev -f infra/compose/docker-compose.dev.yml \
		--profile dev-full --profile web --profile observability up --build -d

down:
	pnpm dev:orbstack:down

ps:
	pnpm dev:orbstack:ps

logs:
	pnpm dev:orbstack:logs

# Cortex Codex Rust test helpers
codex-test:
	pnpm codex:test

codex-test-unit:
	pnpm codex:test:unit

codex-test-integration:
	pnpm codex:test:integration

codex-test-coverage:
	pnpm codex:test:coverage

# Cortex Code (Rust fork) helpers
cortex-code-test:
	pnpm cortex-code:test

cortex-code-tui-test-snapshots:
	pnpm cortex-code:tui:test-snapshots

# Sync and update all git submodules (init + remote tracking)
submodules-sync:
	@git submodule sync --recursive
	@git submodule update --init --recursive
	# Optionally pull latest remote tracking branches (comment out if strict pinning)
	@git submodule update --remote --recursive || echo "(remote update skipped / non-critical)"
	@echo "✅ Submodules synchronized"

# TDD Coach Integration for brAInwav Development
tdd-setup:
	@echo "🏗️  Setting up TDD Coach for brAInwav development..."
	cd packages/tdd-coach && pnpm build
	@echo "✅ TDD Coach is ready for use"

tdd-status:
	@echo "📊 Checking current TDD status..."
	cd packages/tdd-coach && node dist/cli/tdd-coach.js status

tdd-validate:
	@echo "🔍 Validating code with TDD Coach..."
	cd packages/tdd-coach && node dist/cli/tdd-coach.js validate --files $(FILES)

tdd-watch:
	@echo "👀 Starting TDD Coach in watch mode..."
	@echo "Press Ctrl+C to stop"
	cd packages/tdd-coach && node dist/cli/tdd-coach.js validate --watch

tdd-enforce:
	@echo "🚀 Running TDD Enforcer script..."
	./scripts/tdd-enforcer.sh
