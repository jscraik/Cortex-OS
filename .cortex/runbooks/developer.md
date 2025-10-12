# Developer Runbook

## Bootstrap

```bash
mise install           # install pinned toolchain
corepack enable
pnpm install
pnpm build
pnpm test
```

## Add a new package

```bash
nx g @nx/js:library --name=orchestration --directory=packages
```

## Python app

```bash
cd apps/cortex-py
uv sync
uv run pytest -q
```

## Rust TUI

```bash
cd apps/cortex-tui
cargo build --release
cargo run
```

## Bun pilot (local)

```bash
bun install
bun run -T nx run-many -t test --parallel
```

### Keyboard tips

- Nx graph: `pnpm graph`, open in browser, use `?` for keys.
- Terminal: prefer `Ctrl-C` to stop Nx runners; arrow keys navigate Nx prompts.

### Accessibility flags

- Do not rely on color-only status in TUI. Provide text labels in ratatui.
- Ensure CI logs include explicit PASS/FAIL text.
- Provide `--plain` CLIs where possible for screen readers.

## Memory promotion tuning (dev)

- Use short TTLs locally: `MEMORY_SHORT_TERM_TTL_MS=15000` keeps promotion loops fast for tests.
- Drop the auto-promotion bar with `MEMORY_SHORT_TERM_PROMOTION_IMPORTANCE=6` only while reproducing promotion issues; reset to `8` before merging.
- Tail logs for `brAInwav short-term memory cleanup removed` to confirm expiry cadence and `brAInwav memory_layer backfill completed` after tweaks.
