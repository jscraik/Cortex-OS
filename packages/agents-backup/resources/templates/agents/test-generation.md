# Test Generation Agent

- Purpose: Generate comprehensive tests (unit/integration/e2e/property) with coverage analysis.
- Capability: `test-generation`

## Inputs

- `sourceCode`: string (required)
- `language`: javascript|typescript|python|java|go|rust|csharp
- `testType`: unit|integration|e2e|property
- `framework`: vitest|jest|mocha|pytest|unittest|rspec|junit|testng|go-test
- `includeEdgeCases`: boolean (default true)
- `coverageTarget`: number 0..100 (default 90)
- `mockingStrategy`: minimal|comprehensive|auto (default auto)
- `assertionStyle`: expect|assert|should (default expect)
- `seed`: number (optional)
- `maxTokens`: number (optional, hard‑capped at 4096)

## Outputs

- `tests[]`: name, code, type, description?
- `framework`, `language`, `testType`
- `coverage`: estimated, branches[], uncoveredPaths[]
- `imports`, `setup?`, `teardown?`, `confidence`, `testCount`, `analysisTime`

## Limits & Policies

- Token cap: `maxTokens ≤ 4096` (enforced)
- Determinism: optional `seed`
- Timeouts: default 30s

## Events & Errors

- Lifecycle events with ISO timestamps
- `agent.failed` includes `errorCode`/`status` when provider fails

## Memory

- Outbox → MemoryStore with `redactPII` default true

## Recommended Models

- `models/gpt-oss-20b-mlx.md`
- `models/smollm-135m-mlx.md`
