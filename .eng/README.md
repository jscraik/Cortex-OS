# brAInwav Engineering Standards

This directory contains engineering standards and quality gates for the brAInwav Cortex-OS project.

## Files

- [`quality_gate.json`](./quality_gate.json) - Quality gate definitions and thresholds
- [`tdd-enforcement-policy.md`](./tdd-enforcement-policy.md) - TDD enforcement policies and procedures

## Integration

These standards are enforced automatically through:

- CI/CD pipelines via `.github/workflows/`
- Pre-commit hooks via `scripts/ci/`
- TDD Coach integration via `packages/tdd-coach/`

## brAInwav Compliance

All engineering artifacts must maintain brAInwav branding and comply with company standards as defined in the quality gate contract.
