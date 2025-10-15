# Feature PRP – Run Manifest Workflow

**Feature**: [Feature Name]
**Run ID**: `run-<timestamp>`
**Owner**: [Team / Individual]
**Last Updated**: 2025-10-14

## 1. Objective
- Problem Statement: _What problem are we solving?_
- Desired Outcome: _What measurable outcome proves success?_

## 2. Stage Overview (Product→Automation)
| Stage Key              | Status  | Owner              | Evidence | Notes |
|-----------------------|---------|--------------------|----------|-------|
| product-foundation    | pending | product@brainwav.ai |          |       |
| product-test-strategy | pending | qa@brainwav.ai      |          |       |
| engineering-execution | pending | eng@brainwav.ai     |          |       |
| quality-triage        | pending | quality@brainwav.ai |          |       |
| automation-release    | pending | release@brainwav.ai |          |       |

## 3. Blueprint Snapshot
- Title: _copy from blueprint_
- Description: _copy from blueprint_
- Requirements:
  - [ ] Requirement 1
  - [ ] Requirement 2

## 4. Manifest Artifacts
- Run Manifest Path: `.cortex/run-manifests/<runId>.json`
- PRP Markdown Path: `./prp.md`
- Stage Proofs Directory: `./proofs/`

## 5. Governance Links
- Policy File: `docs/prp/prp.policy.json`
- CLI Usage:
  ```bash
  # Inspect
  pnpm prp manifest inspect .cortex/run-manifests/<runId>.json

  # Validate manifest
  pnpm prp manifest verify .cortex/run-manifests/<runId>.json

  # Policy check
  pnpm prp policy --manifest .cortex/run-manifests/<runId>.json --policy docs/prp/prp.policy.json
  ```

## 6. Evidence Log
| Stage Key              | Evidence Type | Reference                         | Notes |
|-----------------------|---------------|-----------------------------------|-------|
| product-foundation    | plan          | docs/prp/artifacts/plan.md        |       |
| engineering-execution | proof         | proofs/engineering-execution.json |       |

## 7. Sign-off Checklist
- [ ] Manifest validated (`pnpm prp manifest verify ...`)
- [ ] Policy evaluation passed (`pnpm prp policy ...`)
- [ ] Stage proofs verified (`pnpm prp signatures --manifest ... --all proofs/`)
- [ ] Documentation updated (this file + README references)

---

> _Template instructions_: copy this file into your feature folder (e.g. `docs/prp/features/<feature-name>.md`) and replace placeholders before committing. Keep manifest paths relative to repo root.
