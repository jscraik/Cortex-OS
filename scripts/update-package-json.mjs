import { readFile, writeFile } from 'fs/promises';

// Main async function
async function updatePackageJson() {
  // Read the current package.json
  const packageJson = JSON.parse(await readFile('./package.json', 'utf8'));

  // Add security test scripts
  packageJson.scripts = {
    ...packageJson.scripts,
    'test:security:unit':
      'vitest run tests/security/database-wrapper.unit.test.ts tests/security/neo4j-wrapper.unit.test.ts tests/security/command-executor.unit.test.ts',
    'test:security:integration': 'vitest run tests/security/security-wrappers.integration.test.ts',
    'test:security:regression': 'vitest run tests/security/security-regression.test.ts',
    'test:security:coverage': 'vitest run tests/security/ --coverage',
    'test:security:all':
      'npm run test:security:unit && npm run test:security:integration && npm run test:security:regression',
    'test:security:ci': 'npm run test:security:all -- --reporter=dot',
    'security:scan': 'semgrep scan --config=.semgrep/owasp-precise.yaml --severity=ERROR .',
    'security:scan:all':
      'semgrep scan --config=.semgrep/owasp-precise.yaml --config=.semgrep/owasp-top-10-improved.yaml .',
    'security:audit': 'npm audit --audit-level=high',
    'security:typecheck': 'npx tsc --noEmit --project tsconfig.json',
    'security:run': 'node scripts/run-security-tests.mjs',
  };

  // Write the updated package.json
  await writeFile('./package.json', JSON.stringify(packageJson, null, 2));

  console.log('✅ Added security test scripts to package.json');
}

updatePackageJson();
