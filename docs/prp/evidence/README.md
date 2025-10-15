# PRP Evidence Index

This directory tracks raw evidence collected during PRP runs (command logs, coverage reports, screenshots).

## Evidence Types
- **Tests**: Coverage summaries, mutation reports.
- **Security**: Scan logs (Semgrep, gitleaks).
- **Accessibility**: axe or jest-axe outputs.
- **Telemetry**: `models:health`, `models:smoke`, performance benchmarks.

## Storage Rules
1. Store outputs as `.md` or `.log` files; large binaries belong in external storage with signed references.
2. Prefix filenames with stage key and evidence type, e.g. `G3-tests-unit.log`.
3. Attach evidence references in run manifests (`stage.evidence`) using file paths or URLs.
4. Include `[brAInwav]` branding in log summaries.

## Verification Workflow
```bash
# Validate manifest references
pnpm prp manifest verify .cortex/run-manifests/<runId>.json

# Re-run policy check
pnpm prp policy --manifest .cortex/run-manifests/<runId>.json --policy docs/prp/prp.policy.json
```

Maintain parity between this directory and any Local Memory entries created for PRP runs.
