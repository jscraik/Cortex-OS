#!/usr/bin/env node

// Security Validator Script
// This script validates that security fixes have been applied correctly

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

console.log('Running security validation...');

// Run Semgrep scan
try {
  console.log('Running Semgrep scan for ERROR severity issues...');
  const output = execSync(
    'semgrep --config=.semgrep/owasp-top-10-improved.yaml --severity=ERROR . 2>/dev/null',
    { encoding: 'utf-8' },
  );

  // Count the number of issues
  const issueCount = (output.match(/Code Findings/g) || []).length;

  if (issueCount === 0) {
    console.log('✅ No ERROR severity security issues found!');
    process.exit(0);
  } else {
    console.log(`❌ Found ${issueCount} ERROR severity security issues:`);
    console.log(output);
    process.exit(1);
  }
} catch (error) {
  if (error.status === 0) {
    // Semgrep exits with 0 even when issues are found
    const output = error.stdout || '';
    const issueCount = (output.match(/Code Findings/g) || []).length;

    if (issueCount === 0) {
      console.log('✅ No ERROR severity security issues found!');
      process.exit(0);
    } else {
      console.log(`❌ Found ${issueCount} ERROR severity security issues:`);
      console.log(output);
      process.exit(1);
    }
  } else {
    console.error('Error running Semgrep scan:', error.message);
    process.exit(1);
  }
}
