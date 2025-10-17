# Task Management ↔ PRP Runner Integration Guide

**Last Updated:** 2025-10-16

This guide explains how Cortex-OS task folders, batons, and the PRP runner now cooperate. Follow these steps to transform a task plan into a fully-audited Product→Automation run.

## 1. Prerequisites

- Populate the task directory under `~/tasks/<task-slug>/` using `pnpm cortex-task init` and `pnpm cortex-task plan`.
- Ensure the baton contract lives at `~/tasks/<task-slug>/json/baton.v1.json` (or provide a custom path via `--baton`).
- Install workspace dependencies and build PRP runner artifacts once:

```bash
pnpm install
pnpm --filter @cortex-os/prp-runner build
```

## 2. Triggering PRP Runner for a Task

Use the enhanced CLI to execute the PRP pipeline directly from a baton:

```bash
pnpm cortex-task prp-run --slug integrate-task-management-prp-runner
```

Flags:

- `--slug <task-slug>` — default lookup inside repository, `~/tasks`, and `~/.Cortex-OS/tasks`.
- `--baton <path>` — overrides discovery; supports `~` expansion.
- `--dry-run` — displays the derived blueprint and metadata without running PRP.

On success the command prints both the generated `prp.md` and the run-manifest path under `.cortex/run-manifests/`.

## 3. How Metadata Flows

1. **Baton ingestion:** `loadTaskBaton` parses the JSON contract and normalises plan paths, constraints, and testing targets.
2. **Blueprint synthesis:** `buildPrpBlueprint` converts the baton into a PRP blueprint with requirements, stack hints, and plan paths embedded in metadata.
3. **Manifest augmentation:** `augmentManifest` adds `taskId`, `priority`, and `specPath` to the run manifest and stores task metadata under `blueprint.metadata.task`.

This ensures downstream tooling (PRP CLI, proof-artifacts, dashboards) can link run outputs back to the originating task.

## 4. CI Expectations

- The `.github/workflows/prp-task-ci.yml` workflow runs lint, type-check, and targeted tests whenever task automation files or PRP runner code change.
- Provide evidence logs (PRP run output, manifest JSON) in PR descriptions following the governance checklists.

## 5. Troubleshooting

| Symptom | Resolution |
| --- | --- |
| `Unable to locate baton` | Pass `--baton` with an absolute path or verify the slug directory exists under `~/tasks`. |
| `Remote inspection failed` warning | Configure `origin` with `git remote add origin <url>` or ignore if running offline. |
| PRP build errors | Run `pnpm --filter @cortex-os/prp-runner build` and inspect `packages/prp-runner/dist/` for compilation issues. |

## 6. Next Steps

- Capture new decisions in `.github/instructions/memories.instructions.md` with Local Memory IDs.
- Attach manifest excerpts and command output to the PR following the Code Review Checklist.
- Iterate on task plans with updated batons to maintain a single source of truth.
