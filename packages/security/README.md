# @cortex-os/security

This package includes security utilities and enforces LLM-aware static analysis.

## Semgrep scanning

Run the LLM security rules:

```bash
pnpm -F @cortex-os/security semgrep
```

### Thresholds

The scan fails on any finding with severity **WARNING** or higher. Results are
exported to `semgrep.sarif` for CI reporting.

### Coverage

- **OWASP Top‑10 LLM** checks
- **MITRE ATLAS** technique mappings
