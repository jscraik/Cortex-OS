import Ajv from 'ajv';
import { readFileSync } from 'fs';
import { glob } from 'glob';

const ajv = new Ajv();

console.log('Validating policies against schemas...');

// Load all schemas
const schemaFiles = glob.sync('../schemas/*.schema.json');
const schemas = {};

for (const schemaFile of schemaFiles) {
  const schema = JSON.parse(readFileSync(schemaFile, 'utf8'));
  schemas[schema.$id] = schema;
  ajv.addSchema(schema);
}

// Validate all policy files
const policyFiles = glob.sync('../policy/*.json');
let valid = true;

for (const policyFile of policyFiles) {
  const policy = JSON.parse(readFileSync(policyFile, 'utf8'));
  const schemaId = `https://cortex-os.dev/schemas/${policyFile.split('/').pop()}`;
  
  if (schemas[schemaId]) {
    const validate = ajv.getSchema(schemaId);
    if (!validate(policy)) {
      console.error(`❌ ${policyFile} validation failed:`);
      console.error(validate.errors);
      valid = false;
    } else {
      console.log(`✅ ${policyFile} is valid`);
    }
  }
}

if (!valid) {
  process.exit(1);
}

console.log('✅ All policies valid');
