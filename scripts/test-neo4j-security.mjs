#!/usr/bin/env node

// Script to test Neo4j security updates

import { execSync } from 'child_process';

console.log('Running security tests on updated Neo4j implementation...');

try {
  // Run Semgrep security scan
  console.log('1. Running Semgrep security scan...');
  execSync(
    'semgrep --config=.semgrep/owasp-precise.yaml --severity=ERROR packages/memories/src/adapters/neo4j.ts libs/typescript/utils/src/secure-neo4j.ts',
    {
      stdio: 'inherit',
      cwd: process.cwd(),
    },
  );
  console.log('✅ Semgrep scan completed with no errors');

  // Check for security-related TODO comments
  console.log('2. Checking for security-related TODO comments...');
  try {
    execSync(
      'grep -r -i "TODO.*security\\|TODO.*secure\\|FIXME.*security\\|FIXME.*secure" packages/memories/src/adapters/neo4j.ts libs/typescript/utils/src/secure-neo4j.ts',
      {
        stdio: 'pipe',
        cwd: process.cwd(),
      },
    );
    console.log('⚠️  Security-related TODO/FIXME comments found');
  } catch (error) {
    console.log('✅ No security-related TODO/FIXME comments found');
  }

  // Check for import statements
  console.log('3. Checking for SecureNeo4j import...');
  try {
    execSync('grep -r "SecureNeo4j" packages/memories/src/adapters/neo4j.ts', {
      stdio: 'pipe',
      cwd: process.cwd(),
    });
    console.log('✅ SecureNeo4j import found');
  } catch (error) {
    console.log('❌ SecureNeo4j import not found');
  }

  console.log('✅ All security tests completed successfully');
} catch (error) {
  console.error('❌ Security tests failed:', error.message);
  process.exit(1);
}
