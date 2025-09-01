# Security Policy

## Supported Versions

Security updates are applied only to the latest released versions of Cortex-OS packages.

## Reporting a Vulnerability

If you discover a security issue, please email **security@cortex-os.dev** with details and reproduction steps.
We will acknowledge receipt within 48 hours and provide a timeline for remediation.

## Disclosure

Please do not publicly disclose vulnerabilities until we've released a fix and given users time to upgrade (minimum 14 days).

Thank you for helping keep Cortex-OS secure.

## GitHub Security Alert Workflow

1. **Triage the alert**
   - Review logs from the failing workflow (e.g., CodeQL, Semgrep, or gitleaks).
   - Rate severity using CVSS and confirm the issue is reproducible.

2. **Notify stakeholders**
   - Security contacts and maintainers are pinged automatically through Slack and issue assignment.
   - Escalate high‑severity findings via on-call channels when required.

3. **Open tracking issue or PR**
   - Use the automatically created tracking issue as the source of truth.
   - Document reproduction steps and affected components.

4. **Fix or mitigate**
   - Patch code, update dependencies, or adjust configuration.
   - Re-run security workflows to verify the fix.

5. **Review and approval**
   - A separate reviewer confirms the fix and ensures completeness.
   - Request external security review for critical issues if necessary.

6. **Merge and deploy**
   - Merge via normal CI/CD and deploy using hotfix procedures for urgent patches.

7. **Post-incident follow-up**
   - Add regression tests or monitoring rules to prevent recurrence.
   - Record timelines and resolution details in the tracking issue.

### Alerts & notification practices

- GitHub security alerts (Dependabot, CodeQL, secret scanning) are enabled for the repository.
- Slack notifications use `SLACK_WEBHOOK_URL` and tag `#security-alerts`.
- Ensure maintainers have email notifications enabled.
