# Security

This package operationalizes Cortex-OS security controls in alignment with [OWASP ASVS 4.0.3](https://github.com/OWASP/ASVS/tree/v4.0.3). The following conditions define the minimum bar for any change touching the security domain.

## Baseline Controls

- **mTLS Everywhere (ASVS V9):** All inbound and outbound service calls must negotiate TLS 1.3 with mutual authentication. Certificate rotation is automated and monitored.
- **Workload Identity (ASVS V2/V3):** SPIFFE/SPIRE attestation replaces static credentials. Workload identities are short-lived and scoped to least privilege.
- **Contracted Events (ASVS V5/V12):** Every CloudEvent includes schema IDs and evidence pointers. Events failing validation are rejected before leaving the process boundary.
- **Secret Hygiene (ASVS V8):** Logs, traces, and analytics streams are scrubbed for secrets. CI pipelines break on detection of credential leakage.

## Verification Activities

- Run Semgrep profiles that combine OWASP ASVS, OWASP LLM Top-10, and MITRE ATLAS rules. Findings with severity ≥ warning block merge.
- Execute readiness gates (`readiness.yml`) documenting ASVS control evidence, including authentication/session reviews and abuse-case tests.
- Record architecture and threat-model updates in ADRs with explicit ASVS control references (e.g., `ASVS-V1.1`, `ASVS-V4.3`).
- Map each LLM-facing feature to MITRE ATLAS techniques and confirm mitigations or detections before release.

## Escalation & Exceptions

- Exceptions to Level 2 controls require written approval from the security program owner and a remediation issue linked in the backlog.
- Level 3 gaps (e.g., field-level encryption, automated business-logic anomaly detection) must include target completion dates and compensating controls documented in the security runbook.
