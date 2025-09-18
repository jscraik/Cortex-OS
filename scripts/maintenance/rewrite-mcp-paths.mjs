#!/usr/bin/env node
/**
 * Rewrite legacy MCP Cloudflare path references to the new canonical location.
 * - from: packages/mcp/infrastructure/cloudflare/
 * -   to: packages/cortex-mcp/infrastructure/cloudflare/
 *
 * Also updates rotate config mentions and inlined shell usage.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

/** Files/globs to scan. We keep it simple and target known areas with old mentions. */
const TARGET_DIRS = [
  'docs',
  'docs/reports',
  'packages',
  'reports',
  'project-documentation',
  // include hidden cachey folders only if present and text files
];

const LEGACY = 'packages/mcp/infrastructure/cloudflare/';
const CANON = 'packages/cortex-mcp/infrastructure/cloudflare/';

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  '.nx',
  '.uv-cache',
  'coverage',
  'htmlcov',
  'dist',
  'build',
  '.DS_Store',
]);

/**
 * Recursively walk a directory and yield files.
 */
function* walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(p);
    } else {
      yield p;
    }
  }
}

function isTextLike(filePath) {
  const exts = [
    '.md', '.mdx', '.txt', '.json', '.yml', '.yaml', '.ts', '.tsx', '.js', '.mjs', '.cjs', '.py', '.sh', '.xml', '.plist'
  ];
  return exts.some((e) => filePath.endsWith(e));
}

let changedCount = 0;
const changedFiles = [];

for (const dir of TARGET_DIRS) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  for (const file of walk(abs)) {
    if (!isTextLike(file)) continue;
    // Skip large binaries by size heuristic
    const stat = fs.statSync(file);
    if (stat.size > 2_000_000) continue;

    const content = fs.readFileSync(file, 'utf8');
    if (!content.includes(LEGACY)) continue;

    const updated = content
      .replaceAll(LEGACY, CANON)
      .replaceAll('tunnel.rotate.config.yml', 'tunnel.rotate.config.yml'); // noop for clarity; keep in place if future rename

    if (updated !== content) {
      fs.writeFileSync(file, updated, 'utf8');
      changedCount++;
      changedFiles.push(path.relative(ROOT, file));
    }
  }
}

console.log(`[rewrite-mcp-paths] Updated ${changedCount} file(s).`);
if (changedFiles.length) {
  console.log(changedFiles.map((f) => ` - ${f}`).join('\n'));
}
