---
trigger: always_on
alwaysApply: true
---
# 🔄 Agentic Coding Workflow (Oct 2025)

This workflow governs all agentic and brAInwav development activities. It aligns with current industry
standards for AI-powered and collaborative software development, combining clear research, planning, implementation,
review, verification, monitoring and archiving steps. **All documentation, artifacts and context for each task must
be stored in `~/tasks/[feature]/`, organized into subfolders and files named for the feature.**

> **Authority & Enforcement**
> - This workflow inherits the Governance Pack (`/.cortex/rules/*`) and `CODESTYLE.md`.
> - CI blocks merges if required evidence is missing or rules are violated.
> - Cross-refs: **Code Review Checklist** (`/.cortex/rules/code-review-checklist.md`), **Agentic Coding Workflow** (this file), **Time Freshness Guard** (`/.cortex/rules/_time-freshness.md`).

---

## 0. Tasks

- **Operate on a task basis:** Treat each feature, bugfix or enhancement as a discrete, context-rich task.
  Use descriptive slugs (e.g., `copilot-enhancement`, `brainwav-integration`) to identify tasks.
- **Store context:** Maintain notes, RAID logs and artifacts in Markdown files within `~/tasks/[feature]/`.
  Persist data via MCP/REST APIs when needed, never storing unencrypted secrets or PII.
- **Continuous context:** Each task folder forms a complete audit trail of research, planning, implementation,
  review, testing and monitoring.

### 0.1 Preflight Guards & Governance Hooks (mandatory)

- **Time Freshness Guard:** Anchor reasoning to the harness-provided timezone and "today". Convert relative dates
  to **ISO-8601** in specs, PRs, and user-visible docs (`/.cortex/rules/_time-freshness.md`).
- **Vibe Check MCP (Oversight):** After planning and **before any file writes, network calls, or long runs**,
  call `vibe_check` (configured via `VIBE_CHECK_HTTP_URL`, default `http://127.0.0.1:2091`). Attach logs containing
  `"brAInwav-vibe-check"` to the task folder and the PR. Missing logs **blocks** merge.
- **Local Memory parity:** On each decision/refactor/rectification, append rationale + evidence to
  `.github/instructions/memories.instructions.md` **and** persist via Local Memory **MCP/REST dual-mode**.
  Reviewers confirm entries exist (see `docs/local-memory-fix-summary.md`).
- **Secrets via 1Password CLI:** Fetch API keys, SSH keys, and tokens on-demand with the 1Password CLI (`op`);
  never persist these secrets in dotfiles, long-lived env vars, or repository artifacts.
- **Hybrid Model — Live-Only Rule:** Embeddings, rerankers, and generations must use **live engines** only
  (MLX, Ollama, or approved Frontier). **No stubs, no recorded outputs, no "dry_run" modes.**
  Pre-merge run `pnpm models:health && pnpm models:smoke`; attach logs (model IDs, vector norms/shape, latency).
  If live engines unavailable, mark task **blocked** and escalate per Constitution.
- **Branding in logs/errors:** All new/changed logs/errors must include `"[brAInwav]"` and structured fields
  `brand:"brAInwav"`, request/run IDs. Missing branding is a policy violation.

---

## Task Analysis & Quality Requirements

- **RAID analysis:** Identify Risks, Assumptions, Issues and Dependencies
  [oai_citation:0‡smartsheet.com][raid-def]; keep an up-to-date RAID log in `~/tasks/[feature]/`
  [oai_citation:1‡smartsheet.com][raid-how].
- **Optional frameworks:** SOAR or NOISE for opportunity-focused analysis.
- **Define quality gates & guardrails:** At task inception, specify non-functionals (security, performance,
  reliability, compliance). Set quality gates [oai_citation:2‡techtarget.com][quality-gate] and guardrails
  [oai_citation:3‡sonatype.com][guardrails] and record them in the task folder.
- **Coverage & mutation targets (repo-wide):** **≥90% global**, **≥95% changed lines**, **≥90% mutation** (where enabled).

---

## 1. Research

- **Semantic code search & reuse analysis.**
- **Discovery:** Identify use cases and feasibility; reduce the high failure rate of AI projects
  [oai_citation:4‡botscrew.com][discovery-phase]. Archive findings under the task.
- **Feasibility spikes:** Time-box spikes [oai_citation:5‡agileanalytics.cloud][tech-spike]; store setup/results.
- **PoC evaluations:** Follow need→ideation→evaluation→design→presentation phases
  [oai_citation:6‡our-thinking.nashtechglobal.com][poc-phases]
  [oai_citation:7‡our-thinking.nashtechglobal.com][poc-step4].
- **Batch evals & guardrails:** Define thresholds for hallucination, accuracy, relevance, bias; include ethics.
- **Hybrid model proofing:** Any measurement that references model outputs must come from **live** MLX/Ollama/Frontier,
  not recorded artifacts. Store sample IDs, model names, and latency in `research/`.

---

## 2. Planning

- **Review research artifacts** in the task folder; build a clear implementation plan.
- **Implementation plan:** Objectives, tasks, dependencies and timelines (MoSCoW or similar).
  Save `implementation-plan.md`.
- **SRS:** Methodology, scope, architecture, technology choices
  [oai_citation:8‡botscrew.com][srs-example]; save `srs.md`.
- **Design:** Diagrams, wireframes, integration maps → `design/`.
- **One-page business case:** Problem/opportunity, solution, benefits, costs, risks.
- **BDD & TDD planning:** Given-When-Then scenarios [oai_citation:9‡qt.io][bdd-behavior] and unit-test
  outlines (red-green-refactor) [oai_citation:10‡qt.io][tdd-test].
- **Governance prep:** Plan to attach in PR:
  - Vibe-check logs, coverage/mutation reports, **Code Review Checklist** (see §4), **models:health/smoke** logs,
  - Accessibility reports (WCAG 2.2 AA), security scans, **branding** spot checks.

### 2.1 Wikidata Fact-Finding Workflow

- **When to invoke:** Any task that gathers, validates, or enriches factual knowledge (product facts, entity metadata,
  relationship graphs, compliance evidence) must follow the documented Wikidata workflow.
- **Canonical playbook:** Reference [`packages/rag/docs/wikidata-integration-usage.md`](../../packages/rag/docs/wikidata-integration-usage.md)
  for required steps, tool invocations, and evidence capture.
- **Evidence expectations:** Plans must enumerate how `executeWikidataWorkflow` and associated MCP vector/claims/SPARQL calls
  will run, how provenance metadata is captured, and where logs/artifacts will live in the task folder.
- **Escalation:** If Wikidata surfaces are unavailable, mark the task **blocked**, record the incident in the task folder, and
  escalate per the Constitution instead of bypassing the workflow.

---

## 3. Implementation

- **Execute TDD:** Write failing tests, implement minimal code, refactor
  [oai_citation:11‡qt.io][tdd-cycle]. Track in `implementation-log.md`.
- **BDD acceptance tests:** Implement scenarios as planned
  [oai_citation:12‡qt.io][tdd-bdd-choice].
- **Follow CODESTYLE (hard checks, prod paths):**
  - **Named exports only** (no default); **≤40 lines per function**; ESM; **strict types at boundaries**.
  - `async/await` with **`AbortSignal`** for cancelable I/O; never swallow errors (attach `cause`).
  - **No `any`** in production code (tests/justified compat shims only).
  - **No ambient randomness/time** in core logic; inject seeds/clocks.
  - **No cross-domain imports**; use declared interfaces (A2A topics, MCP tools/resources/prompts).
- **Absolute prohibitions (prod paths):** `Math.random()` fabricating data; placeholder adapters;
  `TODO/FIXME/HACK`; `console.warn("not implemented")`; fake/recorded telemetry; "will be wired later/follow-up".
- **Security & supply chain:** Use env/secret managers; **no hard-coded secrets**.
  Semgrep (block ERROR), gitleaks (block ANY), OSV clean per lockfile, CycloneDX SBOM, SLSA/in-toto provenance.
- **Env & config:** Use shared loader (`scripts/utils/dotenv-loader.mjs` or `@cortex-os/utils`);
  **never** call `dotenv.config()` directly. Don't raise `pnpm childConcurrency`/Nx parallelism beyond mitigations.
- **Observability:** Structured logs with `brand:"brAInwav"`, request/run IDs; OTel traces/metrics.

---

## 4. Review, Testing, Validation & Monitoring

- **Comprehensive testing:** Unit, integration, system, acceptance, accessibility, security, performance.
  Store artifacts under `test-logs/` or `validation/`.
- **Code Review (enforced):**
  - A **human reviewer who is not the PR author** must complete `/.cortex/rules/code-review-checklist.md`.
  - Paste a filled copy as a **top-level PR comment** and link it in the PR description:
    `CODE-REVIEW-CHECKLIST: /.cortex/rules/code-review-checklist.md`.
  - **BLOCKER** items must be PASS; **MAJOR** need fixes or a Constitution waiver; **MINOR** require a follow-up task.
  - Include evidence pointers (`file://path:line-range`, logs/trace IDs, screenshots, URLs).
- **CI/CD & deployment validation:** IaC, rollbacks, and promotion checks
  [oai_citation:13‡zeet.co][deploy-post] [oai_citation:14‡zeet.co][deploy-ci].
- **HITL for high-stakes:** Record decisions and rationale in `HITL-feedback.md`.
- **Refactor continuously:** Plan small, incremental improvements
  [oai_citation:15‡teamhub.com][refactor-def]
  [oai_citation:16‡teamhub.com][refactor-need].

---

## 5. Verification (gate to merge)

- **Quality gates:** `pnpm lint`, `pnpm test`, `pnpm security:scan`; archive results in `verification/`.
- **Coverage & mutation:** **≥90% global**, **≥95% changed lines**, **≥90% mutation** (where enabled).
- **Structure & A11y:** `pnpm structure:validate`; include a11y & i18n tests; attach axe/jest-axe reports.
- **Hybrid model live-only checks:** `pnpm models:health && pnpm models:smoke`; attach logs showing **live** MLX/Ollama/Frontier engines (model IDs, vector norms/shape, latency).
- **Branding verification:** Confirm logs/errors include `[brAInwav]` and structured `brand:"brAInwav"`.
- **Mock production claims audit:** Ensure no prod-readiness claims if fake data/mocks/TODOs/placeholder code exists.
- **Vibe-check evidence:** Confirm `"brAInwav-vibe-check"` logs at plan→act gates.
- **Checklists present:** CI fails if the Code Review Checklist token or top-level comment is missing.

---

## 6. Monitoring, Iteration & Scaling

- **Active monitoring:** Dashboards and log analysis; track performance, cost, user metrics.
- **Iterate:** Respond to feedback/incidents; update tests, monitoring hooks, docs.
- **Model lifecycle:** Log drift detection and retraining activities in `monitoring/`.
- **Scale & optimize:** Record efficiency improvements and their impact.

---

## 7. Archive

- **Archive artifacts:** Final SRS, diagrams, plans, test logs, HITL feedback, refactors, verification reports,
  monitoring logs, and the task summary remain under `~/tasks/[feature]/` (flagged archived).
- **PR audit trail:** On merge, CI mirrors the filled review checklist to
  `.cortex/audit/reviews/<PR_NUMBER>-<SHORT_SHA>.md`.
- **Ensure traceability:** The archived task folder must enable reproducibility, auditability, and future agent learning.

[raid-def]: https://www.smartsheet.com/content/raid-project-management#:~:text=In%20project%20management%2C%20RAID%20stands,communication%20throughout%20the%20project%20lifecycle
[raid-how]: https://www.smartsheet.com/content/raid-project-management#:~:text=How%20to%20Do%20a%20RAID,Analysis
[quality-gate]: https://www.techtarget.com/searchsoftwarequality/definition/quality-gate#:~:text=A%20quality%20gate%20is%20a,to%20be%20addressed%20and%20resolved
[guardrails]: https://www.sonatype.com/blog/less-gates-more-guardrails-devsecops-lessons-learned-in-2017#:~:text=More%20guardrails
[discovery-phase]: https://botscrew.com/blog/discovery-phase-crafting-effective-ai-agent-project-roadmap/#:~:text=In%20the%20rapidly%20evolving%20landscape,to%20build%20resilient%20AI%20initiatives
[tech-spike]: https://www.agileanalytics.cloud/blog/what-is-a-spike-in-agile#:~:text=In%20Agile%20software%20development%2C%20a,before%20committing%20to%20full%20implementation
[poc-phases]: https://our-thinking.nashtechglobal.com/insights/proof-of-concept-phases#:~:text=What%20Are%20Proof%20of%20Concept,Phases
[poc-step4]: https://our-thinking.nashtechglobal.com/insights/proof-of-concept-phases#:~:text=%23%20Step%204%20,the%20Proof%20of%20Concept
[srs-example]: https://botscrew.com/blog/discovery-phase-crafting-effective-ai-agent-project-roadmap/#:~:text=Example%20Outcome%3A%20The%20AI%20Agent,Project%20Roadmap
[bdd-behavior]: https://www.qt.io/quality-assurance/blog/tdd-vs-bdd-comparison-testing-approaches#:~:text=Behavior
[tdd-test]: https://www.qt.io/quality-assurance/blog/tdd-vs-bdd-comparison-testing-approaches#:~:text=Test
[tdd-cycle]: https://www.qt.io/quality-assurance/blog/tdd-vs-bdd-comparison-testing-approaches#:~:text=Test
[tdd-bdd-choice]: https://www.qt.io/quality-assurance/blog/tdd-vs-bdd-comparison-testing-approaches#:~:text=TDD%20vs%20BDD%3A%20Making%20the,Choice%20for%20Your%20Project%27s%20Success
[deploy-post]: https://zeet.co/blog/deployment-automation#:~:text=Post,Solid%20Foundation
[deploy-ci]: https://zeet.co/blog/deployment-automation#:~:text=Continuous%20Integration%20
[refactor-def]: https://teamhub.com/blog/understanding-refactoring-techniques-in-software-development/#:~:text=Refactoring%2C%20in%20simple%20terms%2C%20refers,enhance%20readability%2C%20maintainability%2C%20and%20performance
[refactor-need]: https://teamhub.com/blog/understanding-refactoring-techniques-in-software-development/#:~:text=Identifying%20the%20Need%20for%20Refactoring