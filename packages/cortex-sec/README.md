# Cortex Security Compliance Package

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue)](https://www.typescriptlang.org/)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

**Security Compliance Planning and Risk Management for Cortex-OS**

_Orchestrates compliance strategies, risk aggregation, and remediation planning_

</div>

---

## 🎯 Purpose

The `cortex-sec` package provides **security compliance planning and orchestration** capabilities for Cortex-OS. It focuses on:

- **Compliance Strategy Planning**: Gap analysis and remediation roadmap generation
- **Risk Aggregation**: Computing aggregate risk scores across security standards
- **Remediation Orchestration**: Coordinating security fixes across teams
- **Policy Integration**: Reading and interpreting security policies from `.semgrep/policies/`
- **A2A Event Publishing**: Emitting compliance and security events

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    cortex-sec                            │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │  Planning       │  │  Events         │              │
│  │  Engine         │  │  Publisher      │              │
│  └─────────────────┘  └─────────────────┘              │
│           │                      │                      │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │  Compliance     │  │  Security       │              │
│  │  Planner        │  │  Integration    │              │
│  └─────────────────┘  └─────────────────┘              │
│           │                      │                      │
│           └──────────────────────┼──────────────────────┘
│                                  │                      │
└──────────────────────────────────┼──────────────────────┘
                                   │
                    ┌─────────────┴─────────────┐
                    │     .semgrep/policies/    │
                    │  (External Policy Store) │
                    └───────────────────────────┘
```

## 📦 Core Functions

### Compliance Planning
```typescript
import { createCompliancePlanner } from '@cortex-os/cortex-sec';

const planner = createCompliancePlanner({
  policyPath: '.semgrep/policies/',
  eventBus: a2aBus
});

const plan = await planner.generatePlan({
  standard: 'owasp-top10-2025',
  scanResults: semgrepFindings,
  riskThreshold: 0.35
});
```

### Risk Aggregation
```typescript
import { computeAggregateRisk } from '@cortex-os/cortex-sec';

const risk = computeAggregateRisk({
  signals: [
    { standard: 'owasp-top10-2025', riskScore: 0.42, outstandingViolations: 3 },
    { standard: 'cwe-top-25', riskScore: 0.38, outstandingViolations: 1 },
    { standard: 'nist-ai-rmf', riskScore: 0.25, outstandingViolations: 0 }
  ]
});
```

### Event Publishing
```typescript
import { createCortexSecEvent } from '@cortex-os/cortex-sec';

await eventBus.publish(createCortexSecEvent({
  type: 'security.violation.detected',
  data: { ruleId: 'sql-injection', severity: 'HIGH' },
  source: 'semgrep-scan'
}));
```

## 🔄 Integration Points

### With .semgrep Policies
The package reads security policies from `.semgrep/policies/`:
- Thresholds and risk limits
- Remediation windows
- Escalation rules
- Compliance requirements

### With A2A Event System
Emits structured CloudEvents for:
- Compliance violations
- Risk threshold breaches
- Remediation status updates
- Policy changes

### With cortex-semgrep-github
Provides compliance context for:
- PR comment formatting
- Check run results
- Escalation decisions

## 📊 Supported Standards

| Standard | Policy File | Risk Threshold | Remediation |
|----------|-------------|----------------|-------------|
| OWASP Top 10 2025 | `owasp-top10-2025-policies.yaml` | 0.35 | 4 hours |
| CWE Top 25 | `cwe-top-25-policies.yaml` | 0.40 | 8 hours |
| NIST AI RMF | `nist-ai-rmf-policies.yaml` | 0.45 | 24 hours |
| ISO 27001 | `iso27001-policies.yaml` | 0.40 | 24 hours |

## 🚀 Getting Started

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Run tests
pnpm test
```

## 📝 Usage Examples

### Generate Compliance Plan
```typescript
import { createCompliancePlanner } from '@cortex-os/cortex-sec';

const planner = createCompliancePlanner({
  policyPath: '.semgrep/policies/',
  eventBus: a2aBus
});

// Generate remediation plan
const plan = await planner.generatePlan({
  standard: 'owasp-top10-2025',
  scanResults: [
    { ruleId: 'sql-injection', severity: 'HIGH', file: 'src/db.ts' },
    { ruleId: 'weak-crypto', severity: 'MEDIUM', file: 'src/crypto.ts' }
  ]
});

console.log(`Remediation actions: ${plan.actions.length}`);
console.log(`Estimated effort: ${plan.estimatedHours} hours`);
```

### Monitor Compliance Status
```typescript
import { createCompliancePlanner } from '@cortex-os/cortex-sec';

const monitor = await planner.createMonitor({
  standards: ['owasp-top10-2025', 'cwe-top-25'],
  checkInterval: '1h'
});

monitor.on('violation', (event) => {
  console.log(`New violation: ${event.data.ruleId}`);
  // Trigger remediation workflow
});

monitor.on('threshold-breached', (event) => {
  console.log(`Risk threshold exceeded: ${event.data.riskScore}`);
  // Escalate to security team
});
```

## 🔧 Configuration

The package uses configuration from `.semgrep/policies/`:

```typescript
// No internal configuration needed
// Policies are loaded from external YAML files
const planner = createCompliancePlanner({
  policyPath: '.semgrep/policies/'  // Default path
});
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run specific test file
pnpm test -- src/planning/compliance-planner.test.ts
```

## 📈 Metrics and Monitoring

The package emits telemetry events for:
- Compliance score by standard
- Risk trend analysis
- Remediation velocity
- Policy adherence rates

## 🔄 Migration Notes

This package has been **refactored** to focus exclusively on compliance planning:

- **Static policies moved** to `.semgrep/policies/`
- **MCP tool implementations** removed (moved to appropriate packages)
- **Compliance planning enhanced** with new orchestration features
- **Event publishing improved** with structured CloudEvents

## 🤝 Contributing

When adding new compliance features:

1. Check if policy should go in `.semgrep/policies/`
2. Add compliance planning logic here
3. Emit appropriate A2A events
4. Update tests with 90%+ coverage

## 📞 Support

- **Documentation**: `/packages/cortex-sec/README.md`
- **Policy Issues**: Check `.semgrep/policies/`
- **Integration Help**: Review A2A event contracts

---

**Note**: This package is part of the brAInwav Cortex-OS security ecosystem and requires the `.semgrep/policies/` directory to function properly.
