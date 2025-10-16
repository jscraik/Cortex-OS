# @cortex-os/prp-runner

**Last Updated:** 2025-10-16

PRP Runner orchestrates the Product→Automation gating pipeline for Cortex-OS. This package now ingests task batons so that plans, TDD artefacts, and manifests stay aligned.

## Key Features

- Converts task batons into PRP blueprints via `buildPrpBlueprint`.
- Augments run manifests with task metadata (`taskId`, `priority`, `specPath`).
- Exposes `loadTaskBaton` for CLI tooling and automation.
- Writes PRP markdown plus run-manifest JSON under `.cortex/run-manifests/`.

## Usage

### Programmatic

```ts
import { buildPrpBlueprint, augmentManifest, loadTaskBaton, runPRPWorkflow } from '@cortex-os/prp-runner';

const baton = await loadTaskBaton('~/tasks/example/json/baton.v1.json');
const { blueprint, metadata } = buildPrpBlueprint(baton);
const { manifest, manifestPath } = await runPRPWorkflow(blueprint, repoInfo, options);
const enriched = augmentManifest(manifest, metadata);
```

`enriched` now carries task identifiers so downstream tools (proof artifacts, dashboards) can trace evidence back to the originating plan.

### CLI via `cortex-task`

```bash
pnpm cortex-task prp-run --slug example-task
```

- Defaults to strict mode and writes outputs into `.cortex/run-manifests/`.
- Pass `--dry-run` to preview blueprint metadata without executing gates.
- Use `--baton <path>` when the baton lives outside the standard directory structure.

## Testing

```bash
pnpm --filter @cortex-os/prp-runner lint
pnpm --filter @cortex-os/prp-runner typecheck
pnpm --filter @cortex-os/prp-runner test
```

Coverage gates remain ≥92% global / ≥95% changed lines, consistent with `packages/prp-runner/AGENTS.md`.

## Related Documentation

- [`docs/task-prp-integration.md`](../../docs/task-prp-integration.md)
- `.github/workflows/prp-task-ci.yml` for affected CI automation
- `.github/instructions/memories.instructions.md` for decision history
