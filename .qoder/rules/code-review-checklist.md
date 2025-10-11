---
trigger: always_on
alwaysApply: true
---
# Code Review Checklist (General + AI + Expanded)

## 1. Author Preparation

- [ ] **Self‑review completed?** The author has read through the change and ensured it does what it intends, run tests, and
  provided a clear description.
- [ ] **Small, focused change?** The change is scoped small enough to be reviewed quickly and does not mix unrelated concerns.

## 2. Implementation & Design

- [ ] **Does it accomplish the requirement?** Verify the change solves the problem without unnecessary features.
- [ ] **Is the solution as simple as possible?** Look for opportunities to simplify or refactor; avoid over‑engineering.
- [ ] **Dependencies & abstraction:** Ensure frameworks/libraries are appropriate, avoid unwanted dependencies, and
  choose the right level of abstraction and modularity.
- [ ] **Correct imports used?** Verify all import statements reference the intended modules, remove unused imports, and
  choose dependencies that align with project standards and licences.
- [ ] **Reuse existing functionality:** If similar code exists, reuse or extract common functionality.
- [ ] **Design patterns & principles:** Check adherence to SOLID principles and other architectural best practices;
  avoid premature generalization.
- [ ] **Design artefacts present:** Confirm that up‑to‑date wireframes, wiring diagrams, research documentation and
  TDD plans accompany this change.
- [ ] **Interface compliance:** For interfaces (MCP, A2A, REST API, etc.), verify endpoints, versioning, and error handling.
- [ ] **License/legal compliance:** Ensure dependencies, libraries, and assets are appropriately licensed.

## 2.1. brAInwav Constitutional Compliance

- [ ] **brAInwav branding present:** All system outputs, error messages, health checks, and logs include "brAInwav" reference.
- [ ] **No mock production claims:** Code doesn't claim to be "production-ready" if it contains Math.random() fake data,
  hardcoded mocks, TODOs in production paths, placeholder implementations, or fake metrics.
- [ ] **Function size compliance:** All functions are ≤ 40 lines; larger functions are split with composition and guard clauses.
- [ ] **Named exports only:** No `export default` statements used; all exports are named for better tree-shaking.
- [ ] **Reality Filter applied:** All generated/inferred content is labeled with `[Inference]`, `[Speculation]`, or
  `[Unverified]` tags where applicable.

## 3. Functionality & Logic

- [ ] **Correctness:** Does the code perform as intended and meet user needs?
- [ ] **Edge cases & error states:** Consider unusual inputs, concurrency issues and race conditions.
- [ ] **Concurrency & multithreading:** For async or threaded code, check for race conditions/deadlocks and ensure thread safety.
- [ ] **User impact:** For user‑facing changes, evaluate the practical effect and request a demo if needed.
- [ ] **Rollback plan:** Is there a documented, tested procedure for safe rollback if deployment fails or degrades system stability?
- [ ] **Feature flags/toggles:** Are significant/risky features behind toggles so they can be safely enabled/disabled in production?

## 4. Complexity & Readability

- [ ] **Function size limit:** Ensure functions are ≤ 40 lines; split immediately if exceeding limit.
- [ ] **Good naming:** Names clearly express purpose and are concise.
- [ ] **Logical organization:** Code belongs in the appropriate files/packages and follows a coherent structure.
- [ ] **Understandable control & data flow:** Data and control flows are easy to follow.
- [ ] **Comments:** Comments explain *why* rather than *what*; remove outdated or redundant comments.
- [ ] **Style compliance:** Follow project guides and avoid mixing formatting changes with functional edits.
- [ ] **Commented‑out code:** Remove unused or commented‑out code.
- [ ] **Cleanup of debug/test code:** Remove any test stubs, debug statements or obsolete files.

## 5. Error Handling, Logging & Monitoring

- [ ] **Proper error handling:** Errors are handled gracefully and consistently.
- [ ] **Logging:** Sufficient logging for debugging without leaking sensitive data; correct log severity levels.
- [ ] **Observability:** Code emits metrics/traces, and log levels are appropriately balanced.
- [ ] **User-friendly messages:** Errors presented to end-users are clear and actionable.
- [ ] **Post‑deployment monitoring:** Are new features covered by monitoring hooks, dashboards, and alerts for critical events?
- [ ] **Alert fatigue check:** Added/modified alerts strike a balance between usefulness and noise.

## 6. Dependencies, Documentation & Configuration

- [ ] **Documentation updated:** READMEs, API docs, configuration files, and design artefacts reflect the change.
- [ ] **System impacts & compatibility:** Consider effects on other modules and backward compatibility.
- [ ] **Secrets and configs:** Secrets and config files managed securely; no sensitive info exposed.
- [ ] **Package vision and directory structure:** Change aligns with vision and module layout.
- [ ] **Scaffolding and structure:** Naming, layout, build/test scripts, and boilerplate are up to date.
- [ ] **Platform/environment compatibility:** Change works across supported OSes/browsers/targets.
- [ ] **Build verification:** All build checks and linting pass before merge.
- [ ] **Data migration scripts:** If present, check correctness, performance, and idempotency of any data migrations.
- [ ] **Data retention compliance:** Change must honor retention and deletion policies for user/business data.
- [ ] **Deployment readiness:** All affected infrastructure-as-code/configs/Helm charts are updated.
- [ ] **Release notes:** Release documentation updated for downstream users.
- [ ] **Runbooks/Incident response:** Operational documentation (runbooks, incident response) is updated so support teams are informed.
- [ ] **CHANGELOG.md updated:** All changes are documented in CHANGELOG.md with appropriate version bumping.
- [ ] **Co-authored commits:** Commit messages include 'Co-authored-by: brAInwav Development Team <dev@brainwav.dev>' for
  branding consistency.
- [ ] **Structure validation:** Changes pass `pnpm structure:validate` and comply with repository organization standards.

## 7. Security & Data Privacy

- [ ] **Security vulnerabilities:** Check for injection flaws, insecure dependencies, and proper use of cryptography.
- [ ] **Authentication & authorization:** Confirm access controls.
- [ ] **Input validation:** Inputs are validated and sanitized.
- [ ] **Sensitive data handling:** Credentials and personal data are encrypted and protected.
- [ ] **Third‑party code scanning:** Automated security scans (e.g., Snyk, Dependabot) pass before merge.

## 8. Performance & Scalability

- [ ] **Performance impact:** Does the change degrade performance? Heavy loops/excess memory use avoided.
- [ ] **Optimization opportunities:** More efficient data structures or algorithms identified.
- [ ] **Scalability:** Design can meet workload or user growth.

## 9. Usability & Accessibility

- [ ] **User‑centric design:** APIs and UIs are intuitive and documented.
- [ ] **Accessibility:** UI meets accessibility guidelines.
- [ ] **Internationalization/localization:** Strings externalized, date/time/RTL supported.

## 10. Ethics, Responsible AI, and AI Governance

- [ ] **Privacy & exploitation:** Feature does not exploit or misuse user data.
- [ ] **Harassment & abuse prevention:** Mechanisms to report/mitigate misuse exist.
- [ ] **Inclusiveness & fairness:** No unjust impact on protected groups; algorithmic bias is mitigated.
- [ ] **Compliance with ethical standards:** Organizational AI and regulatory standards are observed.
- [ ] **Responsible AI governance:** Document fairness, transparency, robustness, and compliance.
- [ ] **Model version tracking:** Reference exact/approved model versions in code, CI or deployment docs.
- [ ] **Reproducibility:** Scripts or configs enable recreating AI training or inference environments.
- [ ] **Explainability artifacts:** Provide design/decision explanations for complex or AI-driven features.

## 11. Testing, Rollback, & Quality Assurance

- [ ] **Test coverage:** Automated tests exist and are updated with 90%+ minimum coverage threshold.
- [ ] **Test correctness:** Tests fail when code is broken.
- [ ] **Edge cases & negative tests:** Tests cover boundaries and failure modes.
- [ ] **Test maintainability:** Avoid unnecessary complexity or brittleness in tests.
- [ ] **Rollback drills:** Is rollback process tested in a staging environment? Are triggers for rollback documented clearly ?
- [ ] **Feature toggling tested:** Can new features be swiftly turned off/on in production?
- [ ] **brAInwav branding in tests:** Test cases validate that error messages and system outputs maintain brAInwav branding.
- [ ] **Constitutional compliance testing:** Tests verify no mock production claims and proper Reality Filter application.

## 12. AI Code & Code Completion Considerations

- [ ] **Treat AI output as draft:** All AI‑generated code receives human scrutiny.
- [ ] **Combine AI and human expertise:** Maximize value by blending human judgment with AI capabilities.
- [ ] **CI/CD integration:** AI review tools are integrated and yield actionable feedback.
- [ ] **Transparent feedback:** AI tool feedback is explainable and constructive.
- [ ] **Model & team training:** AI model retraining and dev education is up‑to‑date.
- [ ] **Bias & fairness auditing:** Monitor and mitigate AI reviewer bias.
- [ ] **Security & privacy of AI tools:** AI review tools do not leak or misuse code/data.
- [ ] **Context & business logic:** AI suggestions must fit context and business intent.
- [ ] **False positives/negatives:** Critically evaluate and improve upon noisy model output.

## 13. Collaboration, Review Process & Stakeholder Communication

- [ ] **Clear review roles:** Assign reviewers with appropriate domain expertise.
- [ ] **Respectful feedback:** Comments focus on code, not the author, and clearly explain reasoning.
- [ ] **Guidance vs. autonomy:** Balance prescriptive guidance with developer autonomy; label severity of comments.
- [ ] **Positive reinforcement:** Acknowledge and highlight good practices.
- [ ] **Timeliness:** Reviews conducted in a prompt manner.
- [ ] **Time‑zone considerations:** Feedback is aligned with global team working hours.
- [ ] **Psychological safety:** Creating an open, learning‑friendly environment.
- [ ] **Checklist usage:** Tailor and apply checklists by domain/feature.
- [ ] **Bias awareness:** Self‑check and mitigate potential reviewer bias.
- [ ] **Process metrics:** Track and periodically analyze review speed and quality (e.g., review times, defect rates).
- [ ] **Cross‑functional reviews:** Engage security, UX, DevOps or legal when needed.
- [ ] **Document decisions:** Commit design rationale and trade-offs for future transparency.
- [ ] **Business sign‑off:** For significant features, get explicit product/legal stakeholder approval pre‑merge.
- [ ] **User communication:** Prep release notes, user messaging and docs for impactful changes.

***

This unified checklist now offers industry best practices for release safety, operational excellence,
AI/ML governance, security, and human factors, making it suitable for modern, large-scale or AI-driven teams.

## Sources

- [Your Ultimate Code Review Checklist: 8 Pillars for 2025][1]
- [Empirically sup code review best practices][2]
- [AI security checklist (updated 2025)][3]
- [Rollback Plan Checklist: Safeguard Your Software Releases!][4]
- [Source Code Audit Checklist: Best Practices for Secure Code][5]
- [Top 7 Code Review Best Practices For Developers in 2025][6]
- [Code Review Checklist][7]
- [Peer Code Review Checklist: 10 Best Practices for Dev Teams][8]
- [The Ultimate Code Review Checklist For Developers][9]
- [How to Present Rollback Drills & Readiness][10]
- [The code review checklist that actually helps][11]
- [OWASP's LLM AI Security & Governance Checklist][12]
- [OPS07-BP02 Ensure a consistent review of operational ...][13]
- [Code Review Checklist for JavaScript/React][14]
- [AI Security Checklist - Protect Systems from Threats in 2025][15]
- [What is Rollback Plan? | Definition & Overview][16]
- [The Standard of Code Review | eng-practices - Google][17]
- [Code Review Security Checklist for Secure Development][18]
- [How Atlassian does operational readiness][19]
- [Top 6 Code Review Best Practices To Implement in 2025][20]

[1]: <https://getnerdify.com/blog/code-review-checklist/>
[2]: <https://graphite.dev/blog/code-review-best-practices>
[3]: <https://lumenalta.com/insights/ai-security-checklist-updated-2025>
[4]: <https://www.manifest.ly/use-cases/software-development/rollback-plan-checklist>
[5]: <https://www.codeant.ai/blogs/source-code-audit-checklist-best-practices-for-secure-code>
[6]: <https://www.qodo.ai/blog/code-review-best-practices/>
[7]: <https://www.codereviewchecklist.com>
[8]: <https://jellyfish.co/library/developer-productivity/peer-code-review-best-practices/>
[9]: <https://blog.codacy.com/code-review-checklist>
[10]: <https://www.resumly.ai/blog/how-to-present-rollback-drills-and-readiness>
[11]: <https://appfire.com/resources/blog/code-review-checklist>
[12]: <https://www.reversinglabs.com/blog/owasp-llm-ai-security-governance-checklist-13-action-items-for-your-team>
[13]: <https://docs.aws.amazon.com/wellarchitected/latest/framework/ops_ready_to_support_const_orr.html>
[14]: <https://community.ibm.com/community/user/blogs/marina-mascarenhas/2025/07/15/code-review-checklist-for-javascriptreact>
[15]: <https://www.practical-devsecops.com/ai-security-checklist/>
[16]: <https://www.prodpad.com/glossary/rollback-plan/>
[17]: <https://google.github.io/eng-practices/review/reviewer/standard.html>
[18]: <https://amplify.security/blog/code-review-security-checklist>
[19]: <https://www.atlassian.com/devops/what-is-devops/operational-readiness>
[20]: <https://zencoder.ai/blog/code-review-best-practices>
