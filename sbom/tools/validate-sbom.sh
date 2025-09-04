#!/usr/bin/env bash
set -euo pipefail

cyclonedx validate --input-file sbom/formats/cyclonedx/cortex-os.cdx.xml > sbom/formats/cyclonedx/bom-validation.txt
python -m spdx_tools.spdx.clitools.pyspdxtools --infile sbom/formats/spdx/cortex-os.spdx.json > sbom/formats/spdx/validation.txt 2>&1 || true

echo "Validation complete."
