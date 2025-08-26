#!/usr/bin/env node

/**
 * @file_path scripts/run-security-tests.mjs
 * @description Script to run all security tests and generate reports
 * @maintainer Security Team
 * @version 1.0.0
 */

import { execSync } from 'child_process';
import { writeFile } from 'fs/promises';
import { join } from 'path';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  fg: {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
  }
};

// Test categories
const testCategories = [
  {
    name: 'Static Analysis',
    description: 'Semgrep security scanning',
    command: 'npx semgrep scan --config=.semgrep/owasp-precise.yaml --severity=ERROR .',
    required: true
  },
  {
    name: 'Unit Tests',
    description: 'Security unit tests',
    command: 'npm run test:security:unit',
    required: true
  },
  {
    name: 'Integration Tests',
    description: 'Security integration tests',
    command: 'npm run test:security:integration',
    required: true
  },
  {
    name: 'Regression Tests',
    description: 'Security regression tests',
    command: 'npm run test:security:regression',
    required: true
  },
  {
    name: 'Dependency Audit',
    description: 'NPM dependency security audit',
    command: 'npm audit --audit-level=high',
    required: false
  },
  {
    name: 'Type Checking',
    description: 'TypeScript type checking',
    command: 'npx tsc --noEmit --project tsconfig.json',
    required: false
  }
];

// Test results storage
const testResults = [];

// Logger functions
function logInfo(message) {
  console.log(`${colors.fg.blue}[INFO]${colors.reset} ${message}`);
}

function logSuccess(message) {
  console.log(`${colors.fg.green}[SUCCESS]${colors.reset} ${message}`);
}

function logWarning(message) {
  console.log(`${colors.fg.yellow}[WARNING]${colors.reset} ${message}`);
}

function logError(message) {
  console.log(`${colors.fg.red}[ERROR]${colors.reset} ${message}`);
}

function logHeader(message) {
  console.log(`${colors.bright}${colors.fg.cyan}${message}${colors.reset}`);
}

// Function to run a single test
async function runTest(category) {
  logHeader(`\n🧪 Running ${category.name} Tests`);
  console.log(`📝 ${category.description}`);
  
  const startTime = Date.now();
  let success = false;
  let errorMessage = '';
  
  try {
    execSync(category.command, { stdio: 'inherit' });
    success = true;
    logSuccess(`✅ ${category.name} tests passed`);
  } catch (error) {
    errorMessage = error.message;
    if (category.required) {
      logError(`❌ ${category.name} tests failed: ${errorMessage}`);
    } else {
      logWarning(`⚠️  ${category.name} tests have warnings: ${errorMessage}`);
    }
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  const result = {
    category: category.name,
    description: category.description,
    success: success,
    required: category.required,
    duration: duration,
    errorMessage: errorMessage
  };
  
  testResults.push(result);
  
  return result;
}

// Function to generate a security report
async function generateSecurityReport() {
  logHeader('\n📊 Generating Security Report');
  
  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.success).length;
  const failedTests = testResults.filter(r => !r.success && r.required).length;
  const warningTests = testResults.filter(r => !r.success && !r.required).length;
  
  const overallStatus = failedTests > 0 ? 'FAIL' : 'PASS';
  const overallColor = overallStatus === 'PASS' ? colors.fg.green : colors.fg.red;
  
  const reportContent = `
# 🛡️ Security Test Report

**Generated:** ${new Date().toISOString()}
**Overall Status:** ${overallStatus}
**Tests Passed:** ${passedTests}/${totalTests}
**Tests Failed:** ${failedTests}/${totalTests}
**Tests With Warnings:** ${warningTests}/${totalTests}

## Test Results Summary

| Test Category | Description | Status | Duration (ms) |
|--------------|-------------|--------|---------------|
${testResults.map(result => 
  `| ${result.category} | ${result.description} | ${
    result.success ? '✅ PASS' : 
    result.required ? '❌ FAIL' : '⚠️  WARN'
  } | ${result.duration} |`
).join('\n')}

## Detailed Results

${testResults.map(result => 
  `### ${result.category}
- **Description:** ${result.description}
- **Status:** ${result.success ? '✅ PASS' : result.required ? '❌ FAIL' : '⚠️  WARN'}
- **Duration:** ${result.duration} ms
${!result.success && result.errorMessage ? `- **Error:** ${result.errorMessage}` : ''}
`
).join('\n')}

## Security Metrics

- **Security Coverage:** ${Math.round((passedTests / totalTests) * 100)}%
- **Critical Issues:** ${failedTests}
- **Warning Issues:** ${warningTests}
- **Total Test Duration:** ${testResults.reduce((sum, r) => sum + r.duration, 0)} ms

## Recommendations

${failedTests > 0 ? 
  '❌ Critical security issues must be addressed before deployment' : 
  '✅ No critical security issues found'}

${warningTests > 0 ? 
  '⚠️  Address warning issues to improve security posture' : 
  '✅ All security tests passed with no warnings'}
`;

  // Write report to file
  const reportPath = join(process.cwd(), 'security-report.md');
  await writeFile(reportPath, reportContent);
  
  logSuccess(`✅ Security report generated at ${reportPath}`);
  
  return {
    overallStatus,
    passedTests,
    failedTests,
    warningTests,
    totalTests
  };
}

// Function to display summary
function displaySummary(results) {
  logHeader('\n📋 Security Test Summary');
  
  console.log('');
  testResults.forEach(result => {
    const statusIcon = result.success ? 
      `${colors.fg.green}✅${colors.reset}` : 
      result.required ? 
        `${colors.fg.red}❌${colors.reset}` : 
        `${colors.fg.yellow}⚠️${colors.reset}`;
    
    console.log(`${statusIcon} ${result.category} (${result.duration}ms)`);
  });
  
  console.log('');
  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.success).length;
  const failedTests = testResults.filter(r => !r.success && r.required).length;
  
  logHeader(`📈 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (failedTests > 0) {
    logError(`❌ ${failedTests} critical security tests failed`);
    process.exit(1);
  } else {
    logSuccess('✅ All critical security tests passed');
  }
}

// Main function
async function main() {
  logHeader('🚀 Starting Security Tests');
  
  try {
    // Run all tests
    for (const category of testCategories) {
      await runTest(category);
    }
    
    // Generate security report
    const results = await generateSecurityReport();
    
    // Display summary
    displaySummary(results);
    
    // Exit with appropriate code
    if (results.failedTests > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    logError(`Unexpected error running security tests: ${error.message}`);
    process.exit(1);
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    logError(`Script failed: ${error.message}`);
    process.exit(1);
  });
}

// Export for use as module
export { runTest, generateSecurityReport, displaySummary };