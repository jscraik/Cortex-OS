import Ajv from 'ajv';
import { readFileSync } from 'fs';
import { glob } from 'glob';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Validating policies against schemas...');

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
    const schemaFilename = filename.replace('.json', '.schema.json');
    const schemaPath = join(__dirname, '..', 'schemas', schemaFilename);
    
    // Check if schema exists
    try {
      const schemaData = readFileSync(schemaPath, 'utf8');
      const schema = JSON.parse(schemaData);
      
      // Validate with AJV
      const ajv = new Ajv();
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