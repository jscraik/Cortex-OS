---
title: Cortex Code Upstream Sync (Vendored Copy)
---

<!-- Heading suppressed to satisfy single-title rule; title provided via front matter -->

The contents of `apps/cortex-code/` are a vendored snapshot of the Rust portion
(`codex-rs` subdirectory) of the `openai/codex` monorepo.

We DO NOT use `git subtree` because the upstream Rust crates live inside a monorepo
subdirectory; maintaining a filtered mirror would add overhead. Instead we
periodically vendor updates with a reproducible script plus a scheduled workflow.

## Quick Start

Dry run (shows diff summary, does NOT modify working tree):

```bash
bash scripts/sync-cortex-code.sh
```

Apply update (creates a branch + commit if changes):

```bash
bash scripts/sync-cortex-code.sh --run
```

Force despite uncommitted changes (discouraged):

```bash
bash scripts/sync-cortex-code.sh --run --force
```

## How It Works

1. Shallow clones (or updates) the upstream repo into `.cache/cortex-code-sync/tmp`.
2. Copies only the `codex-rs` subdirectory (configurable via `UPSTREAM_SUBDIR`).
3. Compares to current `apps/cortex-code/` (excluding `.syncignore` patterns).
4. If different and `--run` provided, rsyncs changes, writes `UPSTREAM_REF` (root-level) with the upstream commit, creates branch `sync/cortex-code-<hash>` and commits.
5. Generates a crate change summary (`SYNC_CRATE_SUMMARY.json` + markdown twin) including
  added / removed / modified crates plus LOC / churn metrics.
6. Optionally splits the vendor update into grouped commits per change category (added /
  removed / modified) for cleaner review (enabled by default; set `SPLIT_COMMITS=0` to
  disable).
7. You push & open PR (or CI workflow does it for scheduled runs). The workflow auto-labels
  PRs based on crate changes and a verification workflow validates the summary JSON.

## Script Location

`scripts/sync-cortex-code.sh`

### Important Flags

| Flag | Purpose |
|------|---------|
| `--run` | Apply changes (otherwise dry-run) |
| `--force` | Bypass dirty working tree guard |
| `--ignore-unmerged` | Skip guard that blocks if other local branches have unmerged changes under `apps/cortex-code/` |
| `--summary-output <file>` | Write crate summary JSON to custom path (default `SYNC_CRATE_SUMMARY.json`) |
| `--print-changed-crates` | Echo added/removed/modified crate list to stderr |
| `--analyze-versions` | Add semantic version analysis to summary |
| `--detect-license-changes` | Scan for license/notice file changes |
| `--generate-sbom-delta` | Emit `SBOM_DELTA.json` and add `sbomDeltaFile` to summary |
| `--spdx-sbom` | Generate SPDX 2.3 compliant SBOM |
| `--dependency-analysis` | Add transitive dependency risk analysis |
| `--allow-downgrades` | Bypass version downgrade gating |
| `--strict-version-gating` | Enable strict version bump validation |
| `--bypass-reason <reason>` | Provide bypass justification for strict gating |
| `--branch <name>` | Override generated branch name |
| `--upstream-ref <sha>` | Pin to specific upstream commit |
| (env) `SPLIT_COMMITS=0` | Disable grouped commit splitting (default on) |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `UPSTREAM_REPO_URL` | `https://github.com/openai/codex.git` | Upstream monorepo URL |
| `UPSTREAM_SUBDIR` | `codex-rs` | Path inside upstream containing Rust crates |
| `LOCAL_PREFIX` | `apps/cortex-code` | Destination directory in this repo |
| `WORK_DIR` | `.cache/cortex-code-sync/tmp` | Temp clone directory |

## Ignore Patterns

Define exclusions in `.syncignore` (glob patterns, comments start with `#`). Example:

```text
target/
**/tests/
*.md
```

## Scheduled Workflow

Workflow: `.github/workflows/cortex-code-sync.yml`

* Runs daily (UTC 04:17) in dry-run mode (no PR).
* Manual dispatch with `run=true` performs a real sync and opens a PR.
* Dynamic labels added:
  * `crate-added` if any new crates
  * `crate-removed` if any crates removed
  * `crate-modified` if any Cargo.toml changes
* PR body lists added/removed/modified crate names (comma-separated).

### Crate Summary Artifacts

Generated on real sync (`--run`):

| File | Description |
|------|-------------|
| `SYNC_CRATE_SUMMARY.json` | Machine-readable summary with arrays: `added`, `removed`, `modified` |
| `SYNC_CRATE_SUMMARY.md` | Human readable bullet list |

JSON shape (fields may extend over time – treat unknown fields as forward-compatible):

```jsonc
{
  // Core fields
  "syncType": "manual|automated",
  "timestamp": "2025-09-13T04:17:00Z",
  "upstreamCommit": "<sha>",
  "previousUpstream": "<sha or empty>",
  "changesSummary": "Added 2 crates, modified 1 crate",
  "totalChanges": {
    "filesChanged": 78,
    "locAdded": 1234,
    "locDeleted": 456
  },
  "codeChurn": {
    "linesAdded": 1234,
    "linesDeleted": 456,
    "linesModified": 890
  },
  "added": ["crate_a"],
  "removed": ["crate_b"],
  "modified": ["crate_c"],
  "generatedAt": "2025-09-13T04:17:00Z",
  
  // Advanced fields (when applicable)
  "versionChanges": [{
    "crate": "crate_x",
    "previousVersion": "0.2.1",
    "newVersion": "1.0.0",
    "bumpType": "major",
    "riskScore": 8.5
  }],
  "licenseChanges": {
    "added": ["path/LICENSE"],
    "removed": [],
    "modified": ["path/NOTICE"],
    "severities": [{
      "file": "path/LICENSE",
      "change": "added",
      "severity": "HIGH"
    }]
  },
  "dependencyImpact": {
    "totalCrates": 42,
    "highRiskChanges": 2,
    "mediumRiskChanges": 5,
    "thresholds": { "high": 7, "medium": 4 }
  },
  "sbomDeltaFile": "SBOM_DELTA.json",
  "spdxSbomFile": "apps/cortex-code/SPDX_SBOM.json",
  "dependencyAnalysis": {
    "riskScores": [{
      "crate": "crate_x",
      "riskScore": 8.5,
      "dependencyCount": 12,
      "riskFactors": ["major version bump", "high dependency count"]
    }],
    "totalDependencies": 156,
    "avgRiskScore": 4.2
  },
  "versionGating": {
    "violations": 1,
    "bypassReasons": ["security hotfix"],
    "strictMode": true
  }
}
```

### LOC / Churn Metrics

The script stages changes then runs `git diff --cached --numstat -- apps/cortex-code/` to derive:

* `locAdded` – sum of added lines
* `locDeleted` – sum of removed lines
* `filesChanged` – count of files with modifications

These metrics assist in code review sizing & risk assessment (e.g., large vendor updates may need extra scrutiny).

### Grouped Commit Splitting

When `SPLIT_COMMITS` (default `1`) is enabled, the script attempts to create separate commits:

1. `added crates` – new crate directories introduced
2. `removed crates` – deletions
3. `modified crates` – crate directories whose `Cargo.toml` changed
4. A final `misc` commit for any non-crate or shared adjustments (if present)

Disable by exporting `SPLIT_COMMITS=0` before calling the script if a single atomic commit is preferred.

### Verification Workflow

Workflow: `.github/workflows/cortex-code-sync-verify.yml`

Runs on PRs whose branch name starts with `sync/cortex-code-` and validates:

* Presence of `SYNC_CRATE_SUMMARY.json`
* Required keys exist
* Crate name patterns (`^[a-z0-9_-]+$`)
* Numeric fields (`locAdded`, `locDeleted`, `filesChanged`)
* (Best-effort) ancestry relation of `previousUpstream` -> `upstreamCommit`

Failing validation blocks merge until regenerated.

### Local Test Script

A lightweight test script lives at `scripts/tests/test-sync-summary.sh` which:

1. Synthesizes a tiny fake upstream repo with two crates
2. Runs initial sync and inspects summary shape
3. Modifies one crate + adds another, re-runs, and asserts expected changes

Run:

```bash
./scripts/tests/test-sync-summary.sh
```

Useful for quick validation after editing the sync script.

### Semantic Version Changes

`versionChanges` (if present) is an array of objects:

```jsonc
{
  "crate": "crate_x",
  "previousVersion": "0.2.1",
  "newVersion": "1.0.0",
  "bumpType": "major" // major|minor|patch|prerelease|downgrade|none|unknown
}
```

Classification is heuristic: it splits on dots, ignores build metadata, marks downward movement as `downgrade`.

### License / Notice Change Detection

The script scans (depth ≤6) for: `LICENSE`, `LICENSE.*`, `COPYING`, `NOTICE`, `NOTICE.*`.
It records arrays under `licenseChanges`: `added`, `removed`, `modified` (content diffs).

### SBOM Delta Export

Passing `--generate-sbom-delta` produces `SBOM_DELTA.json` summarizing added, removed
and version-changed crates with versions + bump type; the path is referenced in
`sbomDeltaFile` inside the main summary.

### Advanced Compliance Features

#### Dependency Impact Analysis

With `--dependency-analysis`, the sync process analyzes dependency changes and provides transitive risk scoring:

* **Risk Scoring**: Each crate gets analyzed for dependency count and version bump severity
* **Transitive Analysis**: Considers the full dependency graph and impact propagation
* **Risk Factors**: Multiple criteria including version change type, dependency count, and potential compatibility issues

The `dependencyAnalysis` summary field includes:

```jsonc
{
  "riskScores": [{
    "crate": "crate_x", 
    "riskScore": 8.5,
    "dependencyCount": 12,
    "riskFactors": ["major version bump", "high dependency count"]
  }],
  "totalDependencies": 156,
  "avgRiskScore": 4.2
}
```

**Risk Score Calculation**:

* Base score starts at 3.0
* Major version bump: +3.0
* Minor version bump: +1.5  
* Patch version bump: +0.5
* High dependency count (>10): +1.5
* Medium dependency count (5-10): +0.8
* Downgrade: +2.0

#### SPDX SBOM Export

Generate SPDX 2.3 compliant Software Bill of Materials:

```bash
./scripts/sync-cortex-code.sh --spdx-sbom
```

Creates `apps/cortex-code/SPDX_SBOM.json` with:

* Package information and relationships
* License details and file checksums
* Creation info and document metadata

#### License Change Classification

License modifications are classified by severity:

* **LOW**: Compatible license changes, additions of permissive licenses
* **MEDIUM**: License removals, format changes, minor compatibility issues
* **HIGH**: Incompatible license changes, copyleft additions, unknown licenses

The `licenseChanges` field includes `severities` array with per-file classifications.

#### Version Bump Gating

Enforce strict versioning policies:

```bash
# Strict mode (fail on violations)
./scripts/sync-cortex-code.sh --strict-version-gating

# With bypass reasons
./scripts/sync-cortex-code.sh --strict-version-gating --bypass-reason "security hotfix"
```

**Violation Types**:

* Unexpected downgrades
* Major version jumps without justification
* Pre-release to stable without review

The `versionGating` summary field tracks violations and bypass justifications.

### Large Churn Annotation

During the sync workflow a warning annotation and `large-sync` label are added if
`locAdded > 2000` or `filesChanged > 200` (override via env vars
`THRESHOLD_LOC_ADDED` / `THRESHOLD_FILES_CHANGED`).

## Commit Traceability

* Root `UPSTREAM_REF` file stores the upstream commit hash applied.
* Commit message includes upstream repo, subdirectory, previous upstream ref, crate change counts & lists, and paths of summary artifacts.

## Customizations / Overlay Guidance

Keep upstream crates close to source. New Cortex-specific logic should live in additive
crates (e.g., `providers-ext/`, `anthropic/`, etc.) to reduce merge friction.

## Future Improvements (Planned / Ideas)

* (DONE) LOC / churn metrics in summary
* (DONE) Grouped commit splitting per change category
* (DONE) Semantic version bump classification
* (DONE) License / notice file change detection
* (DONE) SBOM delta export
* (DONE) Large churn annotation + label
* (DONE) Dependency impact graph analysis with risk scoring
* (DONE) SPDX SBOM export
* (DONE) License diff severity classification
* (DONE) Version bump gating with bypass mechanism
* Auto-detect dependency impact graph weighting
* Fallback mirror to enable `git subtree` if upstream layout stabilizes
* Security vulnerability scanning integration
* Automated compatibility testing triggers

## Nx Targets

Two convenience targets were added in `project.json`:

| Target | Command | Description |
|--------|---------|-------------|
| `sync:dry` | `bash scripts/sync-cortex-code.sh` | Dry-run vendor diff |
| `sync:run` | `bash scripts/sync-cortex-code.sh --run` | Apply vendor update |

Example:

```bash
nx run cortex-code:sync:dry
nx run cortex-code:sync:run
```

## Unmerged Branch Guard

Before applying a real sync the script scans other local branches for unmerged changes
that touch `apps/cortex-code/`. If any are found it aborts (exit code 4) to avoid
overwriting divergent local work. Pass `--ignore-unmerged` to bypass (not recommended
unless you understand the risk).

---
Last updated: (see git history)
