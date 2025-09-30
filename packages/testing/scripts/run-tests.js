#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');

program
  .name('test-runner')
  .description('Cortex Memory test suite runner')
  .version('1.0.0');

program
  .command('unit')
  .description('Run unit tests only')
  .option('-w, --watch', 'Run in watch mode')
  .option('-c, --coverage', 'Generate coverage report')
  .action(async (options) => {
    const { execSync } = require('child_process');
    const args = [];

    if (options.watch) args.push('--watch');
    if (options.coverage) args.push('--coverage');

    const command = `npx vitest run src/unit ${args.join(' ')} --config vitest.config.ts`;
    console.log(`Running: ${command}`);
    execSync(command, { stdio: 'inherit', cwd: __dirname });
  });

program
  .command('integration')
  .description('Run integration tests')
  .option('-c, --coverage', 'Generate coverage report')
  .action(async (options) => {
    const { execSync } = require('child_process');
    const args = [];

    if (options.coverage) args.push('--coverage');

    const command = `npx vitest run src/integration ${args.join(' ')} --config vitest.integration.config.ts`;
    console.log(`Running: ${command}`);
    execSync(command, { stdio: 'inherit', cwd: __dirname });
  });

program
  .command('parity')
  .description('Run parity tests (STDIO vs HTTP)')
  .action(async () => {
    const { execSync } = require('child_process');
    const command = 'npx vitest run src/parity --config vitest.parity.config.ts';
    console.log(`Running: ${command}`);
    execSync(command, { stdio: 'inherit', cwd: __dirname });
  });

program
  .command('soak')
  .description('Run 8-hour soak tests')
  .option('-d, --duration <hours>', 'Test duration in hours', '8')
  .action(async (options) => {
    const { execSync } = require('child_process');
    console.log(`Running ${options.duration}-hour soak test...`);
    console.log('Note: This will run for a very long time!');

    const command = 'npx vitest run src/soak/soak-test.ts --config vitest.config.ts';
    execSync(command, { stdio: 'inherit', cwd: __dirname });
  });

program
  .command('all')
  .description('Run all tests (unit, integration, parity)')
  .option('-c, --coverage', 'Generate coverage report')
  .action(async (options) => {
    const { execSync } = require('child_process');

    console.log('🧪 Running complete test suite...\n');

    try {
      console.log('1️⃣ Unit Tests');
      execSync('npx vitest run src/unit --config vitest.config.ts', { stdio: 'inherit' });

      console.log('\n2️⃣ Integration Tests');
      execSync('npx vitest run src/integration --config vitest.integration.config.ts', { stdio: 'inherit' });

      console.log('\n3️⃣ Parity Tests');
      execSync('npx vitest run src/parity --config vitest.parity.config.ts', { stdio: 'inherit' });

      if (options.coverage) {
        console.log('\n📊 Generating combined coverage report...');
        execSync('npx vitest run --coverage', { stdio: 'inherit' });
      }

      console.log('\n✅ All tests passed!');
    } catch (error) {
      console.error('\n❌ Some tests failed');
      process.exit(1);
    }
  });

program
  .command('coverage')
  .description('Generate coverage report')
  .action(async () => {
    const { execSync } = require('child_process');
    execSync('npx vitest run --coverage', { stdio: 'inherit', cwd: __dirname });
  });

program
  .command('lint')
  .description('Lint test files')
  .action(async () => {
    const { execSync } = require('child_process');
    execSync('npx eslint src --ext .ts', { stdio: 'inherit', cwd: __dirname });
  });

program.parse();