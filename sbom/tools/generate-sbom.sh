#!/usr/bin/env bash
set -euo pipefail

echo "Generating SBOM for Cortex-OS..."

# Generate CycloneDX SBOM (XML)
npx cyclonedx-bom -o sbom/formats/cyclonedx/cortex-os.cdx.xml .

# Convert to SPDX JSON
cyclonedx convert --input-file sbom/formats/cyclonedx/cortex-os.cdx.xml --output-format spdxjson --output-file sbom/formats/spdx/cortex-os.spdx.json

# Validate SBOMs
cyclonedx validate --input-file sbom/formats/cyclonedx/cortex-os.cdx.xml > sbom/formats/cyclonedx/bom-validation.txt
python -m spdx_tools.spdx.clitools.pyspdxtools --infile sbom/formats/spdx/cortex-os.spdx.json > sbom/formats/spdx/validation.txt 2>&1 || true

# Dependency reports
pnpm audit --json > sbom/reports/dependencies/npm-audit.json
pip-audit --format=json > sbom/reports/dependencies/pip-audit.json 2>&1 || true
(cd apps/cortex-code && cargo audit --json) > sbom/reports/dependencies/cargo-audit.json 2>&1 || true

# License reports
license-checker --json > sbom/reports/licenses/license-report.json
license-checker --summary > sbom/reports/licenses/license-analysis.txt

# Vulnerability aggregation
cp sbom/reports/dependencies/npm-audit.json sbom/reports/vulnerabilities/security-advisories.json
jq -s '{npm:.[0], cargo:.[1]}' sbom/reports/dependencies/npm-audit.json sbom/reports/dependencies/cargo-audit.json > sbom/reports/vulnerabilities/cve-report.json
{ printf "Node vulnerability summary:\n"; jq '.npm.metadata.vulnerabilities' sbom/reports/vulnerabilities/cve-report.json; printf "Cargo vulnerabilities: "; jq '.vulnerabilities.list | length' sbom/reports/dependencies/cargo-audit.json; } > sbom/reports/vulnerabilities/risk-assessment.txt

echo "SBOM generation complete."
