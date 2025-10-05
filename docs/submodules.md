# Submodules

The Cortex-OS repository no longer tracks any Git submodules. Historical references to
`external/openai-codex` have been retired in favour of an explicit vendor workflow.

## Current workflow

Use `scripts/sync-cortex-code.sh` to mirror the upstream Rust crates from
[`openai/codex`](https://github.com/openai/codex) into `apps/cortex-code/`.

Dry-run (inspect differences only):

```bash
./scripts/sync-cortex-code.sh
```

Apply an update:

```bash
./scripts/sync-cortex-code.sh --run
```

See [`apps/cortex-code/UPSTREAM_SYNC.md`](../apps/cortex-code/UPSTREAM_SYNC.md) for
end-to-end documentation of the sync guardrails, including cache layout, branch naming,
and validation hooks.

## CI considerations

- Standard clones (`git clone`) are sufficient; no `--recurse-submodules` flag is
  required.
- Workflows invoking the sync script should run it in dry-run mode first to gather
  metrics without mutating the working tree.

## Governance notes

- Vendor updates remain subject to license and security review.
- Copy only the files required for Cortex-OS operation and follow attribution
  requirements outlined in `apps/cortex-code/UPSTREAM_SYNC.md`.
- If a new submodule ever becomes necessary, update this document and obtain approval
  from the maintainers before landing the change.
