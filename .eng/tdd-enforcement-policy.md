# TDD Enforcement Policy - brAInwav Standards

## Overview

This document defines the Test-Driven Development enforcement policies for brAInwav Cortex-OS development, ensuring production readiness with 95/95 coverage standards.

## Policy Enforcement Levels

### Level 1: Advisory (Development Environment)

- TDD Coach provides guidance and suggestions
- Developers can override with justification
- Violations logged for trend analysis

### Level 2: Blocking (Pull Request)

- All quality gates must pass before merge
- No exceptions for coverage, security, or operational readiness
- Manual override requires lead engineer approval with documented justification

### Level 3: Hard Enforcement (Main Branch)

- Automatic revert of commits that break quality gates
- Zero tolerance for regressions
- brAInwav brand compliance verified on all outputs

## Gate Definitions

### Coverage Gates

- **Line Coverage**: ≥95% on changed code, with repository baseline ratcheting up
- **Branch Coverage**: ≥95% to ensure all conditional paths tested
- **Mutation Score**: ≥80% to prevent vacuous tests

### Security Gates

- **Vulnerability Count**: 0 Critical/High vulnerabilities allowed
- **Secrets Scanning**: Clean scan required, no hardcoded secrets
- **SBOM Generation**: Required for all deployable artifacts

### Operational Readiness Gates

- **Overall Score**: ≥95% across 20-point rubric
- **Health Endpoints**: Required for all services
- **Graceful Shutdown**: Proven with SIGTERM handling
- **Resource Limits**: Memory/CPU monitoring and protection

### Performance Gates

- **P95 Latency**: ≤250ms under expected load
- **Error Rate**: ≤0.5% under normal conditions  
- **Throughput**: ≥100 RPS minimum capacity

## Exemption Process

### Temporary Exemptions

- **Duration**: Maximum 7 days
- **Approval**: Lead engineer + security review for security gates
- **Documentation**: Justification and remediation plan required
- **Tracking**: Exemptions tracked and reported in weekly engineering reviews

### Permanent Exemptions

- **Approval**: Engineering director + security team for security gates
- **Documentation**: Architectural Decision Record (ADR) required
- **Review**: Annual review of all permanent exemptions

## Violation Response

### Immediate Actions

1. **Automated Prevention**: CI/CD blocks non-compliant changes
2. **Notification**: Slack alert to engineering team and package owners
3. **Tracking**: Violation logged in engineering metrics dashboard

### Escalation Process

1. **First Violation**: Developer coaching and TDD education
2. **Repeat Violations**: Manager notification and improvement plan
3. **Persistent Issues**: Architecture review and potential team reassignment

## brAInwav Brand Compliance

### Required Elements

- All system logs must include 'brAInwav' branding
- Commit messages must reference brAInwav development team
- Error messages and health checks must maintain brand visibility
- Documentation must reflect brAInwav standards and terminology

### Verification

- Automated scanning for brand compliance in all outputs
- Manual review for customer-facing interfaces
- Regular audit of observability and monitoring outputs

## Tooling Integration

### TDD Coach Integration

- Real-time coaching based on developer skill level
- Contextual guidance for quality gate violations
- Progress tracking across operational readiness criteria

### CI/CD Integration

- Quality gate enforcement in GitHub Actions
- Automated SARIF reporting and PR comments
- Integration with existing badge generation system

### Monitoring Integration

- Real-time dashboard showing quality metrics
- SLO tracking and alerting
- Trend analysis and improvement recommendations

## Metrics and Reporting

### Daily Metrics

- Coverage percentage by package
- Mutation score trends
- Quality gate pass/fail rates
- Violation count and type distribution

### Weekly Reports

- Engineering quality scorecard
- Exemption status and remediation progress
- Performance trend analysis
- Security posture assessment

### Monthly Reviews

- Policy effectiveness assessment
- Tool adoption and developer feedback
- Process improvement recommendations
- Investment in quality infrastructure

## Training and Support

### Developer Onboarding

- TDD fundamentals training
- Quality gate familiarization
- Tool usage training (TDD Coach, mutation testing, etc.)
- brAInwav standards orientation

### Ongoing Education

- Monthly engineering lunch-and-learns
- Best practice sharing sessions
- Tool update training
- Quality metric deep dives

### Support Resources

- TDD Coach documentation and troubleshooting
- Quality gate FAQ and common issues
- Engineering standards Slack channel
- Office hours with quality engineering team

## Policy Review and Updates

### Review Schedule

- **Quarterly**: Policy effectiveness and metrics review
- **Semi-annually**: Tool evaluation and upgrade planning
- **Annually**: Comprehensive policy revision

### Change Process

- RFC process for policy changes
- Engineering team review and feedback
- Staged rollout with monitoring
- Post-implementation review

This policy ensures brAInwav maintains the highest standards of code quality while supporting developer productivity and system reliability.
