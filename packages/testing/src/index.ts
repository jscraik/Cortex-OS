// Test utilities and exports
export * from './test-setup';

// Re-export test configurations
export { default as vitestConfig } from '../vitest.config';
export { default as integrationConfig } from '../vitest.integration.config';
export { default as parityConfig } from '../vitest.parity.config';

// Test runners
export const runUnitTests = async () => {
  const { execSync } = require('child_process');
  execSync('npx vitest run src/unit --config vitest.config.ts', { stdio: 'inherit' });
};

export const runIntegrationTests = async () => {
  const { execSync } = require('child_process');
  execSync('npx vitest run src/integration --config vitest.integration.config.ts', { stdio: 'inherit' });
};

export const runParityTests = async () => {
  const { execSync } = require('child_process');
  execSync('npx vitest run src/parity --config vitest.parity.config.ts', { stdio: 'inherit' });
};

export const runSoakTests = async () => {
  const { execSync } = require('child_process');
  execSync('npx vitest run src/soak/soak-test.ts --config vitest.config.ts', { stdio: 'inherit' });
};

export const runAllTests = async () => {
  console.log('Running all test suites...\n');

  console.log('1. Running unit tests...');
  await runUnitTests();

  console.log('\n2. Running integration tests...');
  await runIntegrationTests();

  console.log('\n3. Running parity tests...');
  await runParityTests();

  console.log('\nAll tests completed successfully!');
};