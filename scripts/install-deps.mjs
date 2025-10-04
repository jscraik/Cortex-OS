#!/usr/bin/env node
// brAInwav – Install and verify workspace dependencies for v1.1 plan
import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

const NODE_PKGS = [
  '@langchain/langgraph',
  '@langchain/core',
  'fastify',
  '@fastify/cors',
  'zod',
  'zod-openapi',
  'prom-client',
  '@qdrant/js-client-rest',
  '@lancedb/lancedb',
];

const PY_PROJECT = resolve(ROOT, 'apps/cortex-py');

function sh(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts });
}

function have(cmd) {
  const r = spawnSync('bash', ['-lc', `command -v ${cmd} >/dev/null 2>&1`], { cwd: ROOT });
  return r.status === 0;
}

function addNodeDeps() {
  const list = NODE_PKGS.join(' ');
  console.log(`[deps] Adding/updating Node packages: ${list}`);
  sh(`pnpm -w add ${list}`);
}

function checkNodeDeps() {
  try {
    const out = execSync(`pnpm -w ls ${NODE_PKGS.join(' ')} --depth -1`, { cwd: ROOT });
    process.stdout.write(out);
  } catch {
    console.warn('[deps] pnpm ls reported missing packages. Run: pnpm run setup:deps');
  }
}

function syncPython() {
  if (!have('uv')) {
    console.warn('[deps] uv not found. Install uv or use your Python env manager. Skipping Python sync.');
    return;
  }
  console.log('[deps] Syncing Python (apps/cortex-py) with uv…');
  execSync('uv sync', { stdio: 'inherit', cwd: PY_PROJECT });
}

function checkPythonDeps() {
  if (!have('uv')) {
    console.warn('[deps] uv not found; cannot list Python deps.');
    return;
  }
  console.log('[deps] Python packages (apps/cortex-py):');
  execSync('uv pip list | rg -i "(mlx|codecarbon|deepeval|ragas)" || true', { stdio: 'inherit', cwd: PY_PROJECT, shell: 'bash' });
}

const CHECK_ONLY = process.argv.includes('--check');

if (CHECK_ONLY) {
  console.log('== brAInwav deps: CHECK MODE ==');
  checkNodeDeps();
  checkPythonDeps();
  process.exit(0);
}

console.log('== brAInwav deps: SETUP MODE ==');
// Node
if (!have('pnpm')) {
  console.error('pnpm not found in PATH. Install pnpm and retry.');
  process.exit(1);
}
addNodeDeps();
sh('pnpm -w install');

// Python (uv-managed)
syncPython();

console.log('\n[deps] Done. You can verify with: pnpm run check:deps');

