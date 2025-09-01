# Compliance Scripts

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

This directory contains scripts related to licensing, compliance, and governance.

## Categories

- **License Management**: Scripts for scanning and managing licenses
- **SBOM Generation**: Scripts that generate Software Bill of Materials
- **Governance**: Scripts that implement governance rules
- **Event Sanitization**: Scripts that sanitize events for compliance

## Usage

Compliance scripts should be run from the project root directory:

```bash
node scripts/compliance/license-scanner.mjs
```

or

```bash
node scripts/compliance/generate-sbom.mjs
```

## Best Practices

- Run compliance checks regularly during development
- Update SBOMs when dependencies change
- Document compliance requirements and processes
- Ensure license compatibility with project requirements
