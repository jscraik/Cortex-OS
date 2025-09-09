# Workflow Inventory

This document lists the current GitHub Actions workflows and highlights shared steps.

## Current Workflows

- accessibility.yml
- advanced-ci.yml
- agentops.yml
- agents-ci.yml
- cache.yml
- chaos.yml
- ci.yml
- codeql.yml
- compliance.yml
- contracts-coverage.yml
- control-centre.yml
- cortex-agent.yml
- cortex-codex-ci.yml
- cortex-gates.yml
- cortex-review.yml
- cortex-tui-ci.yml
- dast-and-fuzzing.yml
- deploy-cortex-ai-github.yml
- docs-deploy.yml
- docs-lint.yml
- documentation.yml
- gitleaks.yml
- k6-annotate.yml
- k6.yml
- license-check.yml
- mcp-nightly.yml
- mcp-python-integration.yml
- nightly-quality.yml
- pr-format.yml
- readiness.yml
- release.yml
- review-automation.yml
- review.yml
- scheduled-lint.yml
- security-and-sbom.yml
- security-consolidated.yml
- security-sca-and-signing.yml
- security-scan.yml
- security-test.yml
- security.yml
- semgrep-baseline-refresh.yml
- semgrep.yml
- sigstore-signing.yml
- sonar.yml
- staging.yml
- tdd-enforcement.yml
- verify.yml
- workflow-lint.yml

## Shared Patterns

Most workflows perform similar setup:

- Checkout repository
- Install Node.js and pnpm
- Restore pnpm cache
- Install dependencies with `pnpm install`
- Run lint, typecheck, build, and test commands

These repeated steps can be moved to a reusable workflow to reduce duplication.
