# Hybrid Knowledge Playbook — Wikidata Workflow Integration

This playbook explains how Cortex-OS teams should apply the Wikidata hybrid knowledge workflow described in [`packages/rag/docs/wikidata-integration-usage.md`](../../packages/rag/docs/wikidata-integration-usage.md). Use it to decide when to invoke the remote workflow, which MCP tools are mandatory, and how to capture provenance and evidence.

## When to Invoke the Wikidata Workflow

- **Evidence-first guardrails** — Trigger `executeWikidataWorkflow` whenever a fact-finding task cannot be satisfied by approved local stores or when governance requires third-party corroboration.
- **Scope routing signals** — If `routeFactQuery` recommends the Wikidata connector for scopes `facts`, `properties`, `entities`, or `claims`, the workflow must run end-to-end before any LLM answer is produced.
- **Freshness or authority gaps** — Invoke the workflow when local bundles lack freshness metadata, when provenance hashes are missing, or when analysts flag low-confidence sources.
- **Regulated outputs** — Legal, compliance, or safety reviews must include at least one live Wikidata execution with full provenance.
- **Post-incident remediation** — All corrective tasks responding to knowledge drift, stale answers, or citation gaps must ship with new Wikidata workflow evidence.

## Required MCP Tools

`executeWikidataWorkflow` must have access to the following MCP tools, matching the usage guide:

1. `vector_search_items` — Seeds candidate entities with embeddings and similarity metadata.
2. `get_claims` — Retrieves structured statements, qualifiers, and claim identifiers for provenance.
3. `sparql` — Runs contextual SPARQL enrichment queries when `enableSparql` is requested.

> ⚠️ **Do not** replace these tools with stubs in production environments. Stubs are only permitted inside AgentMCPClientStub parity tests.

## Provenance Logging Expectations

- **Structured logs** — All workflow executions must emit structured logs with `brand:"brAInwav"`, `connector:"wikidata"`, and the invoked tool names. Include query text hashes, returned QIDs, claim IDs, and SPARQL endpoints.
- **Correlation IDs** — Propagate task-level correlation IDs (`taskId`, `workflowRunId`) through every tool call and include them in logs and CloudEvents envelopes.
- **Error capture** — Log retries, backoffs, and failures with explicit tool identifiers and remaining attempts.
- **Storage** — Archive raw JSON logs or NDJSON in the associated task folder alongside analysis notes. Retain logs for audit per governance policy.

## Evidence Storage Requirements

- **Task folders** — Store workflow outputs (vector search responses, claims, SPARQL results) inside the task folder defined by `/.cortex/rules/TASK_FOLDER_STRUCTURE.md`.
- **Canonical filenames** — Use the pattern `evidence/wikidata/<timestamp>-<slug>.json` for serialized responses and `logs/wikidata/<timestamp>-workflow.ndjson` for execution logs.
- **Linking** — Reference evidence files in design docs, TDD plans, and PR descriptions. Cite precise timestamps and hashes when summarizing results.
- **Review gate** — Reviews and governance checkpoints may not proceed without attached Wikidata evidence that matches the logged workflow runs.

Follow this playbook whenever the hybrid knowledge workflow is part of your feature or remediation plan. Deviations require a governance waiver documented in the task folder.
