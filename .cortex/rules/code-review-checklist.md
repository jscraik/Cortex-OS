---
trigger: always_on
alwaysApply: true
---
# Code Review Checklist (General + AI + Expanded)

> **Severity legend:**  
> **[BLOCKER]** must be PASS before merge. **[MAJOR]** fix or obtain Constitution waiver. **[MINOR]** follow-up task allowed.

## 0. Preconditions & Governance

- [ ] **[BLOCKER] Human reviewer (non-author):** This checklist is completed and posted by a human who is **not** the PR author.
- [ ] **[BLOCKER] AGENTS.md acknowledged:** Nearest `AGENTS.md` loaded; PR/logs include `AGENTS_MD_SHA:<sha>` and section IDs cited where rules apply.
- [ ] **[BLOCKER] Vibe-check evidence:** Logs include `brAInwav-vibe-check` for plan→act gates.
- [ ] **[BLOCKER] Time Freshness Guard:** Dates in PR/specs are anchored to harness "today" and expressed in ISO-8601; no ambiguous "yesterday/last week".
- [ ] **[MAJOR] Phase machine honored:** No `human_input` usage before **REVIEW** phase; phase tokens present (`PHASE_TRANSITION:*`).

## 1. Author Preparation

- [ ] **Self-review done;** tests run locally; PR description is clear and scoped.
- [ ] **Small, focused change;** no unrelated concerns mixed.

## 2. Implementation & Design

- [ ] **[BLOCKER] Meets requirements** without unnecessary scope or hidden TODOs.
- [ ] **Simplicity first;** opportunities to de-complexify noted/refactored.
- [ ] **Dependencies & abstraction appropriate;** avoid bloat and license issues.
- [ ] **Correct imports;** unused removed; path aliases sane.
- [ ] **Reuse existing code;** common logic extracted where appropriate.
- [ ] **Design principles:** SOLID where helpful; no premature generalization.
- [ ] **Design artefacts present:** up-to-date wireframes/diagrams/research/TDD plan attached in task folder.
- [ ] **Interface compliance:** MCP/A2A/REST endpoints, versioning, error semantics documented and tested.
- [ ] **Domain boundaries:** **No cross-domain imports**; interactions via declared contracts/schemas only.

## 2.1 brAInwav Constitutional Compliance

- [ ] **[BLOCKER] Branding present:** Logs/errors/health include `"[brAInwav]"` and `brand:"brAInwav"`.
- [ ] **[BLOCKER] No mock prod claims:** No `Math.random()` fabrications, placeholder adapters, hard-coded mocks, fake metrics, or `TODO/FIXME/HACK` in prod paths.
- [ ] **[BLOCKER] Function size ≤ 40 lines** (compose/guard clauses if larger).
- [ ] **[BLOCKER] Named exports only;** no `export default`.
- [ ] **[BLOCKER] No `any` in production** (allowed only in tests/justified compat shims).
- [ ] **Reality Filter:** Generated/inferred content labeled `[Inference]/[Speculation]/[Unverified]` where applicable.
- [ ] **[BLOCKER] Wikidata workflow compliance:** Fact-finding changes use `executeWikidataWorkflow` and approved MCP
      vector/claims/SPARQL tooling with provenance metadata recorded per the Wikidata integration guide.

## 3. Functionality & Logic

- [ ] **Correctness** across happy/edge paths; concurrency/races considered.
- [ ] **User impact** evaluated; demo notes/screenshots if UI/UX-facing.
- [ ] **Rollback plan** documented and tested.
- [ ] **Feature flags** guard risky features.

## 4. Complexity & Readability

- [ ] **Good naming & structure;** files/packages appropriate.
- [ ] **Readable control/data flow.**
- [ ] **Comments explain "why";** stale comments removed.
- [ ] **No commented-out/obsolete code.**
- [ ] **Debug code removed.**

## 5. Error Handling, Logging & Monitoring

- [ ] **Consistent error handling;** no swallowing; use `cause`.
- [ ] **Logging right-sized;** no sensitive data leakage.
- [ ] **Observability:** OTel traces/metrics wired; dashboards/alerts updated.
- [ ] **User messages** clear, actionable.
- [ ] **Alert fatigue check** performed.

## 6. Dependencies, Documentation & Configuration

- [ ] **Docs updated:** READMEs/API/config/design artefacts.
- [ ] **System impacts/back-compat** considered.
- [ ] **[BLOCKER] Secrets/config:** No hard-coded secrets; secure env management.
- [ ] **[BLOCKER] Env loader:** Uses shared loader (`scripts/utils/dotenv-loader.mjs` or `@cortex-os/utils`); **no direct `dotenv.config()`**.
- [ ] **Local Memory compliance:** `.github/instructions/memories.instructions.md` updated; MCP/REST parity observed; oversight log attached when AGENTS files changed.
- [ ] **Vision & layout alignment** (package vision, directory structure, scaffolding).
- [ ] **Build verification** passes locally and in CI.
- [ ] **Migrations:** Idempotent, performant, and tested.
- [ ] **Retention policies** honored.
- [ ] **IaC/Helm** updated where relevant.
- [ ] **Release notes** and **runbooks/IR** updated.
- [ ] **CHANGELOG** and versioning updated as needed.
- [ ] **Co-authored commit** line present when applicable.
- [ ] **Structure guard:** `pnpm structure:validate` passes.

## 7. Security & Supply Chain

- [ ] **[BLOCKER] Scanners clean:** Semgrep (**block ERROR**), gitleaks (**block ANY**), OSV/audit clean for lockfiles.
- [ ] **AuthN/Z correct;** least privilege enforced.
- [ ] **MCP OAuth scopes (Auth0):** `search.read docs.write memory.read memory.write memory.delete`; RBAC + Add-Permissions-in-Token enabled.
- [ ] **Input validation/sanitization** throughout boundaries.
- [ ] **Sensitive data** encrypted and protected.
- [ ] **SBOM & provenance:** CycloneDX generated; SLSA/in-toto attestations present; container images signed (Cosign).
- [ ] **Containers:** Minimal base, pinned digests, non-root, read-only FS, dropped caps.

## 8. Performance & Scalability

- [ ] **Perf impact** measured; regressions avoided.
- [ ] **Opportunities** for improved structures/algorithms noted.
- [ ] **Scalability** considerations documented.

## 9. Usability & Accessibility

- [ ] **User-centric APIs/UI** and docs.
- [ ] **[BLOCKER] Accessibility evidence:** WCAG 2.2 AA verified with axe/jest-axe (reports attached); keyboard/focus order; no color-only signaling.
- [ ] **i18n/l10n:** Strings externalized; date/time/RTL supported.

## 10. Ethics, Responsible AI, and AI Governance

- [ ] **Privacy & non-exploitation** confirmed.
- [ ] **Abuse prevention** mechanisms present.
- [ ] **Inclusiveness & fairness** evaluated; bias mitigated.
- [ ] **Responsible AI docs:** fairness/transparency/robustness/compliance noted.
- [ ] **Model version tracking** (exact IDs) recorded in code/CI/deploy docs.
- [ ] **Reproducibility:** Scripts/configs to recreate inference/training envs.
- [ ] **Explainability artifacts** for complex/AI features.

## 11. Testing, Rollback, & Quality Assurance

- [ ] **[BLOCKER] Coverage gates:** ≥ **90% global** and **95% changed lines**; **mutation ≥ 90%** (where enabled).
- [ ] **Tests fail when code breaks**; negative & boundary tests present.
- [ ] **Maintainable tests** (low brittleness).
- [ ] **Rollback drills** exercised in staging; triggers documented.
- [ ] **Feature toggling** verified.
- [ ] **Branding in tests** validated (`[brAInwav]` in relevant assertions).
- [ ] **Constitutional compliance tests**: no mock prod claims; Reality Filter behaviors covered.

## 12. Hybrid Model Solution — Live-Only Evidence

- [ ] **[BLOCKER] Live engines only:** No stubs/recordings/dry-runs for embeddings/rerankers/generation.
- [ ] **[BLOCKER] Health/smoke logs attached:** `pnpm models:health && pnpm models:smoke` show `MODELS:LIVE:OK` with engine (`mlx|ollama|frontier`), model IDs, vector dims/norms, and latency samples.
- [ ] **[MAJOR] MCP config & ports consistent:** `.well-known/mcp.json` and port registry (3024/3026/3028/39300) validated.

## 13. Collaboration & Communication

- [ ] **Right reviewers** assigned; respectful, reasoned feedback.
- [ ] **Severity labels** (BLOCKER/MAJOR/MINOR) applied in review comments.
- [ ] **Timely reviews** and timezone awareness.
- [ ] **Psychological safety** maintained.
- [ ] **Process metrics** (review time/defects) tracked periodically.
- [ ] **Cross-functional reviews** (security/UX/DevOps/legal) engaged when needed.
- [ ] **Decisions documented** (trade-offs with evidence).
- [ ] **Stakeholder sign-off** where required.
- [ ] **User comms** prepared (release notes, docs, messaging).

---

**Reviewer Signature:** ____________________  **Date (ISO-8601):** __________  
**Checklist Path:** `/.cortex/rules/code-review-checklist.md` (canonical)