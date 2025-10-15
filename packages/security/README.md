# Security Package

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue)](https://www.typescriptlang.org/)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#build-status)
[![Test Coverage](https://img.shields.io/badge/coverage-95%25+-brightgreen)](#testing)
[![Security Scan](https://img.shields.io/badge/security-OWASP%20compliant-green)](#security)
[![SPIFFE](https://img.shields.io/badge/SPIFFE-enabled-orange)](https://spiffe.io/)
[![mTLS](https://img.shields.io/badge/mTLS-supported-purple)](https://en.wikipedia.org/wiki/Mutual_authentication)
[![Zero Trust](https://img.shields.io/badge/Zero%20Trust-architecture-red)](https://www.nist.gov/publications/zero-trust-architecture)

**SPIFFE/SPIRE Security Implementation for Cortex-OS**

_Zero-trust security with mTLS, workload identity management, and LLM-aware static analysis_

</div>

---

## 🎯 Features

- **🔐 SPIFFE/SPIRE Integration**: Complete workload identity verification system
- **🛡️ Mutual TLS (mTLS)**: Bidirectional authentication for all service communications
- **🆔 Workload Identity**: Dynamic identity attestation and credential rotation
- **🔄 Automatic Certificate Rotation**: Seamless certificate lifecycle management
- **📊 Security Telemetry**: Comprehensive security event monitoring and alerting
- **📨 Contract-Validated Events**: Emit CloudEvents with contract registry validation and policy enforcement
- **🔒 Zero Trust Architecture**: Never trust, always verify security model
- **🤖 LLM Security Analysis**: OWASP Top-10 LLM and MITRE ATLAS static analysis
- **✅ ASVS Alignment**: OWASP Application Security Verification Standard Level 2 baseline with targeted Level 3 controls
- **⚡ High Performance**: Optimized security operations with minimal overhead

## Quick Start

### Installation

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Run tests
pnpm test
```

### Basic Usage

```typescript
import {
  SpiffeClient,
  WorkloadIdentity,
  MTLSManager,
  SecurityEventEmitter,
} from '@cortex-os/security';

// Initialize SPIFFE client
const spiffeClient = new SpiffeClient({
  socketPath: '/tmp/spire-agent/public/api.sock',
  trustDomain: 'cortex-os.local',
});

// Get workload identity
const identity = await spiffeClient.fetchWorkloadIdentity();

// Setup mTLS
const mtlsManager = new MTLSManager(identity);

// Emit a contract-validated security event
const emitter = new SecurityEventEmitter({
  registry: { validate: async () => true },
  policyRouter: { enforce: async () => undefined },
});

await emitter.emit({
  type: 'security.audit',
  source: 'urn:cortex:security',
  schemaId: 'https://cortex.test/schemas/security/audit',
  data: { action: 'login' },
  evidence: ['trace-123'],
});
```

## Semgrep Security Scanning

Run the comprehensive LLM security analysis:

```bash
# Run security scan
pnpm -F @cortex-os/security semgrep

# Alternative command
pnpm semgrep
```

### Security Analysis Coverage

- **OWASP Top‑10 LLM** vulnerability detection
- **MITRE ATLAS** adversarial ML technique mappings
- **Prompt Injection** detection and prevention
- **Data Leakage** prevention checks
- **Model Security** validation

### Analysis Thresholds

The security scan fails on any finding with severity **WARNING** or higher. Results are exported to `semgrep.sarif` for CI/CD integration and automated security reporting.

## OWASP ASVS Alignment

| Requirement Family | Level 2 Status | Level 3 Status | Evidence Source |
| ------------------- | -------------- | -------------- | --------------- |
| Architecture & Threat Modeling (V1) | ✅ Implemented | ⚠️ Roadmap | ADRs, MITRE ATLAS navigator layer |
| Authentication & Session (V2/V3) | ✅ Implemented | ✅ Implemented | SPIFFE/SPIRE identities, OAuth 2.1 + PKCE |
| Access Control & Validation (V4/V5) | ✅ Implemented | ✅ Implemented | Policy engine guardrails, Zod schemas |
| Cryptography & Data Protection (V6/V8) | ✅ Implemented | ⚠️ Roadmap | KMS secrets, encryption backlog tracking |
| Error Handling & Logging (V7) | ✅ Implemented | ✅ Implemented | Structured audit logs, evidence IDs |
| Communications (V9) | ✅ Implemented | ✅ Implemented | TLS 1.3 + mTLS enforcement |
| Malicious Code & Configuration (V10/V14) | ✅ Implemented | ✅ Implemented | Semgrep OWASP/LLM scans, GitOps drift detection |
| Business Logic (V11) | ✅ Implemented | ⚠️ Roadmap | Abuse-case tests, manual approvals |
| Files, Resources & APIs (V12/V13) | ✅ Implemented | ✅ Implemented | Contract registry, rate limiting, CSP/sandbox |

> ⚠️ Roadmap items require linked remediation issues before release; compensating controls must be documented in PRs.
