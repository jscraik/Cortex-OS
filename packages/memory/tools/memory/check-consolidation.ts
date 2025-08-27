#!/usr/bin/env node
/**
 * Memory Consolidation Checker
 *
 * Enforces that all memory-related files live under:
 * - apps/cortex-os/packages/memory/
 * - apps/cortex-os/packages/rag/
 *
 * Fails CI if violations are found.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ALLOWED_PREFIXES = [
  'apps/cortex-os/packages/memory',
  'apps/cortex-os/packages/rag',
  'apps/cortex-os/examples',
  'apps/cortex-cli/commands',
  'node_modules', // Dependencies
  '.git', // Git metadata
  'dist', // Build outputs
  'build', // Build outputs
  '.next', // Next.js outputs
];

// Additional exclusions for config files and tooling
const EXCLUDED_PATTERNS = [
  /package\.json$/,
  /tsconfig.*\.json$/,
  /\.config\.(js|ts|mjs)$/,
  /vitest\.config\.(js|ts)$/,
  /jest\.config\.(js|ts)$/,
  /\.d\.ts$/,
  /README\.md$/,
  /CHANGELOG\.md$/,
  /LICENSE$/,
];

function isAllowed(filePath: string): boolean {
  const relativePath = path.relative(ROOT, filePath);

  // Check if path starts with allowed prefix
  const isInAllowedDir = ALLOWED_PREFIXES.some((prefix) => relativePath.startsWith(prefix));

  if (isInAllowedDir) return true;

  // Check if file matches excluded patterns
  const isExcludedFile = EXCLUDED_PATTERNS.some((pattern) => pattern.test(relativePath));

  return isExcludedFile;
}

function hasMemoryKeywords(filename: string): boolean {
  const lower = filename.toLowerCase();
  return (
    lower.includes('memory') ||
    lower.includes('rag') ||
    lower.includes('vector') ||
    lower.includes('embedding') ||
    lower.includes('knowledge')
  );
}

const violations: string[] = [];

function walkDirectory(dir: string): void {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip hidden directories and common exclusions
        if (
          entry.name.startsWith('.') ||
          entry.name === 'node_modules' ||
          entry.name === 'dist' ||
          entry.name === 'build'
        ) {
          continue;
        }
        walkDirectory(fullPath);
      } else if (entry.isFile()) {
        if (hasMemoryKeywords(entry.name) && !isAllowed(fullPath)) {
          violations.push(path.relative(ROOT, fullPath));
        }
      }
    }
  } catch (error) {
    // Skip directories we can't read
    console.warn(`Warning: Could not read directory ${dir}`);
  }
}

// Start walking from project root
walkDirectory(ROOT);

if (violations.length > 0) {
  console.error('❌ Memory Consolidation Violations Found:');
  console.error('');
  console.error(
    'The following files contain memory/RAG keywords but are outside allowed directories:',
  );
  console.error('');

  for (const violation of violations) {
    console.error(`  • ${violation}`);
  }

  console.error('');
  console.error('Allowed directories:');
  for (const prefix of ALLOWED_PREFIXES.slice(0, 4)) {
    // Show main ones
    console.error(`  • ${prefix}/`);
  }

  console.error('');
  console.error('Move these files to the appropriate directory or update the consolidation rule.');
  console.error('See CONTEXT/library/rules/MEMORY_CONSOLIDATION.md for details.');

  process.exit(1);
} else {
  console.log('✅ Memory consolidation check passed');
  console.log(`Scanned project for memory-related files outside allowed directories.`);
}
