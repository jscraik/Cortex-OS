# Security Agent (LlamaGuard)

- Purpose: Evaluate prompts/responses/tool-calls for security risks (OWASP LLM-10, ATT&CK/ATLAS, CWE/CAPEC, D3FEND).
- Capability: `security`

## Inputs

- `content`: string (required)
- `phase`: prompt|response|tool
- `context`: { capability?, toolsAllowed?, egressAllowed?, piiPolicy? }
- `riskThreshold`: low|medium|high (default medium)
- `seed`: number (optional)
- `maxTokens`: number (optional, hard‑capped at 4096)

## Outputs

- `decision`: allow|flag|block
- `risk`: low|medium|high|critical
- `categories`: string[]
- `findings[]`: { id, title, description, refs[], severity }
- `mitigations[]`, `labels{ owasp_llm10[], mitre_attack[], mitre_atlas[], cwe[], capec[], d3fend[] }`
- `confidence`, `processingTime`

## Limits & Policies

- Token cap: `maxTokens ≤ 4096`
- Determinism: optional `seed`
- Timeouts: default 20s

## Events & Errors

- Emits dependabot config events (if found)
- `agent.failed` includes `errorCode`/`status` when provider errors occur

## Memory

- Outbox → MemoryStore with `redactPII` default true

## Recommended Models

- `models/llamaguard-mlx.md`
