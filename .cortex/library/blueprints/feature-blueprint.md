# apps/cortex-os/blueprints/feature-blueprint.template.md

---

id: [ID]
title: "[FEATURE_NAME] — Blueprint"
version: "[YYYY-MM-DD].[INC]"
scope: "[SCOPE]"
surfaces: [ ]
standards: ["a11y","security","obs"]
owner: ["@github-handle"]
labels: ["feature","a11y","security","policy","obs"]
---

## 0) What / Why / Where / How / Result

- **What:** [WHAT]
- **Why:** [USER_VALUE / KPI]
- **Where:** [SURFACES]
- **How:** [HIGH-LEVEL_APPROACH]
- **Result:** [MEASURABLE_OUTCOME]

---

## 1) Inputs → Outputs (Contracts)

- **Inputs schema:** `schemas/[slug].input.schema.ts`  
- **Outputs schema:** `schemas/[slug].output.schema.ts`  
- **Events:** `[slug].*` (OpenTelemetry spans)

```ts
// schemas/[slug].input.schema.ts
import { z } from "zod";
export const [SLUG]Input = z.object({
  id: z.string().uuid(),
  payload: z.string().min(1)
});
export type T[SLUG]Input = z.infer<typeof [SLUG]Input>;
```

```ts
// schemas/[slug].output.schema.ts
import { z } from "zod";
export const [SLUG]Output = z.object({
  id: z.string().uuid(),
  status: z.enum(["ok","error"]),
  message: z.string().optional(),
  evidence: z.array(z.object({ locator: z.string(), range: z.tuple([z.number(), z.number()]) })).optional()
});
export type T[SLUG]Output = z.infer<typeof [SLUG]Output>;
```

---

## 2) Policy (Default-deny)

- File: `config/[slug].policy.json`
- Scopes: fs, net, tools
- Budgets: tokens, time_ms, usd
- Egress allowlist
- PII and secret scans

```json
{
  "enabled": false,
  "budgets": { "tokens": 6000, "time_ms": 120000, "usd": 0.50 },
  "scopes": { "fs": ["./workspace/**"], "net": [], "tools": [] },
  "egress_allowlist": [],
  "pii_scan": true,
  "secret_scan": true,
  "license_blocklist": ["Proprietary-Forbidden"]
}
```

---

## 3) Architecture

- **Agents/Sub-agents or Connector:** `src/agents/[slug].ts` or `src/connectors/[slug]/index.ts`
- **Router touchpoints:** `src/router/*`
- **RAG usage:** [YES/NO]. If yes, cite `retrieval.policy`.
- **State:** SQLite WAL, snapshots, rollback notes.

ASCII diagram:

```txt
[CLI/Glass] -> [Controller] -> [Agent [slug]] -> [Adapters/Connectors] -> [Outputs + Evidence]
                                   | policy.enforce | a11y hooks | obs spans
```

---

## 4) UX and A11y (settings-activated)

- Setting: `feature.[slug].enabled` default false
- CLI bindings: `/` command `[slug]`, digits `1–9` open evidence, `Enter` run, `Esc` close, `Ctrl-/` help
- Glass: ARIA roles, focus order, live region announcements
- Terminal: color contrast, screen reader text
- Copies: simplified language option

---

## 5) Security and Privacy

- Threats: [LIST]
- Mitigations: scopes, budgets, consent logs, audit hashes
- Data: retention `[DAYS]`, export/delete path
- SBOM: generated in CI

---

## 6) Observability

- Metrics: tokens, cost_usd, latency_p50/p95, error_rate
- Traces: `feature.[slug].*`
- Logs: redacted; link correlation ids
- Alerts: budgets, policy breaches

---

## 7) Implementation Plan (gated)

1. **G0 Scaffold:** folders, schemas, policy file  
2. **G1 Policy:** validate policy in CI, deny by default  
3. **G2 Schemas:** Zod types, codegen clients  
4. **G3 Core Impl:** neuron/connector minimal path  
5. **G4 A11y:** keyboard map, ARIA checks, CLI snapshots  
6. **G5 Security:** Semgrep, CodeQL, gitleaks, OSV clean, Mitre Atlas, SBOM, provenance, retention
7. **G6 Obs:** OTel spans, redaction, dashboards stub  
8. **G7 Docs:** usage, flags, ADR, changelog

---

## 8) Tests

- Unit: happy path, errors, policy denial
- Integration: router, adapters, budgets
- Determinism: snapshot of outputs
- A11y: axe for Glass, CLI snapshot a11y
- Security: scanners pass

```ts
// tests/[slug].policy.test.ts
import { validatePolicy } from "../src/policy/enforce";
test("disabled by default", async () => {
  await expect(validatePolicy("[slug]", { requireEnabled: true })).rejects.toThrow();
});
```

---

## 9) CI

- Workflow: `.github/workflows/[slug].yml`
- Jobs: build, test, test:a11y, test:security, sbom, provenance
- Block on failures

---

## 10) Flags and CLI

- Config: `feature.[slug].enabled`
- CLI: `--[slug]:on|off`, `--budget.tokens`, `--budget.time`
- Env: `CORTEX_[SLUG]_ENABLED=0|1`

---

## 11) Risks, Trade-offs, Rollback

- Risks: [COST/PRIVACY/DRIFT]
- Trade-offs: [LATENCY vs QUALITY]
- Rollback: disable flag, revert policy, restore snapshot

---

## 12) Deliverables

- Code, schemas, policy, tests, CI
- Docs: `docs/adr/NNN-[slug].md`, usage guide
- Changelog and SemVer bump

---

## 13) Standards Check

- A11y: WCAG 2.2 AA, ARIA APG items ticked
- Security: OWASP ASVS, OWASP LLM Top-10 mapped, Mitre Atlas, OSV clean, gitleaks
- Eng: SemVer, Conventional Commits, lint rules, EditorConfig, CI passes
- Privacy: GDPR compliance, data retention and deletion
- Observability: OpenTelemetry spans, key metrics, dashboards
- Data/APIs: JSON Schema, OpenAPI if HTTP
- Recency check before ship: libs and standards

---

## 14) Appendix

- Keyboard map: [LIST]
- Telemetry fields: [LIST]
- Example payloads:

```json
{"id":"[UUID]","payload":"[INPUT]"}
```

```json
{"id":"[UUID]","status":"ok","message":"[MSG]","evidence":[{"locator":"[PATH|URL]","range":[1,10]}]}
```
