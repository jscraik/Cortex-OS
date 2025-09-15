#!/usr/bin/env tsx
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { globby } from 'globby';
import micromatch from 'micromatch';
import { z } from 'zod';

type Policy = {
  protectedFiles: string[];
  allowedGlobs: string[];
  deniedGlobs: string[];
};
const policySchema = z.object({
  protectedFiles: z.array(z.string()),
  allowedGlobs: z.array(z.string()),
  deniedGlobs: z.array(z.string()).default([]),
});
const policyPath = resolve(process.cwd(), 'tools/structure-guard/policy.json');
console.log(`Reading policy from: ${policyPath}`);

// Read the policy to get allowedRootEntries
const policyData = JSON.parse(readFileSync(policyPath, 'utf8'));
const policy = policySchema.parse(policyData) as Policy;

// Extract root entries from policy
const allowedRootEntries = policyData.allowedRootEntries || [];

await (async () => {
  // Use a more targeted glob pattern to avoid matching cache and temporary files
  // Focus only on the main directories and files that should be in the root
  const files = await globby(
    [
      // Main directories
      'apps/**',
      'packages/**',
      'libs/**',
      'tools/**',
      'docs/**',
      'scripts/**',
      'config/**',
      'examples/**',
      'reports/**',
      'tmp/**',
      'bin/**',
      'infra/**',
      'k6/**',
      'ops/**',
      'data/**',
      'docker/**',
      'prisma/**',
      'project-documentation/**',
      'python/**',
      'sbom/**',
      'schemas/**',
      'servers/**',
      'simple-tests/**',
      'src/**',
      'patches/**',
      'comparisons/**',
      'contracts/**',
      'logs/**',
      'services/**',
      '.cortex/**',
      '.github/**',
      '.changeset/**',
      '.husky/**',
      '.nx/**',
      '.vscode/**',
      '.semgrep/**',
      '.claude/**',

      // Root files that should be allowed (from policy.allowedRootEntries)
      ...allowedRootEntries.filter((entry: string) => 
        !entry.startsWith('.') && 
        !entry.includes('/') && 
        !entry.includes('*') &&
        !['apps', 'packages', 'libs', 'tools', 'docs', 'scripts', 'config', 'examples', 'reports', 'tmp', 'bin', 'infra', 'k6', 'ops', 'data', 'docker', 'prisma', 'project-documentation', 'python', 'sbom', 'schemas', 'servers', 'simple-tests', 'src', 'patches', 'comparisons', 'contracts', 'logs', 'services', '.cortex', '.github', '.changeset', '.husky', '.nx', '.vscode', '.semgrep', '.claude'].includes(entry)
      ),

      // Also include common patterns for root files
      'package.json',
      'pnpm-workspace.yaml',
      'tsconfig*.json',
      'vitest*.config.ts',
      'Dockerfile*',
      'Makefile',
      'LICENSE',
      'NOTICE',
      '*.md',
      '*.txt',
      '*.json',
      '*.js',
      '*.ts',
      '*.py',
      '*.yaml',
      '*.yml',
      '*.toml',
      '*.lock',
      '.gitignore',
      '.gitattributes',
      '.gitmodules',
      '.dockerignore',
      '.editorconfig',
      '.mermaidrc',
      '.npmrc',
      '.nxignore',
      '.prettierignore',
      '.markdownlintignore',
      '.prettierrc',
      '.structure-override',
      '.tool-versions',
      '.vitestrc',
      '.graphite_config',
      '.env*',
      'knip.jsonc',

      // Explicitly exclude problematic patterns
      '!**/node_modules/**',
      '!**/dist/**',
      '!**/.git/**',
      '!**/.cache/**',
      '!**/.mypy_cache/**',
      '!**/.ruff_cache/**',
      '!**/.pytest_cache/**',
      '!**/.uv-cache/**',
      '!**/uv-cache/**',
      '!**/__pycache__/**',
      '!**/*.pyc',
      '!**/*.pyo',
      '!**/target/**',
      '!**/.turbo/**',
      '!**/.vite/**',
      '!**/build/**',
      '!**/.next/**',
      '!**/tmp/**',
      '!**/temp/**',
      '!**/coverage/**',
      '!**/.nyc_output/**',
      '!**/.orbstack/**',
      '!**/security_backups/**',
      '!**/*.secret',
      '!**/*.pem',
      '!**/*.key',
      '!**/.env.local',
      '!**/id_rsa',
      '!**/id_dsa',
      '!**/id_ecdsa',
      '!**/id_ed25519',
    ],
    {
      dot: true,
      onlyFiles: false, // Include directories
    },
  );

  console.log(`Found ${files.length} files/directories to check`);

  // Check each protected file pattern
  for (const pattern of policy.protectedFiles) {
    const matches = files.some((f) =>
      micromatch.isMatch(f, pattern, { dot: true }),
    );
    console.log(`Pattern "${pattern}": ${matches ? 'FOUND' : 'MISSING'}`);
    if (!matches) {
      // Show what files exist that might match
      const similar = files.filter((f) =>
        f.includes(pattern.split('/')[1] || ''),
      );
      if (similar.length > 0) {
        console.log(`  Similar files: ${similar.slice(0, 5).join(', ')}`);
      }
    }
  }

  const denied = files.filter((f) =>
    micromatch.isMatch(f, policy.deniedGlobs, { dot: true }),
  );
  if (denied.length) {
    console.error(`Denied paths:
    ${denied.join('\n')}`);
    console.error(
      "Auto-fix: remove or relocate these files, or update 'deniedGlobs'.",
    );
    process.exitCode = 4;
  }

  const bad = files.filter(
    (f) => !micromatch.isMatch(f, policy.allowedGlobs, { dot: true }),
  );
  if (bad.length) {
    console.error(`Disallowed paths:
    ${bad.slice(0, 20).join('\n')}`);
    if (bad.length > 20) {
      console.error(`... and ${bad.length - 20} more`);
    }
    console.error(
      "Auto-fix: move files to allowed locations or extend 'allowedGlobs'.",
    );
    process.exitCode = 2;
  }

  const missing = policy.protectedFiles.filter(
    (p) => !files.some((f) => micromatch.isMatch(f, p, { dot: true })),
  );
  if (missing.length) {
    console.error(`Missing protected paths:
    ${missing.join('\n')}`);
    console.error(
      "Auto-fix: restore required files or adjust 'protectedFiles'.",
    );
    process.exitCode = 3;
  }
})();