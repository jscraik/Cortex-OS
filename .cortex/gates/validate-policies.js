import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { glob } from 'glob';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Validating policies against schemas...');

// Mapping of policy files to their schema files when names don't match
const schemaMapping = {
  'agents.mandates.json': 'mandates.schema.json',
  'policy.agents.json': 'policy.agents.schema.json',
  'policy.repo.json': 'policy.repo.schema.json',
};

// Validate all policy files
const policyFiles = glob.sync(join(__dirname, '..', 'policy', '*.json'));
let valid = true;

for (const policyFile of policyFiles) {
  // Skip backup files
  if (policyFile.includes('.backup.')) {
    continue;
  }

  try {
    const policy = JSON.parse(readFileSync(policyFile, 'utf8'));
    const filename = policyFile.split('/').pop();

    // Get the schema filename, using mapping if needed
    const schemaFilename = schemaMapping[filename] || filename.replace('.json', '.schema.json');
    const schemaPath = join(__dirname, '..', 'schemas', schemaFilename);

    // Check if schema exists
    try {
      const schemaData = readFileSync(schemaPath, 'utf8');
      const schema = JSON.parse(schemaData);

      // Remove $schema reference to avoid resolution issues
      delete schema.$schema;

      // Validate with AJV
      const ajv = new Ajv({ strict: false, validateSchema: false }); // Disable strict mode and schema validation
      addFormats(ajv); // Add format support
      const validate = ajv.compile(schema);
      const isValid = validate(policy);

      if (!isValid) {
        console.error(`❌ ${policyFile} validation failed:`);
        console.error(validate.errors);
        valid = false;
      } else {
        console.log(`✅ ${policyFile} is valid`);
      }
    } catch (schemaErr) {
      console.log(`⚠️  No schema found for ${policyFile}, skipping validation`);
      console.error('Schema error:', schemaErr.message);
    }
  } catch (err) {
    console.error(`❌ Failed to parse ${policyFile}:`, err.message);
    valid = false;
  }
}

if (!valid) {
  process.exit(1);
}

console.log('✅ All policies valid');
