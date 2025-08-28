# Compliance Scripts

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
