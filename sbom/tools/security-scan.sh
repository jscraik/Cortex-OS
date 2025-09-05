#!/usr/bin/env bash
set -euo pipefail

pnpm audit --json > sbom/reports/vulnerabilities/security-advisories.json
pip-audit --format=json > sbom/reports/vulnerabilities/pip-advisories.json 2>&1 || true
(cd apps/cortex-code && cargo audit --json) > sbom/reports/vulnerabilities/cargo-audit.json 2>&1 || true
jq -s '{npm:.[0], cargo:.[1]}' sbom/reports/vulnerabilities/security-advisories.json sbom/reports/vulnerabilities/cargo-audit.json > sbom/reports/vulnerabilities/cve-report.json
{ printf "Node vulnerability summary:\n"; jq '.npm.metadata.vulnerabilities' sbom/reports/vulnerabilities/cve-report.json; printf "Cargo vulnerabilities: "; jq '.vulnerabilities.list | length' sbom/reports/vulnerabilities/cargo-audit.json; } > sbom/reports/vulnerabilities/risk-assessment.txt

echo "Security scan complete."
