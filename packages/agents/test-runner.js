#!/usr/bin/env node

/**
 * Comprehensive test runner for the agents package
 * Supports different test modes and generates detailed reports
 */

import { spawn } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const TEST_MODES = {
  unit: './tests/unit/',
  integration: './tests/integration/',
  contract: './tests/contract/',
  security: './tests/security/',
  accessibility: './tests/accessibility/',
  golden: './tests/golden/',
  performance: './tests/performance/',
  all: './tests/',
};

const COVERAGE_THRESHOLDS = {
  functions: 90,
  branches: 90,
  lines: 90,
  statements: 90,
};

class TestRunner {
  constructor(options = {}) {
    this.options = {
      mode: 'all',
      coverage: false,
      watch: false,
      verbose: false,
      ui: false,
      reporter: 'default',
      ...options,
    };
    this.results = {
      passed: 0,
      failed: 0,
      duration: 0,
      coverage: null,
      errors: [],
    };
  }

  async run() {
    console.log('🧪 Starting Agents Package Test Suite...\n');

    try {
      await this.setupEnvironment();
      await this.runTests();
      await this.generateReport();
      await this.cleanup();

      if (this.results.failed > 0) {
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Test runner failed:', error.message);
      process.exit(1);
    }
  }

  async setupEnvironment() {
    console.log('🔧 Setting up test environment...');

    // Set environment variables
    process.env.NODE_ENV = 'test';
    process.env.VITEST_GOLDEN_SEED = '12345';
    process.env.MCP_NETWORK_EGRESS = 'disabled';

    // Create necessary directories
    mkdirSync('coverage', { recursive: true });
    mkdirSync('test-results', { recursive: true });
    mkdirSync('tests/golden/snapshots', { recursive: true });

    console.log('✅ Environment setup complete\n');
  }

  async runTests() {
    const startTime = Date.now();

    console.log(`🚀 Running tests in '${this.options.mode}' mode...\n`);

    const args = this.buildVitestArgs();

    try {
      await this.executeVitest(args);
      this.results.duration = Date.now() - startTime;
      console.log(`✅ Tests completed in ${this.results.duration}ms\n`);
    } catch (error) {
      this.results.duration = Date.now() - startTime;
      throw error;
    }
  }

  buildVitestArgs() {
    const args = ['vitest'];

    // Test mode
    if (this.options.mode === 'performance') {
      args.push('bench');
      args.push('./tests/performance/');
    } else {
      args.push('run');
    }

    // Test files pattern
    if (TEST_MODES[this.options.mode]) {
      args.push(TEST_MODES[this.options.mode]);
    }

    // Coverage
    if (this.options.coverage && this.options.mode !== 'performance') {
      args.push('--coverage');
      args.push('--coverage.thresholds.functions', COVERAGE_THRESHOLDS.functions);
      args.push('--coverage.thresholds.branches', COVERAGE_THRESHOLDS.branches);
      args.push('--coverage.thresholds.lines', COVERAGE_THRESHOLDS.lines);
      args.push('--coverage.thresholds.statements', COVERAGE_THRESHOLDS.statements);
    }

    // Watch mode
    if (this.options.watch) {
      args.push('--watch');
    }

    // UI mode
    if (this.options.ui) {
      args.push('--ui');
    }

    // Reporter
    if (this.options.verbose) {
      args.push('--reporter=verbose');
    } else if (this.options.reporter !== 'default') {
      args.push(`--reporter=${this.options.reporter}`);
    }

    // Additional options
    args.push('--run');
    args.push('--passWithNoTests=false');

    return args;
  }

  async executeVitest(args) {
    return new Promise((resolve, reject) => {
      const child = spawn('npx', args, {
        stdio: 'inherit',
        env: process.env,
      });

      child.on('close', (code) => {
        if (code === 0) {
          this.results.passed++;
          resolve();
        } else {
          this.results.failed++;
          reject(new Error(`Vitest exited with code ${code}`));
        }
      });

      child.on('error', (error) => {
        this.results.errors.push(error.message);
        reject(error);
      });
    });
  }

  async generateReport() {
    console.log('📊 Generating test report...');

    const report = {
      timestamp: new Date().toISOString(),
      mode: this.options.mode,
      results: this.results,
      thresholds: COVERAGE_THRESHOLDS,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };

    const reportPath = join('test-results', `test-report-${this.options.mode}-${Date.now()}.json`);
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`✅ Report saved to: ${reportPath}\n`);

    // Print summary
    this.printSummary();
  }

  printSummary() {
    console.log('📋 Test Summary');
    console.log('================');
    console.log(`Mode: ${this.options.mode}`);
    console.log(`Duration: ${this.results.duration}ms`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);

    if (this.results.errors.length > 0) {
      console.log(`Errors: ${this.results.errors.length}`);
      this.results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    console.log();

    if (this.results.failed === 0) {
      console.log('🎉 All tests passed!');
    } else {
      console.log('❌ Some tests failed. See details above.');
    }
  }

  async cleanup() {
    console.log('🧹 Cleaning up...');
    // Add any cleanup logic here
    console.log('✅ Cleanup complete\n');
  }
}

// CLI Interface
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--mode':
        options.mode = args[++i];
        break;
      case '--coverage':
        options.coverage = true;
        break;
      case '--watch':
        options.watch = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--ui':
        options.ui = true;
        break;
      case '--reporter':
        options.reporter = args[++i];
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Agents Package Test Runner

USAGE:
  node test-runner.js [OPTIONS]

OPTIONS:
  --mode <mode>      Test mode: ${Object.keys(TEST_MODES).join(', ')} (default: all)
  --coverage         Enable coverage reporting with thresholds
  --watch           Run in watch mode
  --verbose         Verbose output
  --ui              Run with Vitest UI
  --reporter <name> Reporter: default, verbose, json, junit
  --help, -h        Show this help

EXAMPLES:
  node test-runner.js --mode unit --coverage
  node test-runner.js --mode security --verbose
  node test-runner.js --mode performance
  node test-runner.js --watch --mode unit
  node test-runner.js --coverage --reporter json

ENVIRONMENT VARIABLES:
  VITEST_GOLDEN_SEED     Seed for deterministic tests (default: 12345)
  MCP_NETWORK_EGRESS     Network access control (default: disabled)
  NODE_ENV              Environment mode (set to 'test')
`);
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs();
  const runner = new TestRunner(options);
  runner.run();
}

export { TestRunner, TEST_MODES, COVERAGE_THRESHOLDS };
