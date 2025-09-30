# Docker Standardization Research

Date: 2025-09-30

## Current OrbStack Dependencies

- `infra/compose/docker-compose.dev.yml` defines `x-orbstack-labels` and applies
  `orbstack.*` labels across services.
- `infra/compose/orbstack.yml` and `infra/compose/orbstack-fixed.yml` provide
  OrbStack-specific compose overlays used by automation scripts.
- `infra/monitoring/orbstack-monitor.py`, `infra/monitoring/orbstack-metrics.yml`,
  and `infra/monitoring/Dockerfile.orbstack-monitor` expose dedicated
  OrbStack telemetry endpoints.
- `.orbstack/config.yaml` stores OrbStack runtime tuning.
- Multiple Dockerfiles (for example `apps/cortex-os/Dockerfile`,
  `packages/model-gateway/Dockerfile`, `apps/cortex-py/Dockerfile`) set
  `orbstack.*` labels during build.

## Tooling & Scripts

- `scripts/orbstack-dev.sh`, `scripts/orbstack-backup.sh`,
  `scripts/list-orbstack-containers.sh`, and helper files in `scripts/`
  manage OrbStack-specific workflows such as context checks, profile orchestration,
  and backups.
- Validation utilities such as `scripts/validate-orbstack-env.sh`,
  `scripts/verify-hybrid-env.sh`, and `scripts/orbstack-functions.sh` enforce
  OrbStack presence.
- `package.json` exposes numerous `dev:orbstack*` npm scripts that shell out to
  OrbStack-aware compose commands.
- Nx/CLI helpers like `scripts/cortex-dev.sh` switch the Docker context to
  `orbstack` during startup.

## Documentation & References

- Developer docs (`docs/orbstack-setup.md`, `docs/dev-tools-reference.md`,
  `docs/orbstack-dev.md`, `docs/docker-setup.md`, and
  `docs/observability/prometheus-grafana-setup.md`) instruct contributors to
  install and operate via OrbStack.
- CHANGELOG and enhancement notes reference OrbStack verification workflows.
- Website documentation at `website/docs/cortex/cortex-os-prd-agentic-2nd-brain.md`
  highlights OrbStack architecture benefits.

## Supporting Configuration

- Structure guard policies (`tools/structure-guard/guard.ts`,
  `tools/structure-guard/policy.json`) ignore `.orbstack` artifacts.
- Compose hot reload overlay `infra/compose/docker-compose.dev-hot-reload.yml`
  includes `orbstack` labels and references `infra/compose/orbstack.yml`.

## Gaps & Open Questions

- `just scout` (agent-toolkit search) is unavailable in the current shell, so
  fallback `rg` search was used; need to address tooling expectation in the
  plan.
- Need confirmation on whether OrbStack-specific monitoring components should be
 removed or replaced with standard Docker observability.
- Must determine preferred Docker context defaults (for example `default`
  versus custom) and whether new helper scripts are required.
- Clarify required documentation updates for installing Docker Desktop versus a
  Docker CLI-only workflow on macOS.
