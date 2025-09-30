# docker-standardization TDD Plan

## Goal

Replace OrbStack-specific development tooling with standard Docker workflows while ensuring
brAInwav Cortex-OS contributors can build, run, and observe the stack using supported Docker CLI
installations as of 2025-09-30.

## Test Strategy

1. **Automation Scripts**
   - Add bash unit tests under `scripts/tests/` (or extend existing harness) ensuring the new Docker
     helper script validates required dependencies and emits brAInwav-branded messages when Docker is
     missing or outdated.
   - Ensure the script exits non-zero when `docker info` fails.
2. **Compose Configuration**
   - Run `docker compose config` against `infra/compose/docker-compose.dev.yml` and any new Docker
     overlays inside CI to confirm syntax validity without OrbStack labels.
   - Add a regression test (e.g., shell check in `scripts/tests` or custom vitest) that asserts `rg
     "orbstack"` returns zero results in runtime configuration directories to prevent regressions.
3. **Documentation Links**
   - Use markdown lint + link checking (existing `pnpm docs:lint` or `pnpm docs:test-links`) to ensure
     updated Docker installation guidance is valid and references maintained sources.
4. **Observability Stack**
   - If monitoring assets are retained, add compose smoke tests to start the stack in CI (using
     `docker compose --profile observability up --build --detach` followed by health checks) or ensure
     existing integration tests cover equivalent functionality without OrbStack-specific assumptions.
5. **Tooling Verification**
   - Execute `pnpm readiness:check` after updates to confirm no OrbStack validation remains and Docker
     CLI checks pass.

## Implementation Plan

1. **Identify and Remove OrbStack Artefacts**
   - Delete `.orbstack/`, `infra/compose/orbstack*.yml`, OrbStack monitoring assets, and helper scripts
     whose sole purpose is OrbStack management.
   - Update `tools/structure-guard/*` policies to drop `.orbstack` exclusions and add guards preventing
     reintroduction of OrbStack files.
   - Ensure package Dockerfiles no longer set `orbstack.*` labels; replace with neutral Docker labels
     (e.g., `com.brainwav.service`) if telemetry still needs metadata.

2. **Introduce Docker-First Tooling**
   - Replace `scripts/orbstack-dev.sh` with a new Docker-focused helper (for example,
     `scripts/docker-dev.sh`) that mirrors start/stop/profile behaviours using standard Docker compose.
   - Update `package.json` scripts from `dev:orbstack*` to `dev:docker*` using the new helper and ensure
     brAInwav branding in log output.
   - Adjust other automation scripts (backup, validation, CLI tests) to rely on Docker contexts and the
     new helper instead of OrbStack-specific logic.

3. **Modernize Compose Profiles**
   - Refactor `infra/compose/docker-compose.dev.yml` to rely on official Docker features for multi-arch
     builds, caching, and hot reload.
   - Replace `x-orbstack-labels` with shared Docker label templates (`x-brainwav-labels`) or remove
     labels when unnecessary.
   - Revisit `docker-compose.dev-hot-reload.yml` to ensure file-watching annotations use Docker best
     practices (Bind mount `delegated`, Mutagen, or Docker Desktop file sync if required).

4. **Monitoring and Telemetry Alignment**
   - Evaluate OrbStack monitoring stack; if redundant, document removal in CHANGELOG.
   - If the telemetry remains relevant, convert scripts (e.g., `orbstack-monitor.py`) to operate against
     Docker default socket/context and rename resources accordingly.
   - Update any Prometheus/Grafana references to the new naming conventions.

5. **Documentation Overhaul**
   - Replace OrbStack instructions across `docs/`, `packages/*/README*.md`, and website docs with Docker
     guidance (e.g., installation via Docker Desktop 4.x or Docker CLI + `lima/colima`).
   - Update setup scripts (`scripts/dev-setup.sh`, `scripts/verify-hybrid-env.sh`) so README snippets and
     tutorials reference the Docker-first workflow.
   - Ensure all docs note brAInwav branding in commands and log outputs.

6. **Validation and Cleanup**
   - Run the full quality gate (`pnpm lint && pnpm test && pnpm security:scan && pnpm structure:validate`).
   - Execute `pnpm build:smart` and `pnpm test:smart` with the Docker dev stack running to validate
     interoperability.
   - Confirm no `orbstack` token remains via repository-wide search and document the change in
     `CHANGELOG.md` and `/website/README.md` per governance.

## Implementation Checklist

- [ ] Remove OrbStack-specific files and update structure guard rules to block reintroduction.
- [x] Introduce Docker-first helper script(s) and replace `dev:orbstack*` runners with `dev:docker*`.
- [ ] Update compose files and Dockerfiles to eliminate `orbstack.*` labels while adopting Docker
      best-practice metadata or removing unused labels.
- [ ] Migrate monitoring/telemetry assets to Docker naming or remove redundant components with proper
      documentation.
- [ ] Refresh developer documentation, CHANGELOG, and website README to reflect Docker workflows and
      installation guidance current to 2025-09-30.
- [ ] Add regression tests/verifications ensuring OrbStack references are gone and Docker CLI checks
      pass in readiness scripts.
- [ ] Execute full quality gates and confirm Docker-based development workflow operates end-to-end.
