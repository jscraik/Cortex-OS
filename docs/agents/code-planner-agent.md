# Code Planner Agent Playbook

<!--
maintainer: brAInwav Development Team
last_updated: 2025-10-15
scope: Planning workflow for code-focused agents (human + LLM)
-->

This playbook defines how Cortex-OS code planners gather context, consult
external knowledge (Wikidata + arXiv), and produce auditable implementation
plans. Follow it whenever you run the planner loop manually or orchestrate a
planning-capable LLM.

> **Authority** — Inherits the Governance Pack (`/.cortex/rules/*`) and
> `AGENTS.md`. CI blocks merges if required artifacts or evidence are missing.

## 1. Preflight Checklist

1. **Time Freshness Guard** — Anchor all reasoning to the harness date (see
   `/.cortex/rules/_time-freshness.md`). Convert relative references to explicit
   ISO-8601 dates in the plan.
2. **Connector health** — Confirm the Wikidata and arXiv MCP servers are reachable *before* gathering evidence:
   ```bash
   curl -sSf ${WIKIDATA_MCP_URL:-http://127.0.0.1:3029}/healthz | tee research/connectors-health.log
   curl -sSf ${ARXIV_MCP_URL:-http://127.0.0.1:3041}/healthz | tee -a research/connectors-health.log
   # or
   npx @cortex-os/mcp-registry test wikidata-1
   npx @cortex-os/mcp-registry test arxiv-1
   ```
   Health failures block planning until resolved or waived.
3. **Oversight (`vibe_check`)** — After drafting the initial plan outline and
   before any file writes or network calls, run:
   ```bash
   pnpm oversight:vibe-check \
     --goal "<task slug>: draft implementation plan" \
     --plan "1. Repo context. 2. Wikidata facts. 3. arXiv prior art. 4. Finalize plan." \
     --session <session-id> --save logs/vibe-check/<task>.json
   ```
   Attach the JSON response and `brAInwav-vibe-check` logs to the task folder and
   PR evidence bundle (per `AGENTS.md §11`).
4. **Local Memory parity** — Persist planning notes to
   `.github/instructions/memories.instructions.md` *and* the Local Memory MCP/REST
   endpoint (see `AGENTS.md §15`).

## 2. Context Gathering Pipeline

| Step | Action | Evidence to store |
| ---- | ------ | ----------------- |
| 1 | Repo + task context | `research/repo-notes.md`, diff summaries |
| 2 | Local Memory search (`pnpm local-memory:check`) | `research/memory-findings.md` |
| 3 | Wikidata workflow (`executeWikidataWorkflow`) | `logs/wikidata/<task>-<timestamp>.json` |
| 4 | arXiv MCP search/download | `logs/arxiv/<task>-search.json`, `logs/arxiv/<task>-paper.pdf` |
| 5 | Update task plan with citations (QIDs, arXiv IDs) | `implementation-plan.md` |

Store artifacts under `~/tasks/<slug>/` and reference them explicitly in the
plan and PR.

## 3. Wikidata Integration (facts, entities, claims)

Use the production workflow in `@cortex-os/rag` to fetch live Wikidata
provenance.

```typescript
import connectors from '../../config/connectors.manifest.json' assert { type: 'json' };
import { executeWikidataWorkflow } from '@cortex-os/rag/integrations/remote-mcp';
import { createAgentMCPClient } from '@cortex-os/rag/stubs/agent-mcp-client';

const connector = connectors.connectors.find((entry) => entry.id === 'wikidata');
if (!connector) throw new Error('Wikidata connector missing');

const client = createAgentMCPClient({
  endpoint: process.env.WIKIDATA_MCP_URL ?? 'http://127.0.0.1:3029/mcp',
  timeout: 30000,
});

const workflow = await executeWikidataWorkflow(
  'What standards govern ISO/IEC 27001 audits?',
  connector,
  {
    mcpClient: client,
    enableClaims: true,
    enableSparql: true,
  }
);

await writeFile(`logs/wikidata/${slug}-${Date.now()}.json`, JSON.stringify(workflow, null, 2));
```

**Planning requirements**
- Record QIDs, SPARQL query fragments, and claim GUIDs in the plan body.
- Summaries must cite the evidence (e.g., `Wikidata QID Q128318` or direct
  claim references).
- If routing decides Wikidata is not required, capture the router’s JSON result
  and justify the exclusion in the plan.

## 4. arXiv Integration (research prior art)

Call the MCP-backed arXiv tools for prior art, benchmarks, or algorithm design.

```typescript
import { createArxivTools } from '@cortex-os/agent-toolkit/mcp/arxiv';

const tools = createArxivTools({
  url: process.env.ARXIV_MCP_URL ?? 'http://127.0.0.1:3041/mcp',
  userAgent: 'brAInwav-CortexPlanner/1.0',
});

const search = await tools.arxiv_search.invoke({
  query: 'retrofitting language models with wikidata constraints',
  field: 'abstract',
  sort_by: 'lastUpdatedDate',
  maxResults: 5,
});

await writeFile(`logs/arxiv/${slug}-${Date.now()}-search.json`, JSON.stringify(search, null, 2));
```

Follow up with `arxiv_download` for PDFs you cite, and store artefacts under the
same `logs/arxiv/` directory. Plans must reference arXiv IDs (`arXiv:YYMM.NNNNN`)
next to any requirements or design decisions informed by the paper.

## 5. Plan Authoring Guidelines

- **Citations inline** — Reference Wikidata QIDs/claims and arXiv IDs next to
  each requirement, assumption, or risk that derives from them.
- **Decision logs** — Mirror critical decisions (and evidence pointers) into the
  task’s `decision-log.md` and Local Memory.
- **Acceptance criteria** — Include validation steps that re-run the same
  Wikidata/arXiv queries so reviewers can reproduce the evidence.
- **Waivers** — If either data source is unavailable, request a waiver (per
  `AGENTS.md §27`) before proceeding.

## 6. Verification Gate

Before handing the plan to implementers:

1. Confirm `logs/wikidata/*.json` and `logs/arxiv/*.json` exist and are cited.
2. Run `pnpm oversight:vibe-check` again if the plan changes materially.
3. Update `implementation-plan.md` and link all evidence.
4. Attach the plan + evidence bundle to the PR, tagging the reviewer responsible
   for the Code Review Checklist.

## 7. Troubleshooting

| Symptom | Resolution |
| ------- | ---------- |
| Wikidata workflow returns 404 | Verify connectors manifest entry and MCP endpoint (`/mcp`). |
| arXiv requests rate-limited | Increase `minIntervalMs` (`createArxivTools` option) or stagger queries. |
| Evidence missing in plan | Add QID/arXiv references and rerun oversight; CI blocks missing citations. |
| Oversight server unavailable | Start it (`npx @pv-bhat/vibe-check-mcp start --http --port 2091`) or escalate for waiver. |

Keep this playbook aligned with `docs/runbooks/vibe-check.md` and update the
examples whenever connector manifests or MCP endpoints change.
