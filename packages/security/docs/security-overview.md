# Security Overview

The Cortex-OS security domain adopts a zero-trust posture informed by [OWASP Application Security Verification Standard (ASVS) 4.0.3](https://github.com/OWASP/ASVS/tree/v4.0.3). Every release is assessed against ASVS Level 2 by default, with Level 3 controls targeted for privileged or safety-critical surfaces.

## ASVS Control Coverage

| Requirement Area (ASVS) | Coverage Level | Implementation Highlights |
| ----------------------- | -------------- | ------------------------- |
| V1 Architecture & Threat Modeling | ✅ L2 / ⚠️ L3 | Design ADRs, quarterly threat models, MITRE ATLAS adversary mapping |
| V2 Authentication & V3 Session | ✅ L3 | SPIFFE/SPIRE workload identities, OAuth 2.1 + PKCE, mutual TLS |
| V4 Access Control & V5 Validation | ✅ L3 | Policy engine enforcement, Zod schemas, contract-registry validation |
| V6 Cryptography & V8 Data Protection | ✅ L2 / ⚠️ L3 | KMS-backed secrets, envelope encryption, data minimization backlog |
| V7 Logging & V10 Malicious Code | ✅ L3 | Structured evidence logging, Semgrep OWASP/LLM scans, signed artifacts |
| V9 Communications | ✅ L3 | TLS 1.3 + mTLS, service mesh policy enforcement, certificate rotation |
| V11 Business Logic | ✅ L2 / ⚠️ L3 | Abuse-case tests, escalation workflows, manual approval gates |
| V12/13 APIs & Services | ✅ L3 | OpenAPI linting, rate limiting, telemetry correlation, CSP/sandboxing |
| V14 Configuration | ✅ L3 | GitOps-managed baselines, drift detection, secret scanning |

> Legend: ✅ implemented, ⚠️ roadmap item tracked in the security backlog.

## Operational Security Conditions

- Enforce mTLS for every A2A hop and external ingress path with automated certificate rotation.
- Maintain SPIFFE/SPIRE trust domains to eliminate static credentials and provide workload attestation.
- Emit CloudEvents with evidence IDs for every high-value action and store them in tamper-evident logs.
- Prohibit secret values in logs by default; detection rules fail CI/CD if violations occur.
- Use Semgrep OWASP Top-10, OWASP LLM Top-10, and MITRE ATLAS rules as mandatory pre-merge gates.
- Document ASVS control verification in readiness checklists (`readiness.yml`) and link execution evidence in PRs.

## MITRE ATLAS Alignment

Security detections and mitigations map to MITRE ATLAS adversary techniques via the Atlas Navigator layer referenced in the security backlog. Each LLM-facing tool or capability requires an accompanying MITRE ATLAS technique mapping and detection test case.
