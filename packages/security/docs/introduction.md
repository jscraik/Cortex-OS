# Introduction

The `@cortex-os/security` package delivers zero-trust building blocks for Cortex-OS.
It combines SPIFFE/SPIRE workload identity, mutual TLS, and contract-validated event emission
to secure inter-service communication and auditing.

The package solves three core problems:

1. **Workload Identity** – cryptographic verification of running processes.
2. **Secure Transport** – automatic mTLS between trusted workloads.
3. **Policy Enforcement** – CloudEvents validated against a registry and policy router.
