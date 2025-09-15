#!/usr/bin/env node
/**
 * nx-smart.mjs
 * Adaptive wrapper around Nx to choose the smallest necessary scope (affected vs full) for build/test/lint/typecheck.
 * - Detects base reference via env (CI, GITHUB_BASE_REF) or falls back to origin/main.
 * - Falls back to full run-many when affected set is empty or detection fails.
 * - Supports metrics output, JSON mode, and dry-run.
 */
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import process from 'node:process';

// Early debug (can be removed later) to ensure script executes.
if (process.env.NX_SMART_DEBUG_BOOT) {
  console.error('[nx-smart][boot] argv=', JSON.stringify(process.argv));
}

// Enforce non-interactive defaults (auto-continue) unless explicitly overridden.
// This suppresses Nx "interactive help" prompts so users/agents don't need to press h/q.
// Users can pass --interactive to opt back in.
if (!process.env.NX_INTERACTIVE) {
  process.env.NX_INTERACTIVE = 'false';
}
// In some environments Nx only fully disables prompts when CI=true.
if (!process.env.CI) {
  process.env.CI = '1';
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: nx-smart <target> [--json] [--verbose] [--dry-run] [--interactive]');
  console.error('Examples:');
  console.error('  nx-smart build         # run affected build');
  console.error('  nx-smart test --dry-run # show affected summary only');
  process.exit(1);
}

const target = args[0];
const flags = args.slice(1);
const isDryRun = flags.includes('--dry-run');
// Focus list: allow narrowing affected projects via --focus a,b,c or env CORTEX_SMART_FOCUS
let focusList = [];
const focusFlagIndex = flags.indexOf('--focus');
if (focusFlagIndex !== -1) {
  const val = flags[focusFlagIndex + 1];
  if (val && !val.startsWith('--')) {
    focusList = val.split(',').map(s => s.trim()).filter(Boolean);
  }
}
if (process.env.CORTEX_SMART_FOCUS && process.env.CORTEX_SMART_FOCUS.trim()) {
  focusList = process.env.CORTEX_SMART_FOCUS.split(',').map(s => s.trim()).filter(Boolean);
}
// Detect interactive preference (default: non-interactive to avoid manual h/q prompts)
const forceInteractive = flags.includes('--interactive');
// Remove our custom flags before forwarding to nx
// Remove wrapper-specific flags and sanitize unsupported ones like --filter that should not leak to executors
let forwardedFlags = [];
let idx = 0;
while (idx < flags.length) {
  const f = flags[idx];
  if (['--interactive', '--dry-run', '--json', '--verbose', '--focus'].includes(f)) {
    idx += 1;
    continue;
  }
  if (f === '--filter') {
    const next = flags[idx + 1];
    if (next && !next.startsWith('--')) {
      idx += 2; // skip flag + value
    } else {
      idx += 1; // only flag present
    }
    continue;
  }
  forwardedFlags.push(f);
  idx += 1;
}
const json = flags.includes('--json');
const verbose = flags.includes('--verbose');

function log(msg) {
  if (!json) console.log(msg);
}

function getBaseRef() {
  // Preference order: explicit env -> GitHub base -> UPSTREAM_REF file -> default
  if (process.env.NX_BASE) return process.env.NX_BASE;
  if (process.env.GITHUB_BASE_REF) return process.env.GITHUB_BASE_REF.startsWith('origin/')
    ? process.env.GITHUB_BASE_REF
    : `origin/${process.env.GITHUB_BASE_REF}`;
  if (fs.existsSync('UPSTREAM_REF')) {
    try {
      const val = fs.readFileSync('UPSTREAM_REF', 'utf8').trim();
      if (val) return val;
    } catch { /* ignore */ }
  }
  return 'origin/main';
}

function getHeadRef() {
  if (process.env.NX_HEAD) return process.env.NX_HEAD;
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch { return 'HEAD'; }
}

function gitAvailable() {
  try { execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' }); return true; } catch { return false; }
}

function changedFiles(baseRef) {
  if (!gitAvailable()) return [];
  // Attempt to ensure the base ref exists locally, but avoid hanging on fetch in restricted environments.
  // If NX_SMART_NO_FETCH is set, skip fetch entirely.
  const remote = baseRef.split('/')[0] || 'origin';
  const branch = baseRef.split('/')[1] || 'main';
  const fullRef = `${remote}/${branch}`;
  const debug = !!process.env.NX_SMART_DEBUG_BOOT;
  let haveRef = false;
  try {
    execSync(`git rev-parse --verify ${fullRef}`, { stdio: 'ignore' });
    haveRef = true;
  } catch {
    haveRef = false;
  }
  if (!process.env.NX_SMART_NO_FETCH && !haveRef) {
    try {
      if (debug) console.error(`[nx-smart][git] fetching ${remote} ${branch}`);
      execSync(`git fetch --depth=1 ${remote} ${branch}`, { stdio: 'ignore' });
    } catch (e) {
      if (debug) console.error('[nx-smart][git] fetch failed:', e.message);
    }
  }
  try {
    if (debug) console.error(`[nx-smart][git] diff against ${baseRef}`);
    const diff = execSync(`git --no-pager diff --name-only ${baseRef} --`, { encoding: 'utf8' });
    return diff.split('\n').filter(Boolean);
  } catch { return []; }
}

function run(command) {
  if (forceInteractive) {
    process.env.NX_INTERACTIVE = 'true';
    delete process.env.CI; // allow full interactive behavior
  } else {
    process.env.NX_INTERACTIVE = 'false';
    process.env.CI = process.env.CI || '1';
  }
  if (verbose && !json) console.log('[exec]', command, `(NX_INTERACTIVE=${process.env.NX_INTERACTIVE})`);
  const result = spawnSync(command, { shell: true, stdio: 'inherit', env: { ...process.env } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const baseRef = getBaseRef();
const headRef = getHeadRef();
const files = changedFiles(baseRef);
const meta = { baseRef, headRef, changedCount: files.length, target };

// If no git, or no changed files (e.g., full clone or new branch), fallback to full run-many.
let strategy = 'affected';
if (files.length === 0) strategy = 'full-fallback';

// Heuristic: if only markdown/doc files changed and target is build/test -> skip gracefully
const nonDocChanged = files.filter(f => !f.match(/\.(md|mdx|txt)$/i));
if (['build', 'test', 'lint', 'typecheck'].includes(target) && nonDocChanged.length === 0) {
  meta.skipped = true;
  if (json) {
    console.log(JSON.stringify({ ...meta, strategy: 'skip-doc-only' }));
  } else {
    console.log(`[nx-smart] No relevant source changes for target '${target}' (doc-only). Skipping.`);
  }
  process.exit(0);
}

if (json) meta.strategy = strategy;
else log(`[nx-smart] target=${target} base=${baseRef} head=${headRef} changed=${files.length} strategy=${strategy}`);

if (strategy === 'affected') {
  // Preflight: determine affected projects explicitly
  let affectedList = [];
  try {
    const raw = execSync(
      `nx show projects --affected --base=${baseRef} --head=${headRef}`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    ).trim();
    if (raw) {
      if (raw.startsWith('[')) {
        // JSON array
        affectedList = JSON.parse(raw);
      } else {
        affectedList = raw.split('\n').map((s) => s.trim()).filter(Boolean);
      }
    }
  } catch (e) {
    if (verbose && !json) console.warn('[nx-smart] show projects --affected failed, falling back to run-many:', e.message);
    strategy = 'full-fallback';
  }

  // Apply focus filter BEFORE dry-run summary so it's reflected in output
  if (focusList.length > 0 && strategy === 'affected' && affectedList.length > 0) {
    const original = affectedList;
    const filtered = original.filter(p => focusList.includes(p));
    if (filtered.length > 0) {
      if (!json) log(`[nx-smart] focus (pre-summary) ${original.length}->${filtered.length}`);
      affectedList = filtered;
    }
  }

  // Handle dry-run mode - print affected summary and exit
  if (isDryRun) {
    if (strategy === 'affected') {
      if (json) {
        console.log(JSON.stringify({
          ...meta,
          strategy: 'dry-run-affected',
          affectedProjects: affectedList
        }));
      } else {
        console.log('\n📋 Affected Projects Summary:');
        console.log(`Target: ${target}`);
        console.log(`Base: ${baseRef}`);
        console.log(`Head: ${headRef}`);
        console.log(`Changed files: ${files.length}`);
        console.log(`Affected projects: ${affectedList.join(', ')}`);
        console.log(`\n💡 To execute: pnpm ${target}:smart`);
      }
    } else if (json) {
      console.log(JSON.stringify({
        ...meta,
        strategy: 'dry-run-fallback',
        wouldExecute: `nx run-many -t ${target} --parallel`
      }));
    } else {
      console.log('\n📋 Fallback Strategy Summary:');
      console.log(`[nx-smart][warn] affected strategy failed - would fall back to full run-many`);
      console.log(`Target: ${target}`);
      console.log(`Would execute: nx run-many -t ${target} --parallel`);
      console.log(`\n💡 To execute: pnpm ${target}`);
    }
    process.exit(0);
  }

  if (strategy === 'affected' && affectedList.length === 0) {
    meta.skipped = true;
    if (json) {
      console.log(JSON.stringify({ ...meta, strategy: 'skip-no-affected' }));
    } else {
      console.log('[nx-smart] No affected projects for target', target, '- skipping.');
    }
    process.exit(0);
  }

  if (strategy === 'affected') {
    // Apply focus filtering if provided
    if (focusList.length > 0) {
      const originalCount = affectedList.length;
      const intersect = affectedList.filter(p => focusList.includes(p));
      if (intersect.length > 0) {
        affectedList = intersect;
        if (!json) log(`[nx-smart] focus applied (${originalCount}->${intersect.length}): ${intersect.join(', ')}`);
      } else if (!json) {
        log('[nx-smart] focus requested but no overlap with affected set; proceeding with original affected list');
      }
    }
    if (!json) log(`[nx-smart] affected projects: ${affectedList.join(', ')}`);
    // Rely on NX_INTERACTIVE env (set above) instead of passing --no-interactive which Nx forwards to executors.
    // Passing --no-interactive caused underlying tools (tsc/tsup/vite/cargo) to error due to unknown flag.
    const interactiveFlag = forceInteractive ? '--interactive' : '';
    run(`nx affected -t ${target} --base=${baseRef} --head=${headRef} ${interactiveFlag} ${forwardedFlags.join(' ')}`.trim());
  } else {
    const interactiveFlag = forceInteractive ? '--interactive' : '';
    run(`nx run-many -t ${target} --parallel ${interactiveFlag} ${forwardedFlags.join(' ')}`.trim());
  }
} else {
  const interactiveFlag = forceInteractive ? '--interactive' : '';
  run(`nx run-many -t ${target} --parallel ${interactiveFlag} ${forwardedFlags.join(' ')}`.trim());
}

if (json) console.log(JSON.stringify({ ...meta, completed: true }));
