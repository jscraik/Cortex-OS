# Security Policy Thresholds and Configuration

## 🎯 Overview

This directory contains static security policies, thresholds, and compliance configurations that work with the `.semgrep` rules engine. These policies define risk thresholds, scanning cadence, and remediation requirements for different security standards.

## 📁 Policy Files

### `owasp-top10-2025-policies.yaml`
OWASP Top 10 2025 compliance policies with:
- Risk thresholds (0.35 max risk score)
- Scan cadence (every 6 hours)
- Zero-tolerance for critical vulnerabilities
- 4-hour remediation window

### `cwe-top-25-policies.yaml`
CWE Top 25 compliance policies with:
- Risk thresholds (0.40 max risk score)
- Scan cadence (every 12 hours)
- 1 allowed medium vulnerability
- 8-hour remediation window

### `nist-rmf-policies.yaml`
NIST AI Risk Management Framework policies with:
- Risk thresholds (0.45 max risk score)
- Scan cadence (every 24 hours)
- 1 allowed outstanding violation
- 24-hour remediation window

### `iso27001-policies.yaml`
ISO 27001 compliance policies with:
- Risk thresholds (0.40 max risk score)
- Scan cadence (daily)
- Zero-tolerance for violations
- 24-hour remediation window

## 🚀 Integration

### With Semgrep CI/CD

The policies integrate with `.github/workflows/semgrep.yml`:

```yaml
- name: Check Policy Compliance
  run: |
    semgrep --config=.semgrep/policies/owasp-top10-2025-policies.yaml --metrics=on
```

### With cortex-semgrep-github

The GitHub App uses these policies to determine:
- When to fail PRs based on policy violations
- Escalation triggers for critical findings
- Automated comment formatting with policy context

### With cortex-sec Package

The refactored `cortex-sec` package imports these policies for:
- Compliance planning and gap analysis
- Risk computation and aggregation
- Remediation timeline tracking

## 📊 Policy Structure

Each policy file contains:

```yaml
policy:
  standard: owasp-top10-2025
  version: "2025.09.30"

thresholds:
  max_risk_score: 0.35
  max_outstanding_violations: 0
  scan_cadence_hours: 6
  escalation_threshold: 0.55

tools:
  - security.run_semgrep_scan
  - security.analyze_vulnerabilities

remediation:
  window_hours: 4
  auto_escalate: true

ruleset_mapping:
  high_severity:
    - owasp-top-10-improved.yaml
    - llm-security.yaml
  medium_severity:
    - supply-chain-security.yaml
    - container-infra-security.yaml
```

## 🔄 Updating Policies

1. Edit the relevant policy file
2. Update version number
3. Test with: `semgrep --config=.semgrep/policies/policy-name.yaml`
4. Commit changes with policy impact summary

## 📋 Policy Compliance Matrix

| Standard | Max Risk | Scan Freq | Violations | Remediation |
|----------|-----------|-----------|------------|-------------|
| OWASP Top 10 2025 | 0.35 | 6 hours | 0 | 4 hours |
| CWE Top 25 | 0.40 | 12 hours | 1 | 8 hours |
| NIST AI RMF | 0.45 | 24 hours | 1 | 24 hours |
| ISO 27001 | 0.40 | 24 hours | 0 | 24 hours |

---

**Generated**: 2025-09-30
**Maintainer**: brAInwav Security Team
