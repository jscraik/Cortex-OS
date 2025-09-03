# Cortex-OS Software Bill of Materials

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

This directory contains Software Bill of Materials (SBOM) files and dependency analysis reports for the Cortex-OS project, providing comprehensive visibility into all software components and their security posture.

## SBOM Overview

### Purpose

The SBOM provides:

- **Dependency Transparency** - Complete inventory of all software components
- **Security Visibility** - Known vulnerabilities and security advisories
- **License Compliance** - License information for all dependencies
- **Supply Chain Security** - Provenance and integrity verification
- **Risk Assessment** - Security risk analysis and recommendations

### SBOM Standards

Cortex-OS follows industry standards:

- **SPDX** - Software Package Data Exchange format
- **CycloneDX** - Lightweight software bill of materials standard
- **SWID** - Software Identification tags
- **SLSA** - Supply-chain Levels for Software Artifacts

## Directory Structure

```text
sbom/
├── formats/
│   ├── spdx/
│   │   ├── cortex-os.spdx.json     # SPDX format SBOM
│   │   └── validation.txt          # SPDX validation results
│   ├── cyclonedx/
│   │   ├── cortex-os.cdx.json      # CycloneDX format SBOM
│   │   └── bom-validation.txt      # CycloneDX validation
│   └── swid/
│       └── cortex-os.swid.xml      # SWID tags
├── reports/
│   ├── dependencies/
│   │   ├── npm-audit.json          # NPM security audit
│   │   ├── pip-audit.json          # Python security audit
│   │   └── cargo-audit.json        # Rust security audit
│   ├── licenses/
│   │   ├── license-report.json     # License compliance report
│   │   └── license-analysis.txt    # License risk analysis
│   └── vulnerabilities/
│       ├── cve-report.json         # CVE vulnerability report
│       ├── security-advisories.json # Security advisory analysis
│       └── risk-assessment.txt     # Overall risk assessment
├── tools/
│   ├── generate-sbom.sh            # SBOM generation script
│   ├── validate-sbom.sh            # SBOM validation script
│   └── security-scan.sh            # Security scanning script
└── archives/
    ├── 2024/                       # Historical SBOMs by year
    └── releases/                   # Release-specific SBOMs
```

## SBOM Generation

### Automated Generation

```bash
#!/bin/bash
# tools/generate-sbom.sh

echo "Generating SBOM for Cortex-OS..."

# Generate SPDX format SBOM
syft packages dir:. -o spdx-json > sbom/formats/spdx/cortex-os.spdx.json

# Generate CycloneDX format SBOM
syft packages dir:. -o cyclonedx-json > sbom/formats/cyclonedx/cortex-os.cdx.json

# Generate dependency reports
npm audit --audit-level=info --json > sbom/reports/dependencies/npm-audit.json
pip-audit --format=json --output=sbom/reports/dependencies/pip-audit.json

# Generate license report
license-checker --onlyAllow 'MIT;Apache-2.0;BSD-3-Clause;ISC' --json > sbom/reports/licenses/license-report.json

echo "SBOM generation complete"
```

### Manual Generation

```bash
# Install SBOM tools
npm install -g @cyclonedx/bom
pip install syft cyclonedx-bom

# Generate SBOM for TypeScript/Node.js components
cyclonedx-bom -o sbom/formats/cyclonedx/frontend.cdx.json

# Generate SBOM for Python components
cyclonedx-py -i requirements.txt -o sbom/formats/cyclonedx/python.cdx.json

# Generate comprehensive SBOM
syft packages dir:. -o spdx-json > sbom/formats/spdx/complete.spdx.json
```

## SBOM Contents

### Component Information

Each SBOM entry includes:

```json
{
  "name": "express",
  "version": "4.18.2",
  "type": "npm",
  "foundBy": "javascript-lock-cataloger",
  "locations": [
    {
      "path": "/package-lock.json"
    }
  ],
  "licenses": ["MIT"],
  "language": "javascript",
  "cpes": [
    "cpe:2.3:a:expressjs:express:4.18.2:*:*:*:*:node.js:*:*"
  ],
  "purl": "pkg:npm/express@4.18.2"
}
```

### Vulnerability Information

```json
{
  "vulnerability": {
    "id": "CVE-2024-29041",
    "dataSource": "https://nvd.nist.gov/vuln/detail/CVE-2024-29041",
    "namespace": "nvd:cpe",
    "severity": "Medium",
    "urls": [
      "https://nvd.nist.gov/vuln/detail/CVE-2024-29041"
    ],
    "description": "Express.js vulnerability in body parsing",
    "cvss": [
      {
        "version": "3.1",
        "vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L",
        "metrics": {
          "baseScore": 5.3,
          "exploitabilityScore": 3.9,
          "impactScore": 1.4
        }
      }
    ]
  }
}
```

## Security Analysis

### Vulnerability Scanning

```bash
#!/bin/bash
# tools/security-scan.sh

echo "Running security analysis..."

# NPM audit
npm audit --audit-level=moderate

# Python security audit
pip-audit --desc

# Rust security audit (if applicable)
cargo audit

# SBOM-based vulnerability scanning
grype sbom/formats/spdx/cortex-os.spdx.json

# Generate security report
trivy sbom sbom/formats/cyclonedx/cortex-os.cdx.json
```

### Security Metrics

Track key security indicators:

- **Critical Vulnerabilities** - 0 (target)
- **High Vulnerabilities** - < 5 (maximum allowed)
- **Medium Vulnerabilities** - < 20 (monitored)
- **Low Vulnerabilities** - < 50 (tracked)
- **License Compliance** - 100% (required)

### Risk Assessment

```text
# sbom/reports/vulnerabilities/risk-assessment.txt

CORTEX-OS SECURITY RISK ASSESSMENT
==================================

Overall Risk Level: LOW

Critical Issues: 0
High Issues: 2
Medium Issues: 15
Low Issues: 23

Top Risks:
1. Express.js CVE-2024-29041 (Medium) - Body parsing vulnerability
2. Lodash CVE-2023-20166 (Medium) - Prototype pollution
3. Webpack CVE-2023-28154 (Medium) - Code injection

Recommendations:
- Update Express.js to version 4.19.0 or later
- Replace lodash with safer alternatives
- Update webpack to patched version

Last Updated: 2024-01-15
Next Review: 2024-02-15
```

## License Compliance

### License Analysis

```json
{
  "summary": {
    "total_packages": 1247,
    "licenses": {
      "MIT": 856,
      "Apache-2.0": 234,
      "BSD-3-Clause": 98,
      "ISC": 45,
      "BSD-2-Clause": 14
    },
    "compliance_status": "COMPLIANT"
  },
  "non_compliant": [],
  "review_required": [
    {
      "name": "some-package",
      "version": "1.0.0",
      "license": "GPL-3.0",
      "reason": "Copyleft license requires review"
    }
  ]
}
```

### Approved Licenses

Cortex-OS permits these licenses:

- **MIT** - Full permission
- **Apache-2.0** - Full permission
- **BSD-3-Clause** - Full permission
- **BSD-2-Clause** - Full permission
- **ISC** - Full permission
- **CC0-1.0** - Public domain
- **Unlicense** - Public domain

### Restricted Licenses

These licenses require legal review:

- **GPL-2.0/GPL-3.0** - Copyleft requirements
- **AGPL-3.0** - Network copyleft
- **LGPL-2.1/LGPL-3.0** - Limited copyleft
- **EPL-2.0** - Eclipse public license
- **MPL-2.0** - Mozilla public license

## Supply Chain Security

### Provenance Tracking

```yaml
# SLSA provenance metadata
predicateType: "https://slsa.dev/provenance/v0.2"
predicate:
  builder:
    id: "https://github.com/actions/runner"
  buildType: "https://github.com/actions/workflow"
  invocation:
    configSource:
      uri: "git+https://github.com/cortex-os/cortex-os"
      digest:
        sha1: "abc123..."
  materials:
    - uri: "git+https://github.com/cortex-os/cortex-os"
      digest:
        sha1: "abc123..."
```

### Integrity Verification

```bash
# Verify package integrity
npm audit signatures

# Verify Python package integrity
pip-audit --verify-hashes

# Verify Docker image integrity
cosign verify ghcr.io/cortex-os/cortex-os:latest

# Verify SBOM integrity
cosign verify-blob --signature sbom.sig sbom/formats/spdx/cortex-os.spdx.json
```

## SBOM Validation

### Format Validation

```bash
#!/bin/bash
# tools/validate-sbom.sh

echo "Validating SBOM formats..."

# Validate SPDX format
spdx-tools validate sbom/formats/spdx/cortex-os.spdx.json

# Validate CycloneDX format
cyclonedx validate sbom/formats/cyclonedx/cortex-os.cdx.json

# Check for required fields
jq '.components[] | select(.name and .version and .type)' sbom/formats/cyclonedx/cortex-os.cdx.json

echo "SBOM validation complete"
```

### Quality Checks

```bash
# Check completeness
sbom-quality-score sbom/formats/spdx/cortex-os.spdx.json

# Verify relationships
sbom-graph sbom/formats/cyclonedx/cortex-os.cdx.json

# Compare with previous versions
sbom-diff previous-sbom.json current-sbom.json
```

## Compliance Reporting

### Regulatory Compliance

Support for various compliance frameworks:

- **NIST SSDF** - Secure Software Development Framework
- **Executive Order 14028** - Critical software identification
- **EU Cyber Resilience Act** - CE marking requirements
- **ISO/IEC 27001** - Information security management
- **SOC 2 Type II** - Security and availability controls

### Compliance Reports

```bash
# Generate compliance report
sbom-compliance-report \
  --framework=NIST-SSDF \
  --sbom=sbom/formats/spdx/cortex-os.spdx.json \
  --output=compliance-report.pdf

# Export for regulatory submission
sbom-export \
  --format=regulatory \
  --destination=regulatory-submission/
```

## Automation and CI/CD

### GitHub Actions Integration

```yaml
name: SBOM Generation
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  sbom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Generate SBOM
        run: |
          syft packages dir:. -o spdx-json > sbom/cortex-os.spdx.json
          
      - name: Security Scan
        run: |
          grype sbom/cortex-os.spdx.json
          
      - name: Upload SBOM
        uses: actions/upload-artifact@v3
        with:
          name: sbom
          path: sbom/
```

### Continuous Monitoring

```bash
# Daily security monitoring
0 2 * * * /usr/local/bin/security-scan.sh >> /var/log/sbom-security.log

# Weekly SBOM regeneration
0 3 * * 0 /usr/local/bin/generate-sbom.sh

# Monthly compliance check
0 4 1 * * /usr/local/bin/compliance-check.sh
```

## Best Practices

### SBOM Management

- **Version Control** - Track SBOM changes over time
- **Automated Generation** - Generate SBOMs in CI/CD pipeline
- **Regular Updates** - Update SBOMs with each release
- **Format Standards** - Use industry-standard formats
- **Digital Signatures** - Sign SBOMs for integrity

### Security Practices

- **Continuous Scanning** - Regular vulnerability assessment
- **Rapid Response** - Quick patching of critical issues
- **Risk Assessment** - Regular security risk evaluation
- **Compliance Monitoring** - Ongoing license compliance checks
- **Supply Chain Verification** - Verify component provenance

## Tools and Integration

### SBOM Tools

- **Syft** - SBOM generation and analysis
- **CycloneDX** - SBOM format and tools
- **SPDX Tools** - SPDX format validation
- **Grype** - Vulnerability scanning
- **Trivy** - Security scanner

### Security Tools

- **npm audit** - Node.js security scanning
- **pip-audit** - Python security scanning
- **cargo audit** - Rust security scanning
- **OSSLCI** - Open source license compliance
- **Snyk** - Vulnerability management

## Related Documentation

- [Security Policies](/SECURITY.md)
- [License Information](/LICENSE)
- [Dependency Management](/package.json)
- [Compliance Documentation](/docs/)
