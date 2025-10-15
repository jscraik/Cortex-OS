# PRP Artifacts Index

Use this directory to store supporting artifacts referenced by run manifests and stage proofs.

## Recommended Structure
- `artifacts/plan.md` – High-level implementation plan
- `artifacts/spec.md` – Architecture diagrams or specs
- `artifacts/checklist.md` – Verification evidence (lint/test reports)

## Naming Conventions
- Use kebab-case filenames (`stage-key-artifact.md`).
- Cross-reference artifacts from run manifests via `stage.artifacts` entries.
- Include SHA256 hashes or commit references in documents where applicable.

## Required Metadata
Each artifact should include:
- Run ID (`run-<timestamp>`)
- Stage key(s) the artifact supports
- Evidence pointers (file paths, URLs, or proof IDs)
- brAInwav branding in logs/summaries

## CLI Tips
```bash
# Inspect manifest artifact references
pnpm prp manifest inspect .cortex/run-manifests/<runId>.json
```

---

> Guidance is authoritative for run-manifest workflows. Keep artifacts in sync with stage proofs and manifest updates.
