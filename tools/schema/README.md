# CycloneDX 1.5 Schema

This directory hosts the official [CycloneDX 1.5](https://cyclonedx.org/) JSON schema used to validate Software Bill of Materials (SBOM) files within Cortex-OS.

## Validation

Use any draft-07 compatible JSON schema validator such as [Ajv](https://ajv.js.org/).

```ts
import fs from 'node:fs';
import Ajv from 'ajv';
import schema from './cyclonedx-1.5.schema.json' assert { type: 'json' };

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);
const sbom = JSON.parse(fs.readFileSync('bom.json', 'utf8'));

if (!validate(sbom)) {
  console.error(validate.errors);
}
```

A runnable example lives in `simple-tests/sbom-schema.test.ts` which validates the sample BOM at `simple-tests/fixtures/cyclonedx-sample.json`.
