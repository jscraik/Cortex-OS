# Root Configuration Audit

## Overview

This audit reviews workspace hoisting, build pipelines, scripts, TypeScript settings, and Python packaging at the repository root. Each category is scored and accompanied by remediation steps.

| Area             | Status | Notes                                                                                   |
| ---------------- | ------ | --------------------------------------------------------------------------------------- |
| Workspaces       | ⚠️     | No explicit hoist pattern defined in `pnpm-workspace.yaml`                              |
| Build Graph      | ⚠️     | Duplicate `format` tasks in `turbo.json`                                                |
| Scripts          | ❌     | `package.json` contains a second JSON object, breaking script execution                 |
| TypeScript       | ✅     | `strict` mode enabled with additional safety checks                                     |
| Python Toolchain | ⚠️     | `pyproject.toml` pins only major/minor Python version; `uv.toml` lacks `python-version` |

## Findings

### Workspaces

`pnpm-workspace.yaml` lists apps, packages, services, and libs but does not declare a hoisting strategy. Without a `public-hoist-pattern` or related configuration, dependency resolution may drift between packages.

### Build Graph

`turbo.json` defines a comprehensive pipeline, yet the `format` task appears twice with differing settings, which can cause non-deterministic caching and execution.

### Scripts

`package.json` ends with a duplicate JSON object for a security update. The malformed structure prevents `pnpm` from running, blocking tests and lint steps. Script names vary (`test`, `ci:*`, etc.) and are not enforced by `lint-staged`/`husky` due to the broken manifest.

### TypeScript

`tsconfig.json` enables `strict` mode and other recommended flags (`noUnusedLocals`, `noImplicitReturns`, etc.), providing strong type safety.

### Python Packaging

`pyproject.toml` requires Python `>=3.13` but does not pin the exact patch release. `uv.toml` merely sets `workspace = true` without a specified toolchain version, leaving reproductions fragile.

## Fix Plan

1. Remove the trailing security JSON object from `package.json` and revalidate scripts.
2. Define a workspace hoist pattern (e.g., `public-hoist-pattern=['@cortex-os/*']`) to ensure consistent dependency resolution.
3. Consolidate the `format` task in `turbo.json` into a single definition.
4. Standardize script naming (`test:*`, `build`, etc.) and enforce via `lint-staged` and `husky` hooks.
5. Pin exact Python versions in `pyproject.toml` and `uv.toml` (e.g., `python = '3.13.5'`).

## Score

**55 / 100**

The presence of a malformed `package.json` significantly reduces the score. Addressing the fixes above will raise the configuration health.
