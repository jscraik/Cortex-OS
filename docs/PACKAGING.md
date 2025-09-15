# Packaging and Release Guide

This guide covers how to package Cortex-OS for distribution: containers (recommended), npm packages, Python wheels, and a Compose bundle.

## Containers (recommended)

- One image per app/service (ASBR runtime, API, marketplace, marketplace-api).
- Dockerfiles: `docker/*.dockerfile`; Compose files in `docker/`.
- Configure via environment variables; include `.env.example` per service.

## NPM packages (CLI and libraries)

- Targets: `apps/cortex-code` (CLI replacement for deprecated cortex-cli), `libs/typescript/*`, selected `packages/*`.
- Ensure each package has: main/module/types, `files` whitelist, build script, optional `publishConfig.registry`.

## Python packaging (cortex-py)

- Location: `apps/cortex-py` with `pyproject.toml` (uv-managed).
- Build wheel and sdist; publish to PyPI or internal index.

## Whole-stack bundle (Compose)

- Provide a versioned compose file with pinned image tags (see `docker/docker-compose.prod.yml`).
- Include a small README noting required env keys and startup steps.

## CI release flow

- Gates: readiness (≥95% per-package), semgrep scans, SBOM generation.
- Jobs: `.github/workflows/readiness.yml` and `security-and-sbom.yml`.
- Publishing:
  - Container images → GHCR with `semver`, `latest`, and `sha` tags.
  - Optional npm packages on tags via semantic-release hooks.
  - Optional Python wheels via `uv publish`.

## Provenance and compliance

- SBOM (CycloneDX) generated in CI and uploaded from `sbom/`.
- Keep license validation green: `pnpm license:validate`.
