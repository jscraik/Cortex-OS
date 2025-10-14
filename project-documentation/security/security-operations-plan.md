# Security Operations Plan

## Purpose

This plan defines how Cortex-OS operationalizes the security practices documented in our governance, coordinates responses to vulnerabilities, and satisfies the external frameworks we have committed to follow. It complements the response timelines in [SECURITY.md](../../SECURITY.md) and the security controls tracked in the production readiness checklist.

## Framework Obligations

### OWASP Top 10 (2021)

- Perform continuous secure coding reviews that specifically test for injection, broken access control, cryptographic failures, and software supply chain risks.
- Enforce automated static analysis (Semgrep) and dependency checks (OSV, npm audit, pip-audit, Safety) on every pull request and scheduled run.
- Require authenticated, least-privilege access to all agent endpoints, including RBAC enforcement and secret scoping for runtime credentials.
- Maintain centralized logging of security events (allow/deny, sandbox violations) with tamper-evident storage and retention aligned to regulatory requirements.
- Apply defense-in-depth hardening (input validation via Zod, encrypted transport/storage, sandboxed tool execution) with regression tests per control.

### OWASP LLM Top 10

- Guard against prompt injection, data leakage, and training data poisoning using policy gates, allowlists, and evidence-first retrieval.
- Track and audit model interactions, including metadata, provenance, and redaction of sensitive inputs/outputs for human review.
- Provide incident-ready playbooks for model abuse scenarios, including prompt sanitization rollbacks and memory purge procedures.
- Validate model inputs and outputs through deterministic tests, fuzzing for prompt handling, and guardrails on streaming responses.
- Require explicit human approval (HITL) checkpoints for high-impact agent actions, logged with evidence and reviewer identity.

### MITRE ATLAS

- Map threat intelligence and detections to ATLAS techniques, maintaining coverage tables for discovery, evasion, and model tampering tactics.
- Instrument telemetry to detect fine-tuning misuse, model extraction attempts, and adversarial query patterns.
- Leverage ATLAS to drive red-team exercises and ensure mitigation stories exist for each applicable tactic.
- Document detection-to-response workflows that escalate to security engineering when ATLAS-covered behaviors are observed.
- Review ATLAS alignment quarterly with updates captured in the security checklist and task folders.

### NIST Cybersecurity Framework (CSF)

- **Identify:** Maintain asset inventory for agents, models, connectors, and secrets; map business impact and owners.
- **Protect:** Apply least privilege, MFA, code signing, SBOM generation, and vulnerability scanning pipelines (Semgrep, gitleaks, OSV, Trivy).
- **Detect:** Monitor runtime health, anomaly detection on agent workflows, and automated alerts for policy or sandbox violations.
- **Respond:** Follow the coordinated disclosure timeline (acknowledge ≤72 hours, disclose ≤45 days) with documented playbooks and communication trees.
- **Recover:** Conduct post-incident reviews, update task folders with remediation outcomes, and ensure rollback plans for agents and connectors.

## Supported Version SLA

Cortex-OS supports releases according to the policy defined in [SECURITY.md](../../SECURITY.md):

| Version | Support Level | Commitment |
| ------- | ------------- | ---------- |
| 2.x.x   | Active        | Full security updates; monitored for framework compliance and patched as issues emerge. |
| 1.5.x   | Active        | Full security updates through 2025-12-31, including emergency fixes within the disclosure window. |
| 1.4.x   | Limited       | Critical fixes only through 2025-06-30; mitigations backported when severity warrants. |
| < 1.4   | Unsupported   | No security updates; customers must upgrade to a supported branch for protection. |

Support level reviews occur quarterly. When a version transitions support state, the security team updates this plan, the public SECURITY.md table, and task evidence in `tasks/security-operations-plan/`.

## Operational Routines

- **Daily:** Monitor CI outputs from Semgrep, gitleaks, OSV, Trivy, and SBOM generation. File issues and task-folder updates for new findings.
- **Weekly:** Review vulnerability backlog, confirm evidence is archived in the relevant task folder, and verify mitigations remain effective.
- **Quarterly:** Reassess framework obligations, validate ATLAS coverage, and re-run tabletop exercises for prompt/LLM incident response.
- **Release readiness:** Confirm supported-version SLA adherence, update the checklist matrix, and ensure artifacts are linked to the corresponding task folder.

## Incident Response Integration

- Acknowledge incoming reports within 72 hours (24 hours for critical issues), provide investigation status within one week, and coordinate disclosure within 45 days.
- Track all response activities in the task folder, including remediation commits, communication logs, and verification artifacts.
- Escalate to the security lead and product engineering owners based on severity band responsibilities documented in the checklist matrix.
