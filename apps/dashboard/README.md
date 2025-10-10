# dashboard (Ops UI)
A11y-first React dashboard for health, logs, traces, metrics, and manual agent controls.

## Quickstart
```bash
pnpm -w --filter apps/dashboard dev
```

## Panels
- **Health** (MCP/A2A/REST status)
- **Logs** (search, filter by runId)
- **Traces** (span tree)
- **Metrics** (counters, rates, durations)
- **Controls** (pause/resume run, retry, drain, “run test flow”)

## A11y & Keyboard
- Global help: `?` / `Ctrl-/`
- Navigate panels: `g`/`G` next/prev
- Open item: `Enter` • Close: `Esc`
- Screen-reader labels present; no color-only signaling.

## Security
- Auth required; role-based access; no secrets in UI.

## Definition of Done
- Live health + metrics; searchable logs; trace drill-down; keyboard-only walkthrough passes Axe checks.

## Test Plan
- [ ] Axe checks pass.
- [ ] Keyboard-only walkthrough documented.
- [ ] Error states visible under failure injection.

> See `CHECKLIST.cortex-os.md` for the full CI gate reference.

