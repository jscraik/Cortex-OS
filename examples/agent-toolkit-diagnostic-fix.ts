#!/usr/bin/env node

/**
 * Example: Using Agent-Toolkit to Resolve Diagnostic Issues
 *
 * This script demonstrates how to use the agent-toolkit package
 * to analyze and fix the TypeScript diagnostic issues in Cortex OS.
 */

import { createAgentToolkit } from '@cortex-os/agent-toolkit';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

async function main() {
  console.log('🔧 Starting Agent-Toolkit Diagnostic Resolution...\n');

  // Initialize the agent toolkit
  const toolkit = await createAgentToolkit();

  // Example 1: Using DiagnosticsService to analyze errors
  console.log('1. Analyzing diagnostics with DiagnosticsService...');
  const diagnostics = await toolkit.diagnostics.analyze({
    include: ['packages/agent-toolkit', 'apps/api'],
    exclude: ['node_modules', 'dist'],
    severity: ['error']
  });

  console.log(`Found ${diagnostics.errors.length} errors and ${diagnostics.warnings.length} warnings`);

  // Example 2: Fix missing imports using semgrep
  console.log('\n2. Fixing missing imports with semgrep...');
  const semgrepFixes = await toolkit.semgrep.applyFixes({
    patterns: [
      {
        id: 'missing-createId-import',
        pattern: 'createId(',
        fix: {
          prefix: "import { createId } from '@cortex-os/a2a-core';\n"
        }
      },
      {
        id: 'missing-database-import',
        pattern: 'type Database',
        fix: {
          prefix: "import type { Database } from '@cortex-os/database-types';\n"
        }
      }
    ],
    files: ['apps/api/src/**/*.ts', 'packages/agent-toolkit/src/**/*.ts']
  });

  console.log(`Applied ${semgrepFixes.length} semgrep fixes`);

  // Example 3: Structural code modifications with codemod
  console.log('\n3. Applying structural fixes with codemod...');
  const codemodResults = await toolkit.codemod.transform({
    rules: [
      {
        name: 'fix-default-exports',
        find: 'export default class :[className]',
        replace: 'export const :[className] = class :[className]',
        where: ['packages/agent-toolkit/src/**/*.ts']
      },
      {
        name: 'fix-promise-chains',
        find: ':[expr].then(:[result] => :[body])',
        replace: 'const :[result] = await :[expr];\n:[body]',
        where: ['apps/**/*.ts']
      }
    ]
  });

  console.log(`Applied ${codemodResults.length} codemod transformations`);

  // Example 4: Automated type fixing
  console.log('\n4. Fixing type issues...');
  const typeFixes = await toolkit.types.fixImplicitAny({
    files: ['packages/agent-toolkit/src/**/*.ts'],
    excludePatterns: ['__tests__', '*.test.ts'],
    suggestTypes: true
  });

  console.log(`Fixed ${typeFixes.length} implicit any types`);

  // Example 5: Cleanup unused imports
  console.log('\n5. Cleaning up unused imports...');
  const cleanupResults = await toolkit.cleanup.organizeImports({
    files: ['packages/agent-toolkit/src/index.ts'],
    removeUnused: true,
    sortImports: true
  });

  console.log(`Cleaned up imports in ${cleanupResults.length} files`);

  // Example 6: Validate fixes
  console.log('\n6. Validating fixes...');
  const validation = await toolkit.validation.run({
    targets: ['packages/agent-toolkit', 'apps/api'],
    checks: ['typescript', 'imports', 'exports']
  });

  if (validation.success) {
    console.log('✅ All fixes validated successfully!');
  } else {
    console.log('⚠️ Some issues remain:');
    validation.issues.forEach(issue => {
      console.log(`  - ${issue.file}:${issue.line}: ${issue.message}`);
    });
  }

  console.log('\n🎉 Agent-Toolkit diagnostic resolution complete!');
}

// Error handling
main().catch(error => {
  console.error('❌ Error running diagnostic resolution:', error);
  process.exit(1);
});