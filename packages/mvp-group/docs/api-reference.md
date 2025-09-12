# API Reference

### `runPRPWorkflow(orchestrator, blueprint, options?)`
Runs the PRP pipeline.

- `orchestrator` – implementation of `PRPOrchestrator`
- `blueprint` – `{ title, description, requirements[] }`
- `options` – optional `RunOptions` for IDs and determinism

Returns a final `PRPState` with validation results and metrics.
