# User Guide

## Running a Gate

1. Define a `gate.config.json` with desired suites.
2. Implement dependency factories for each suite.
3. Call `runGate(config, deps)` and inspect the returned `GateResult`.

## Keyboard Shortcuts

N/A – the library exposes no interactive UI.

## Everyday Workflow

- Add or adjust suites as features evolve.
- Store results in CI artifacts to track quality over time.
