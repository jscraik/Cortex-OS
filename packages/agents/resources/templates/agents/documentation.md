# Documentation Agent

- Purpose: Generate documentation (API, README, tutorials) in requested formats.
- Capability: `documentation`

## Inputs

- `sourceCode`: string (required)
- `language`: javascript|typescript|python|java|go|rust|csharp|php|ruby
- `documentationType`: api|readme|tutorial|reference|guide
- `outputFormat`: markdown|html|rst|docstring|jsdoc
- `includeExamples`: boolean (default true)
- `includeTypes`: boolean (default true)
- `audience`: developer|end-user|technical-writer|beginner (default developer)
- `style`: formal|casual|tutorial|reference (default formal)
- `detailLevel`: minimal|standard|comprehensive (default standard)
- `seed`: number (optional)
- `maxTokens`: number (optional, hard‑capped at 4096)

## Outputs

- `sections[]`: title, type, content, examples[], parameters[], returnType?
- `format`, `language`, `documentationType`
- `metadata`: generatedAt, wordCount, sectionsCount, hasExamples, hasTypes, complexity?, hasAsyncOperations?, hasErrorHandling?
- `confidence`, `processingTime`

## Limits & Policies

- Token cap: `maxTokens ≤ 4096`
- Determinism: optional `seed`
- Timeouts: default 45s

## Events & Errors

- Lifecycle events (ISO‑8601)
- `agent.failed` includes `errorCode`/`status` on provider errors

## Memory

- Outbox → MemoryStore with `redactPII`

## Recommended Models

- `models/gpt-oss-20b-mlx.md`
- `models/smollm-135m-mlx.md`
