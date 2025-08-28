# .cortex/ Governance Hub

This directory is the **single source of truth** for all Cortex-OS governance, policies, and validation rules.

## Authority Chain

1. **`.cortex/rules/AGENTS.md`** - "AGENTS.md is the boss" - Core agentic behavior rules
2. **`.cortex/rules/RULES_OF_AI.md`** - Fundamental AI governance principles
3. **`.cortex/rules/COPILOT-INSTRUCTIONS.md`** - GitHub Copilot specific guidelines
4. **`.cortex/policy/*.json`** - Machine-readable policies (validated by schemas)
5. **Package-level configs** - Local overrides (must comply with global policies)

## Directory Structure

- **`schemas/`** - JSON Schemas for all policies and data structures
- **`policy/`** - Runtime policies in JSON format (validated against schemas)
- **`rules/`** - Human-readable governance documents (Markdown)
- **`prompts/`** - Agent personas, capability packs, and workflows
- **`gates/`** - Validation scripts that enforce policies
- **`runbooks/`** - Operational procedures and incident response
- **`audit/`** - Compliance tracking and audit logs

## Usage

All policies and schemas in this directory are enforced by:

1. **Pre-commit hooks** - Local validation before commits
2. **CI/CD pipelines** - Automated validation on PRs
3. **Runtime enforcement** - Policy engines during execution

## Validation

Run all governance validation:

```bash
cd .cortex/gates
pnpm run validate
```
