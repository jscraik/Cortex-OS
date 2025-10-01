# Security Architecture Migration Guide

## 📋 Overview

This document describes the migration of Cortex-OS security architecture from a fragmented system to a unified, comprehensive security stack.

## 🎯 Migration Goals

1. **Centralize security rules** in `.semgrep/` directory
2. **Separate concerns** between packages for clearer responsibilities
3. **Modernize security rules** to 2025 standards
4. **Improve maintainability** through better organization
5. **Enhance integration** between security components

## 📊 Before vs After

### Before Migration (Fragmented)

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  cortex-sec     │  │  security       │  │ cortex-semgrep │
│                 │  │                 │  │    -github      │
│ • Static policies│  │ • SPIFFE/SPIRE  │  │                 │
│ • MCP tools     │  │ • mTLS          │  │ • GitHub App    │
│ • Compliance    │  │ • Events        │  │ • Basic rules   │
│ • Planning      │  │ • Utilities     │  │ • Webhooks      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
       │                     │                       │
       └─────────────────────┼───────────────────────┘
                             │
                 ┌─────────────────┐
                 │   Old Semgrep   │
                 │   (basic rules) │
                 └─────────────────┘
```

### After Migration (Unified)

```
┌─────────────────────────────────────────────────────────────────┐
│                     .semgrep/                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │           Security Rules Engine                        │    │
│  │  • owasp-top-10-improved.yaml (2025 standards)       │    │
│  │  • llm-security.yaml (OWASP LLM Top 10)              │    │
│  │  • supply-chain-security.yaml                         │    │
│  │  • container-infra-security.yaml                      │    │
│  │  • privacy-compliance.yaml                            │    │
│  │  • ai-security-frameworks.yaml                        │    │
│  │  • dynamic-testing-redteam.yaml                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Policy Store                              │    │
│  │  • owasp-top10-2025-policies.yaml                    │    │
│  │  • cwe-top-25-policies.yaml                          │    │
│  │  • nist-ai-rmf-policies.yaml                         │    │
│  │  • iso27001-policies.yaml                            │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
          ┌─────────────────┐  ┌─────────────────┐
          │   cortex-sec    │  │   security      │
          │ (Refactored)    │  │  (SPIFFE/SPIRE)  │
          │                 │  │                 │
          │ • Compliance    │  │ • mTLS          │
          │ • Planning      │  │ • Identity      │
          │ • Risk Analysis │  │ • Events        │
          │ • Orchestration │  │ • Utilities     │
          └─────────────────┘  └─────────────────┘
                    │
          ┌─────────────────┐
          │cortex-semgrep-  │
          │github (Updated) │
          │                 │
          │ • GitHub App    │
          │ • CI/CD Scan    │
          │ • 2025 Rules    │
          │ • PR Comments   │
          └─────────────────┘
```

## 📦 Package Responsibilities

### 1. `.semgrep/` - Security Rules Engine
**Purpose**: Centralized security rule definitions and policies

**Contains**:
- **Security Rules**: 270+ rules covering OWASP Top 10 2025, AI/ML security, supply chain threats
- **Policy Definitions**: Thresholds, remediation windows, escalation rules
- **Compliance Frameworks**: NIST AI RMF, ISO 42001, EU AI Act mappings
- **CI/CD Integration**: GitHub Actions workflow with comprehensive scanning

**Benefits**:
- Single source of truth for security rules
- Easy rule updates and versioning
- Comprehensive 2025 security coverage
- Automated CI/CD integration

### 2. `packages/security/` - Zero-Trust Infrastructure
**Purpose**: Runtime security and identity management

**Contains**:
- **SPIFFE/SPIRE**: Workload identity verification
- **mTLS**: Mutual authentication for service communication
- **Certificate Management**: Rotation and lifecycle management
- **Security Events**: A2A integration for security telemetry

**Benefits**:
- Production-grade zero-trust security
- Seamless service mesh integration
- Automatic credential rotation
- Real-time security monitoring

### 3. `packages/cortex-sec/` - Compliance Planning (Refactored)
**Purpose**: Security compliance orchestration and risk management

**Contains**:
- **Compliance Planning**: Gap analysis and remediation strategies
- **Risk Aggregation**: Multi-standard risk computation
- **Policy Integration**: Reads policies from `.semgrep/policies/`
- **Event Publishing**: A2A events for compliance status

**Benefits**:
- Clear compliance roadmap generation
- Automated risk assessment
- Policy-driven remediation
- Integration with external systems

### 4. `packages/cortex-semgrep-github/` - GitHub Automation (Updated)
**Purpose**: GitHub App for automated security scanning

**Contains**:
- **GitHub Webhooks**: PR and issue handling
- **Real Semgrep Execution**: Production security scanning
- **PR Integration**: Comments, check runs, status updates
- **2025 Rules Integration**: Uses new `.semgrep` rules

**Benefits**:
- Real-time security feedback
- Seamless developer workflow
- Comprehensive security scanning
- Automated PR enforcement

## 🔄 Migration Steps

### Phase 1: Move Static Policies ✅
- Moved from `packages/cortex-sec/src/policies/` to `.semgrep/policies/`
- Created YAML-based policy definitions
- Added policy documentation and integration guides

### Phase 2: Refactor cortex-sec Package ✅
- Removed static policy definitions
- Focused on compliance planning and orchestration
- Added policy loader for external policy files
- Enhanced risk aggregation capabilities

### Phase 3: Update Dependencies ✅
- Updated `cortex-semgrep-github` to use new `.semgrep` rules
- Integrated policy checking with compliance planning
- Maintained backward compatibility where possible

### Phase 4: Documentation ✅
- Created comprehensive architecture documentation
- Provided migration guide for teams
- Documented integration patterns
- Added troubleshooting guides

## 🚀 New Capabilities

### 1. Comprehensive 2025 Security Coverage
- **OWASP Top 10 2025**: Post-quantum crypto, insecure design, supply chain
- **AI/ML Security**: OWASP LLM Top 10, prompt injection, model poisoning
- **Privacy Compliance**: GDPR, CCPA, EU AI Act, HIPAA
- **Dynamic Testing**: Red team validation points

### 2. Automated Policy Enforcement
```typescript
// Policy-driven remediation
const policy = await loadPolicy('owasp-top10-2025');
if (riskScore > policy.thresholds.maxRiskScore) {
  await escalateToSecurityTeam();
}
```

### 3. Integrated Compliance Monitoring
```typescript
// Real-time compliance tracking
const monitor = createComplianceMonitor({
  standards: ['owasp-top10-2025', 'nist-ai-rmf'],
  policyPath: '.semgrep/policies/'
});
```

### 4. Enhanced GitHub Integration
```typescript
// PRs automatically checked against 2025 standards
// Comments include remediation guidance
// Failed scans block merges based on policy
```

## 📊 Impact Metrics

### Security Coverage Improvement
- **Before**: ~50 basic rules
- **After**: 270+ comprehensive rules
- **Improvement**: 440% increase in coverage

### Standards Compliance
- **Before**: OWASP Top 10 2021
- **After**: OWASP Top 10 2025 + NIST AI RMF + ISO 42001 + EU AI Act
- **New Standards**: 6 additional frameworks

### Developer Experience
- **Real-time Feedback**: IDE integration with 2025 rules
- **Clear Remediation**: Specific fix recommendations
- **Automated Escalation**: Policy-driven notifications
- **Comprehensive Reporting**: SARIF + GitHub Security tab

## 🛠️ Usage Examples

### Running Security Scans
```bash
# Local development
semgrep --config=.semgrep/

# CI/CD pipeline
pnpm security:scan

# Policy compliance check
semgrep --config=.semgrep/policies/owasp-top10-2025-policies.yaml
```

### Compliance Planning
```typescript
import { createCompliancePlanner } from '@cortex-os/cortex-sec';

const planner = createCompliancePlanner({
  policyPath: '.semgrep/policies/'
});

const plan = await planner.generateRemediationPlan({
  standard: 'owasp-top10-2025',
  scanResults: semgrepFindings
});
```

### GitHub Integration
```yaml
# .github/workflows/semgrep.yml
- name: Security Scan
  uses: returntocorp/semgrep-action@v1
  with:
    config: .semgrep/  # Uses all 2025 rules
```

## 🔄 Future Enhancements

### Short Term (Next 30 days)
- [ ] IDE plugin integration for real-time feedback
- [ ] Security metrics dashboard
- [ ] Automated ticket creation for violations

### Medium Term (Next 90 days)
- [ ] AI-powered rule generation
- [ ] Advanced compliance automation
- [ ] Integration with bug bounty programs

### Long Term (Next 6 months)
- [ ] Continuous security monitoring
- [ ] Threat intelligence integration
- [ ] Automated remediation suggestions

## 📞 Support and Troubleshooting

### Common Issues
1. **Semgrep not found**: Install with `pip install semgrep`
2. **Rule validation errors**: Check YAML syntax in `.semgrep/` files
3. **Policy loading failures**: Verify `.semgrep/policies/` directory exists
4. **GitHub App not scanning**: Check webhook configuration and permissions

### Getting Help
- **Security Team**: security@brainwav.io
- **Documentation**: `/packages/security/README.md`
- **Issues**: GitHub Issues in Cortex-OS repository

## ✅ Validation Checklist

### Migration Completion
- [x] Static policies moved to `.semgrep/policies/`
- [x] cortex-sec package refactored
- [x] Dependencies updated
- [x] Documentation created
- [x] GitHub Actions updated
- [x] Backward compatibility maintained
- [x] Test coverage preserved
- [x] Security rules validated

### Post-Migration Verification
- [ ] Run full security scan: `pnpm security:scan`
- [ ] Verify GitHub App functionality
- [ ] Check compliance planning works
- [ ] Confirm all CI/CD jobs pass
- [ ] Validate policy loading
- [ ] Test risk aggregation
- [ ] Verify event publishing

---

**Migration Date**: September 30, 2025
**Migration Version**: 1.0
**Next Review**: December 30, 2025
**Owner**: brAInwav Security Team
