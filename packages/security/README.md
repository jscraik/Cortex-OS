# Security Package

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue)](https://www.typescriptlang.org/)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#build-status)
[![Test Coverage](https://img.shields.io/badge/coverage-95%25+-brightgreen)](#testing)
[![Security Scan](https://img.shields.io/badge/security-OWASP%20compliant-green)](#security)
[![SPIFFE](https://img.shields.io/badge/SPIFFE-enabled-orange)](https://spiffe.io/)
[![mTLS](https://img.shields.io/badge/mTLS-supported-purple)](https://en.wikipedia.org/wiki/Mutual_authentication)
[![Zero Trust](https://img.shields.io/badge/Zero%20Trust-architecture-red)](https://www.nist.gov/publications/zero-trust-architecture)

**SPIFFE/SPIRE Security Implementation for Cortex-OS**

*Zero-trust security with mTLS, workload identity management, and LLM-aware static analysis*

</div>

---

## 🎯 Features

- **🔐 SPIFFE/SPIRE Integration**: Complete workload identity verification system
- **🛡️ Mutual TLS (mTLS)**: Bidirectional authentication for all service communications
- **🆔 Workload Identity**: Dynamic identity attestation and credential rotation
- **🔄 Automatic Certificate Rotation**: Seamless certificate lifecycle management
- **📊 Security Telemetry**: Comprehensive security event monitoring and alerting
- **🔒 Zero Trust Architecture**: Never trust, always verify security model
- **🤖 LLM Security Analysis**: OWASP Top-10 LLM and MITRE ATLAS static analysis
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
import { SpiffeClient, WorkloadIdentity, MTLSManager } from '@cortex-os/security';

// Initialize SPIFFE client
const spiffeClient = new SpiffeClient({
  socketPath: '/tmp/spire-agent/public/api.sock',
  trustDomain: 'cortex-os.local'
});

// Get workload identity
const identity = await spiffeClient.fetchWorkloadIdentity();

// Setup mTLS
const mtlsManager = new MTLSManager(identity);
const secureServer = await mtlsManager.createSecureServer({
  port: 8443,
  cert: identity.x509Certificate,
  key: identity.privateKey
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
