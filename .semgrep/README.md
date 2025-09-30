# brAInwav Cortex-OS Security Rules (September 2025)

🛡️ Comprehensive security rule suite for brAInwav Cortex-OS, covering OWASP Top 10 2025, AI/ML security, supply chain threats, and global compliance requirements.

## 📋 Table of Contents

- [Overview](#overview)
- [Rule Categories](#rule-categories)
- [Framework Mappings](#framework-mappings)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [CI/CD Integration](#cicd-integration)
- [Rule Development](#rule-development)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

This security rule suite provides comprehensive coverage for:
- **Traditional Application Security**: OWASP Top 10 2025
- **AI/ML Security**: OWASP LLM Top 10 2025, MITRE ATLAS
- **Supply Chain Security**: Dependency management, model provenance
- **Infrastructure Security**: Docker, Kubernetes, Terraform
- **Privacy & Compliance**: GDPR, CCPA, EU AI Act, HIPAA
- **Dynamic Testing**: Red team and adversarial testing requirements

## 📁 Rule Categories

### Core Security Rules

| Rule File | Description | Coverage |
|-----------|-------------|----------|
| `owasp-top-10-improved.yaml` | OWASP Top 10 2025 with enhanced patterns | Web application vulnerabilities |
| `llm-security.yaml` | Enhanced LLM/AI security rules | AI/ML-specific threats |
| `supply-chain-security.yaml` | Supply chain and dependency security | Third-party risks |
| `container-infra-security.yaml` | Container and infrastructure security | Cloud-native security |
| `privacy-compliance.yaml` | Privacy and regulatory compliance | GDPR, CCPA, EU AI Act |
| `ai-security-frameworks.yaml` | AI governance frameworks | NIST AI RMF, CSA AICM, ISO 42001 |
| `dynamic-testing-redteam.yaml` | Dynamic testing requirements | Red team validation points |

### Legacy Rules (Maintained for compatibility)

| Rule File | Status | Notes |
|-----------|--------|-------|
| `owasp-precise.yaml` | ✅ Active | Precise injection detection |
| `owasp-llm-top-ten.yaml` | ✅ Active | Basic LLM security |
| `mitre-atlas.yaml` | ✅ Active | MITRE ATLAS framework |
| `cortex-*.yml` | ✅ Active | Cortex-specific rules |

## 🏗️ Framework Mappings

### OWASP Mappings

```
A01:2025 - Broken Access Control
├── IDOR detection
├── Mass assignment
├── Privilege escalation
└── Path traversal

A02:2025 - Cryptographic Failures
├── Weak algorithms (MD5, SHA1)
├── Post-quantum considerations
├── Unencrypted private keys
└── Insecure JWT implementations

A03:2025 - Injection
├── SQL/NoSQL injection
├── Command injection
├── Template injection
├── GraphQL injection
└── LDAP injection
```

### AI Security Mappings

```
OWASP LLM Top 10 2025
├── LLM01: Prompt Injection
│   ├── Direct injection
│   ├── Indirect injection
│   └── Session hijacking
├── LLM02: Insecure Output Handling
│   ├── Code execution
│   ├── SQL injection from output
│   └── Redirect attacks
├── LLM03: Supply Chain Attacks
│   ├── Model poisoning
│   ├── Data contamination
│   └── Dependency confusion
└── ... (LLM04-LLM10)
```

### MITRE ATLAS Techniques

```
T0009 - Prompt Injection
T0021 - Output Manipulation
T0026 - Insecure Deserialization
T0031 - Tool Abuse
T0081 - Poisoning
```

### Compliance Frameworks

```
GDPR Articles
├── Art. 6 - Lawfulness of processing
├── Art. 7 - Consent
├── Art. 17 - Right to erasure
├── Art. 25 - Privacy by design
└── Art. 35 - Data protection impact assessment

EU AI Act Requirements
├── High-risk AI systems
├── Transparency obligations
├── Conformity assessment
└── Post-market monitoring

NIST AI RMF Functions
├── GOVERN - Risk governance
├── MAP - Context mapping
├── MEASURE - Metrics & monitoring
└── MANAGE - Risk treatment
```

## 🚀 Quick Start

### Local Development

```bash
# Install Semgrep
pip install semgrep

# Run all rules
semgrep --config=.semgrep/

# Run specific category
semgrep --config=.semgrep/llm-security.yaml

# Run with severity filter
semgrep --config=.semgrep/ --severity=ERROR

# Generate SARIF report
semgrep --config=.semgrep/ --sarif --output=security-report.sarif
```

### Docker Usage

```bash
# Using Semgrep Docker image
docker run --rm -v "$(pwd):/src" \
  returntocorp/semgrep:latest \
  --config=/src/.semgrep/ \
  /src/src
```

## ⚙️ Configuration

### Semgrep Configuration File (`.semgrep.yml`)

```yaml
# Core configuration
rules:
  - .semgrep/owasp-top-10-improved.yaml
  - .semgrep/llm-security.yaml
  - .semgrep/supply-chain-security.yaml
  - .semgrep/container-infra-security.yaml
  - .semgrep/privacy-compliance.yaml
  - .semgrep/ai-security-frameworks.yaml
  - .semgrep/dynamic-testing-redteam.yaml

# Registry rules
  - p/owasp-top-ten
  - p/cwe-top-25
  - p/secrets
  - p/semgrep-supply-chain

# Language-specific
  - p/javascript
  - p/typescript
  - p/python
  - p/docker
  - p/kubernetes
  - p/terraform
```

### Environment Variables

```bash
# Set severity level
export SEMGREP_SEVERITY_LEVEL=WARNING

# Enable autofix where available
export SEMGREP_ENABLE_AUTOFIX=true

# Set baseline for diff scanning
export SEMGREP_BASELINE_REF=main

# Exclude test files
export SEMGREP_EXCLUDE=**/__tests__/**,**/*.test.js
```

## 🔄 CI/CD Integration

### GitHub Actions

The security pipeline is automatically configured in `.github/workflows/semgrep.yml`:

```yaml
# Triggers
- Pull requests
- Pushes to main/develop
- Daily scheduled scans
- Manual workflow dispatch

# Features
- ✅ Comprehensive security scanning
- ✅ SARIF upload to GitHub Security
- ✅ PR comments with findings
- ✅ Supply chain scanning
- ✅ Container security scanning
- ✅ Daily security summaries
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any
    stages {
        stage('Security Scan') {
            steps {
                sh 'semgrep --config=.semgrep/ --json --output=semgrep-report.json'
                publishHTML([
                    allowMissing: false,
                    alwaysLinkToLastBuild: true,
                    keepAll: true,
                    reportDir: '.',
                    reportFiles: 'semgrep-report.json',
                    reportName: 'Semgrep Security Report'
                ])
            }
        }
    }
}
```

### GitLab CI

```yaml
security-scan:
  stage: test
  script:
    - pip install semgrep
    - semgrep --config=.semgrep/ --gitlab-sast
  artifacts:
    reports:
      sast: gl-sast-report.json
```

## 📝 Rule Development

### Writing Custom Rules

```yaml
# .semgrep/custom-rules.yaml
rules:
  - id: cortex-custom-injection
    message: 'Potential injection vulnerability in Cortex component'
    metadata:
      category: security
      owasp: 'A03:2025'
      severity: ERROR
    languages: [python]
    patterns:
      - pattern: |
          $DB.execute($QUERY + $USER_INPUT)
      - metavariable-pattern:
          metavariable: $USER_INPUT
          patterns:
            - pattern-not: |
                escape($USER_INPUT)
```

### Testing Rules

```bash
# Validate rule syntax
semgrep --validate --config=.semgrep/custom-rules.yaml

# Test against sample code
semgrep --config=.semgrep/custom-rules.yaml --test

# Generate test cases
semgrep --config=.semgrep/custom-rules.yaml --generate-tests
```

### Rule Categories by Severity

| Severity | Use Case | Examples |
|----------|-----------|----------|
| **ERROR** | Block PR, requires immediate fix | SQL injection, XSS, auth bypass |
| **WARNING** | Review required, can be merged with approval | Weak crypto, missing logging |
| **INFO** | Best practice violations, documentation needed | Missing documentation, optimization opportunities |

## 🔧 Troubleshooting

### Common Issues

#### Rule Validation Errors

```bash
# Error: Invalid rule syntax
semgrep --validate --config=.semgrep/rule.yaml

# Fix: Check YAML syntax and pattern structure
```

#### Performance Issues

```bash
# Use incremental scanning
semgrep --config=.semgrep/ --baseline-ref=HEAD~1

# Exclude large directories
semgrep --config=.semgrep/ --exclude=node_modules --exclude=.git
```

#### False Positives

```yaml
# Add exclusion patterns
exclude:
  - "**/test/**"
  - "**/mock/**"
  - "**/vendor/**"

# Or disable specific rules
disable:
  - python.flask.debug-visible
```

### Getting Help

1. **Check rule documentation**: Each rule file contains detailed descriptions
2. **Review GitHub Issues**: [brAInwav Security Issues](https://github.com/jamiescottcraik/Cortex-OS/issues)
3. **Consult Semgrep docs**: [Semgrep Documentation](https://semgrep.dev/docs)
4. **Security team contact**: security@brainwav.io

## 📊 Metrics and Coverage

### Current Coverage (September 2025)

| Category | Rules Count | Coverage % |
|----------|-------------|------------|
| OWASP Top 10 2025 | 45 rules | 100% |
| OWASP LLM Top 10 | 35 rules | 100% |
| MITRE ATLAS | 28 techniques | 85% |
| Supply Chain | 22 rules | 90% |
| Container Security | 30 rules | 95% |
| Privacy & Compliance | 40 rules | 88% |
| AI Governance | 35 rules | 80% |

### Supported Languages

| Language | Support Level | Notes |
|----------|---------------|-------|
| Python | ✅ Full | All rule categories |
| JavaScript/TypeScript | ✅ Full | Web and Node.js patterns |
| Go | ✅ Good | Core security rules |
| Java | ✅ Good | Enterprise patterns |
| C# | ⚠️ Basic | Limited rule coverage |
| Ruby | ⚠️ Basic | Legacy support |

## 🔄 Rule Updates

### Update Schedule

- **Critical security rules**: Within 24 hours of CVE disclosure
- **OWASP rule updates**: Quarterly (January, April, July, October)
- **AI/ML security rules**: Monthly (rapidly evolving threat landscape)
- **Compliance updates**: As regulations change (GDPR, CCPA, EU AI Act)
- **Framework updates**: Bi-annual (NIST, ISO updates)

## 🏗️ Integration with Cortex-OS Packages

### cortex-semgrep-github Package
The GitHub App automatically uses these rules:
```typescript
// Rules configured in packages/cortex-semgrep-github/src/lib/semgrep-scanner.ts
const rulesets = [
  '.semgrep/owasp-top-10-improved.yaml',
  '.semgrep/llm-security.yaml',
  '.semgrep/supply-chain-security.yaml',
  '.semgrep/container-infra-security.yaml',
  '.semgrep/privacy-compliance.yaml',
  '.semgrep/ai-security-frameworks.yaml',
  '.semgrep/dynamic-testing-redteam.yaml'
];
```

### cortex-sec Package
Compliance planning package reads policies from `.semgrep/policies/`:
```typescript
import { loadSecurityPolicies } from '@cortex-os/cortex-sec';

const policies = await loadSecurityPolicies('.semgrep/policies/');
const risk = computeAggregateRisk(signals);
```

### security Package
Zero-trust infrastructure with SPIFFE/SPIRE integration:
```typescript
import { SecurityEventEmitter } from '@cortex-os/security';

const emitter = new SecurityEventEmitter({
  registry: { validate: async () => true }
});
```

### Update Process

```bash
# Update registry rules
semgrep --config=auto

# Update custom rules
git pull origin main
semgrep --validate --config=.semgrep/

# Check for new rule releases
semgrep --version
```

## 📈 Best Practices

### Development

1. **Run scans locally** before committing
2. **Fix high severity findings** immediately
3. **Document exceptions** with security team approval
4. **Review new rules** weekly
5. **Participate in security reviews** for AI/ML features

### Operations

1. **Monitor scan results** daily
2. **Track security debt** in project management tools
3. **Regular red team exercises** quarterly
4. **Update dependencies** through secure supply chain
5. **Document security decisions** in architecture docs

### Compliance

1. **Maintain audit trails** for all security activities
2. **Document risk assessments** for AI systems
3. **Regular privacy reviews** for new features
4. **Incident response testing** bi-annually
5. **Third-party security assessments** annually

## 🎯 Roadmap

### Q4 2025

- [ ] Enhanced quantum computing threat detection
- [ ] Extended API security (GraphQL, gRPC)
- [ ] Advanced AI red team automation
- [ ] SBOM integration with AI models
- [ ] Continuous security monitoring

### Q1 2026

- [ ] Zero-trust architecture patterns
- [ ] Advanced privacy-preserving techniques
- [ ] Multi-cloud security correlations
- [ ] AI security orchestration
- [ ] Compliance automation framework

## 📄 License

These security rules are part of the brAInwav Cortex-OS project and are licensed under the MIT License. See the main repository for full license details.

## 🔗 References

- [OWASP Top 10 2025](https://owasp.org/Top10/)
- [OWASP LLM Top 10](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [MITRE ATLAS](https://atlas.mitre.org/)
- [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework)
- [CSA AI Controls Matrix](https://cloudsecurityalliance.org/ai-controls/)
- [EU AI Act](https://artificialintelligenceact.eu/)
- [GDPR](https://gdpr.eu/)
- [Semgrep Documentation](https://semgrep.dev/docs)

---

**Last Updated**: September 30, 2025
**Version**: 2025.09.30
**Maintainer**: brAInwav Security Team
**Contact**: security@brainwav.io
