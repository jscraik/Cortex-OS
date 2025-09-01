# .cortex Governance Hub

[![CI Status](https://github.com/Cortex-OS/Cortex-OS/actions/workflows/ci.yml/badge.svg)](https://github.com/Cortex-OS/Cortex-OS/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](../LICENSE)

This directory is the **single source of truth** for all Cortex-OS governance, policies, and validation rules.

## Table of Contents

- [Authority Chain](#authority-chain)
- [Directory Structure](#directory-structure)
- [Usage](#usage)
- [Validation](#validation)

## Authority Chain

1. **`.cortex/rules/AGENTS.md`** – "AGENTS.md is the boss" — core agentic behavior rules.
2. **`.cortex/rules/RULES_OF_AI.md`** – fundamental AI governance principles.
3. **`.cortex/rules/COPILOT-INSTRUCTIONS.md`** – GitHub Copilot guidelines.
4. **`.cortex/policy/*.json`** – machine-readable policies validated against schemas.
5. **Package-level configs** – local overrides that must comply with global policies.

## Directory Structure

- `schemas/` – JSON Schemas for policies and data structures.
- `policy/` – Runtime policies in JSON format (schema-validated).
- `rules/` – Human-readable governance documents.
- `prompts/` – Agent personas, capability packs, and workflows.
- `gates/` – Validation scripts enforcing policies.
- `runbooks/` – Operational procedures and incident response.
- `audit/` – Compliance tracking and audit logs.

## Usage

Policies and schemas here are enforced by:

1. **Pre-commit hooks** – local validation before commits.
2. **CI/CD pipelines** – automated validation on pull requests.
3. **Runtime enforcement** – policy engines during execution.

## Validation

Run all governance validation:

```bash
cd .cortex/gates
pnpm run validate
```
