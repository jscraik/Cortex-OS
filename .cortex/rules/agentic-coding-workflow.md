# 🔄 Agentic Coding Workflow (Oct 2025)

This workflow governs all GitHub Copilot and brAInwav development activities.  It aligns with current industry standards for AI‑powered and collaborative software development, combining clear research, planning, implementation, review, verification, monitoring and archiving steps.  **All documentation, artifacts and context for each task must be stored in `~/tasks/[feature]/`, organized into subfolders and files named for the feature.**

## 0. Tasks

- **Operate on a task basis:** Treat each feature, bugfix or enhancement as a discrete, context‑rich task.  Use descriptive slugs (e.g., `copilot-enhancement`, `brainwav-integration`) to identify tasks.
- **Store context:** Maintain notes, RAID logs and artifacts in Markdown files within `~/tasks/[feature]/`.  Persist data via MCP/REST APIs when needed, never storing unencrypted secrets or PII.
- **Continuous context:** Each task’s folder forms a complete audit trail of research, planning, implementation, review, testing and monitoring.

### Task Analysis & Quality Requirements

- **RAID analysis:** Identify Risks, Assumptions, Issues and Dependencies [oai_citation:0‡smartsheet.com](https://www.smartsheet.com/content/raid-project-management#:~:text=In%20project%20management%2C%20RAID%20stands,communication%20throughout%20the%20project%20lifecycle); update the RAID log (kept in `~/tasks/[feature]/`) throughout the lifecycle [oai_citation:1‡smartsheet.com](https://www.smartsheet.com/content/raid-project-management#:~:text=How%20to%20Do%20a%20RAID,Analysis).
- **Optional frameworks:** Use SOAR or NOISE if a more opportunity‑focused analysis is desired.
- **Define quality gates & guardrails:** At task inception, specify non‑functional requirements (security, performance, reliability, compliance).  Set quality gates (predefined criteria) [oai_citation:2‡techtarget.com](https://www.techtarget.com/searchsoftwarequality/definition/quality-gate#:~:text=A%20quality%20gate%20is%20a,to%20be%20addressed%20and%20resolved) and continuous guardrails [oai_citation:3‡sonatype.com](https://www.sonatype.com/blog/less-gates-more-guardrails-devsecops-lessons-learned-in-2017#:~:text=More%20guardrails) and record them in the task folder.

## 1. Research

- **Semantic code search & reuse analysis.**
- **Discovery phase:** Identify use cases, gather requirements, analyse feasibility and ROI, and create a roadmap to reduce the high failure rate of AI projects [oai_citation:4‡botscrew.com](https://botscrew.com/blog/discovery-phase-crafting-effective-ai-agent-project-roadmap/#:~:text=In%20the%20rapidly%20evolving%20landscape,to%20build%20resilient%20AI%20initiatives).  Document findings in `~/tasks/[feature]/`.
- **Feasibility studies:** Apply PIECES (Performance, Information, Economics, Control, Efficiency, Services) assessments and capture results in the task folder.
- **Technical spikes:** Conduct time‑boxed spikes to resolve uncertainties [oai_citation:5‡agileanalytics.cloud](https://www.agileanalytics.cloud/blog/what-is-a-spike-in-agile#:~:text=In%20Agile%20software%20development%2C%20a,before%20committing%20to%20full%20implementation) and save spike documentation (problem statement, setup, results) under `~/tasks/[feature]/`.
- **Proof‑of‑Concept evaluations:** Follow PoC phases—need, ideation, evaluation, design, presentation [oai_citation:6‡our-thinking.nashtechglobal.com](https://our-thinking.nashtechglobal.com/insights/proof-of-concept-phases#:~:text=What%20Are%20Proof%20of%20Concept,Phases) [oai_citation:7‡our-thinking.nashtechglobal.com](https://our-thinking.nashtechglobal.com/insights/proof-of-concept-phases#:~:text=%23%20Step%204%20,the%20Proof%20of%20Concept)—and store PoC artifacts in `~/tasks/[feature]/`.
- **Batch evaluations & guardrails:** Define success thresholds for hallucination, accuracy, relevance and bias, and include compliance/ethics considerations.  Save evaluation reports in the task folder.
- **Documentation:** Record all research outputs—requirements, architectural choices, security/accessibility goals, PoC/spike findings—in `~/tasks/[feature]/`.

## 2. Planning

- **Review research artifacts** stored in `~/tasks/[feature]/` and build a clear implementation plan.
- **Implementation plan:** Break down objectives, tasks, dependencies and timelines (MoSCoW or similar prioritisation) and save `implementation-plan.md` under the task folder.
- **Software Requirements Specification (SRS):** Create an SRS detailing methodology, frameworks, scope, architecture and technology choices [oai_citation:8‡botscrew.com](https://botscrew.com/blog/discovery-phase-crafting-effective-ai-agent-project-roadmap/#:~:text=Example%20Outcome%3A%20The%20AI%20Agent,Project%20Roadmap); store it in `~/tasks/[feature]/`.
- **High‑level architecture:** Produce diagrams, wireframes and integration maps; save these visuals in a `design` subfolder.
- **One‑page business case:** Summarise problem/opportunity, proposed solution, benefits, costs and risks; save in the task folder.
- **Task breakdown:** Decompose the feature into modules and tasks with pseudocode/examples and store in `implementation-checklist.md`.
- **brAInwav requirements:** Plan branding, MCP/A2A integration, security scanning, accessibility (WCAG 2.2 AA), internationalization/localization, monitoring hooks, rollback procedures and AI governance.
- **BDD & TDD planning:** Define Given‑When‑Then acceptance scenarios for BDD [oai_citation:9‡qt.io](https://www.qt.io/quality-assurance/blog/tdd-vs-bdd-comparison-testing-approaches#:~:text=Behavior) and outline TDD unit tests (red‑green‑refactor cycles [oai_citation:10‡qt.io](https://www.qt.io/quality-assurance/blog/tdd-vs-bdd-comparison-testing-approaches#:~:text=Test)).  Store BDD scenarios and TDD outlines in `~/tasks/[feature]/`.

## 3. Implementation

- **Execute the plan:** Follow the implementation checklist stored in the task folder.
- **Apply TDD:** Write failing tests, implement minimal code to pass, then refactor [oai_citation:11‡qt.io](https://www.qt.io/quality-assurance/blog/tdd-vs-bdd-comparison-testing-approaches#:~:text=Test).  Record test files in the repository and document progress in `implementation-log.md`.
- **Use BDD acceptance tests:** Implement tests defined during planning [oai_citation:12‡qt.io](https://www.qt.io/quality-assurance/blog/tdd-vs-bdd-comparison-testing-approaches#:~:text=TDD%20vs%20BDD%3A%20Making%20the,Choice%20for%20Your%20Project%27s%20Success).
- **Adhere to standards:** Use named exports, keep functions ≤ 40 lines, prefer `async/await`, validate inputs, handle errors gracefully, sanitize data, protect secrets and implement fairness/bias mitigations.
- **Observability & guardrails:** Embed logging, metrics and automated security/quality checks.  Note any deviations or findings in the task folder.

## 4. Review, Testing, Validation & Monitoring

- **Comprehensive testing:** Conduct unit, integration, system, acceptance, accessibility, security and performance tests.  Document test results in `~/tasks/[feature]/test-logs/`.
- **CI/CD & deployment validation:** Run pipelines with automated testing, infrastructure-as-code and scalable rollback [oai_citation:13‡zeet.co](https://zeet.co/blog/deployment-automation#:~:text=Post,Solid%20Foundation) [oai_citation:14‡zeet.co](https://zeet.co/blog/deployment-automation#:~:text=Continuous%20Integration%20).  Store deployment validation reports in `validation/`.
- **HITL integration:** For high‑stakes or compliance‑sensitive areas, include human approval steps.  Use frameworks like HULA where AI produces changes, humans review/approve, and feedback informs model tuning.  Record HITL decisions and rationales in `HITL-feedback.md`.
- **Refactor continuously:** Identify technical debt via code reviews and automated analysis, plan scope and perform small incremental improvements [oai_citation:15‡teamhub.com](https://teamhub.com/blog/understanding-refactoring-techniques-in-software-development/#:~:text=Refactoring%2C%20in%20simple%20terms%2C%20refers,enhance%20readability%2C%20maintainability%2C%20and%20performance) [oai_citation:16‡teamhub.com](https://teamhub.com/blog/understanding-refactoring-techniques-in-software-development/#:~:text=Identifying%20the%20Need%20for%20Refactoring).  Save refactoring plans and summaries in `refactoring/`.
- **Code review:** Apply the structured checklist to examine design, logic, complexity, error handling, documentation, security, performance, usability, ethics and collaboration practices.  Store review comments and resolutions in `code-review.md`.
- **Maintenance mindset:** Use continuous monitoring to catch issues in production.  Document user feedback, bug reports and performance metrics in `monitoring/`.

## 5. Verification

- **Quality gates:** Run `pnpm lint`, `pnpm test`, `pnpm security:scan` and record results in `~/tasks/[feature]/verification/`.
- **Check structure & coverage:** Validate scaffolding (`pnpm structure:validate`) and ensure ≥ 90 % coverage (include a11y and i18n tests).  Store coverage reports.
- **CI/CD and supply chain checks:** Confirm all pipelines succeed and supply‑chain security/AI governance checks pass.  Save evidence in `verification/`.
- **Close feedback loops:** Address all issues from code review, testing, HITL and refactoring.  Document final resolutions and lessons learned in `lesson-learned.md`.

## 6. Monitoring, Iteration & Scaling

- **Active monitoring:** Maintain deployment dashboards and log analysis; track performance, cost and user metrics.
- **Iterate:** Rapidly respond to feedback, incidents and drift.  Update tests, monitoring hooks and documentation accordingly.
- **Model updates & retraining:** For AI components, record model performance, drift detection and retraining activities in `monitoring/`.
- **Scale & optimize:** Consider scalability and efficiency improvements; document changes in the task folder.

## 7. Archive

- **Archive artifacts:** Move final SRS, design diagrams, plans, test logs, HITL feedback, refactoring summaries, verification reports, monitoring logs and the comprehensive task summary into long‑term storage (remains under `~/tasks/[feature]/` but flagged as archived).
- **Update documentation:** Refresh package and system docs, READMEs and change logs.  Ensure runbooks and monitoring guides reflect new features.
- **Record outcomes:** Mark checklist items as complete and write a final summary capturing research findings, implementation details, review comments, test outcomes, HITL decisions, refactoring notes, verification results and monitoring/iteration lessons.
- **Ensure traceability:** The archived `~/tasks/[feature]/` folder contains the full context, enabling reproducibility, auditability and future agent learning.
