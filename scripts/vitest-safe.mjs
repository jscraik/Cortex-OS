#!/usr/bin/env node
/**
 * Memory-safe Vitest wrapper script
 *
 * This script ensures all Vitest runs have proper memory constraints to prevent
 * 2.5GB+ processes that can freeze the system. Individual package test scripts
 * should use this wrapper instead of direct `vitest run`.
 *
 * Usage: node scripts/vitest-safe.mjs [vitest-args...]
 */

import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Load .env.local early so MLX/HF paths are available to tests
try {
  const dotenv = await import('dotenv');
  const cwd = process.cwd();
  const localPath = join(cwd, '.env.local');
  const envFile = fs.existsSync(localPath) ? localPath : join(cwd, '.env');
  dotenv.config({ path: envFile });
  // eslint-disable-next-line no-console
  if (process.env.VITEST_SAFE_DEBUG_ENV === '1')
    console.error('[vitest-safe] env loaded:', envFile);
} catch {
  // optional
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const _rootDir = join(__dirname, '..');

// CRITICAL MEMORY CONSTRAINTS - Never change these without system admin approval
const MEMORY_SAFE_NODE_OPTIONS = [
  '--max-old-space-size=1536',
  '--heapsnapshot-near-heap-limit=1',
  '--expose-gc',
  '--max-semi-space-size=64', // removed --optimize-for-size (unsupported in NODE_OPTIONS)
].join(' ');

const MEMORY_SAFE_VITEST_ENV = {
  // Vitest worker constraints
  VITEST_MAX_THREADS: '1',
  VITEST_MIN_THREADS: '1',
  VITEST_MAX_FORKS: '1',
  VITEST_MIN_FORKS: '1',
  VITEST_POOL_TIMEOUT: '30000',

  // Force sequential execution
  VITEST_FILE_PARALLELISM: 'false',
  VITEST_SEQUENCE_CONCURRENT: 'false',

  // Node.js memory constraints
  NODE_OPTIONS: MEMORY_SAFE_NODE_OPTIONS,

  // Disable daemon to prevent memory leaks
  NX_DAEMON: 'false',
  VITEST_REPORTER: 'default', // Avoid memory-heavy reporters
};

// Cap for total concurrent vitest processes system-wide (workers + controller)
const MAX_VITEST_PROCESSES_SAFE = parseInt(process.env.MAX_VITEST_PROCESSES_SAFE || '2', 10);

function log(level, message) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [VITEST-SAFE] [${level}] ${message}`);
}

function validateSystemMemory() {
  try {
    // Check available system memory (macOS)
    const vmStat = execSync('vm_stat', { encoding: 'utf-8' });
    const freePages = vmStat.match(/Pages free:\s+(\d+)/)?.[1];
    const pageSize = 4096; // 4KB pages on macOS

    if (freePages) {
      const freeMemoryMB = (parseInt(freePages, 10) * pageSize) / (1024 * 1024);
      if (freeMemoryMB < 2048) {
        // Less than 2GB free
        log(
          'WARN',
          `Low system memory: ${freeMemoryMB.toFixed(0)}MB free. Consider running memory cleanup first.`,
        );
        log('INFO', 'Run: pnpm memory:clean:gentle');
      }
    }
  } catch (error) {
    log('WARN', `Could not check system memory: ${error.message}`);
  }
}

function shouldAllowConcurrentVitest() {
  return (
    process.env.VITEST_ALLOW_CONCURRENT === 'true' ||
    process.env.NODE_ENV === 'development' ||
    process.env.VSCODE_PID
  ); // VS Code terminal detection
}

function isVSCodeProcess(pid) {
  try {
    const parentPid = execSync(`ps -o ppid= -p ${pid.trim()}`, { encoding: 'utf-8' }).trim();
    const parentCmd = execSync(`ps -o command= -p ${parentPid}`, { encoding: 'utf-8' });
    return parentCmd.includes('Code Helper') || parentCmd.includes('Visual Studio Code');
  } catch {
    return false;
  }
}

function hasVSCodeVitestProcess(pids) {
  for (const pid of pids) {
    if (pid.trim() && isVSCodeProcess(pid)) {
      return true;
    }
  }
  return false;
}

function listVitestPids() {
  try {
    // Match controller and worker processes, including Activity Monitor style "node (vitest 1)"
    const out = execSync('pgrep -f "(vitest( |$)|vitest.*run|\\(vitest)" || true', {
      encoding: 'utf-8',
    });
    return out.trim() ? out.trim().split('\n').filter(Boolean) : [];
  } catch {
    return [];
  }
}

function checkForRunningVitest() {
  if (shouldAllowConcurrentVitest()) {
    log('INFO', 'Concurrent vitest processes allowed in development mode');
    return;
  }

  try {
    const pids = listVitestPids();
    if (pids.length === 0) return;

    if (hasVSCodeVitestProcess(pids)) {
      log('INFO', 'VS Code vitest process detected - allowing concurrent execution');
      return;
    }

    log('WARN', 'Other non-VS Code Vitest processes detected! This could cause memory exhaustion.');
    log(
      'INFO',
      'Run: pnpm memory:clean to cleanup existing processes, or set VITEST_ALLOW_CONCURRENT=true',
    );

    // List the processes for visibility
    try {
      const processDetails = execSync(`ps -p ${pids.join(',')} -o pid,rss,command`, {
        encoding: 'utf-8',
      });
      console.error('Running Vitest processes:');
      console.error(processDetails);
    } catch { }

    // Don't exit if we detect this might be a development scenario
    if (!process.env.CI) {
      log('WARN', 'Non-CI environment detected - continuing with caution');
      return;
    }

    // Enforce global cap even locally if too many processes exist
    if (pids.length > MAX_VITEST_PROCESSES_SAFE) {
      log(
        'ERROR',
        `Too many vitest processes detected: ${pids.length} (cap=${MAX_VITEST_PROCESSES_SAFE}). Aborting to protect memory.`,
      );
      process.exit(1);
    }
  } catch (error) {
    log('DEBUG', `Process check completed: ${error.message}`);
  }
}

function createMemoryWatchdog() {
  const watchdogInterval = setInterval(() => {
    try {
      // Check if our vitest process exists and its memory usage
      const pid = process.pid;
      const rss = execSync(`ps -o rss= -p ${pid}`, {
        encoding: 'utf-8',
      }).trim();
      const rssMB = parseInt(rss, 10) / 1024;

      if (rssMB > 1800) {
        // Approaching our 1536MB limit + some buffer
        log(
          'ERROR',
          `Memory usage critical: ${rssMB.toFixed(0)}MB. Terminating to prevent system freeze.`,
        );
        process.exit(1);
      } else if (rssMB > 1200) {
        log('WARN', `High memory usage: ${rssMB.toFixed(0)}MB`);
      }
    } catch (error) {
      // Process might have ended, clear interval
      log('DEBUG', `Watchdog check failed: ${error.message}`);
      clearInterval(watchdogInterval);
    }
  }, 5000); // Check every 5 seconds

  return watchdogInterval;
}

function main() {
  log('INFO', 'Starting memory-safe Vitest execution');

  // Pre-flight safety checks
  validateSystemMemory();
  checkForRunningVitest();

  // Start memory watchdog
  const watchdog = createMemoryWatchdog();

  // Prepare vitest command with memory-safe environment
  const vitestArgs = process.argv.slice(2);

  // Force memory-safe configuration; allow opt-in to threads pool
  const wantThreads =
    process.env.VITEST_POOL === 'threads' ||
    vitestArgs.some((a) => a === '--pool=threads' || a === '--pool' && vitestArgs.includes('threads'));

  const baseFiltered = vitestArgs.filter(
    (arg) =>
      !arg.startsWith('--pool') &&
      !arg.startsWith('--max-workers') &&
      arg !== '--interactive' &&
      arg !== '--no-interactive',
  );

  const enforcedArgs = wantThreads
    ? [
      '--pool=threads',
      '--no-file-parallelism',
      '--max-workers=1',
      ...baseFiltered,
    ]
    : [
      '--pool=forks',
      '--no-file-parallelism',
      '--max-workers=1',
      '--pool-options.forks.singleFork=true',
      '--pool-options.forks.maxForks=1',
      ...baseFiltered,
    ];

  log('INFO', `Spawning Vitest with args: ${enforcedArgs.join(' ')}`);
  log('INFO', `Memory constraints: ${MEMORY_SAFE_NODE_OPTIONS}`);

  // Resolve vitest binary directly to avoid npx/npm exec process indirection
  // Prefer local binary from workspace. Fallback to require.resolve if not on PATH.
  const require = createRequire(import.meta.url);
  const vitestBin = 'vitest';
  try {
    // vitest exposes a bin at node_modules/.bin/vitest via package.json "bin"
    // Using require.resolve on the package main gives us a path; we derive bin nearby.
    const vitestMain = require.resolve('vitest');
    // node_modules/vitest/dist/... -> node_modules/.bin/vitest is usually available on PATH
    // To be explicit, pick the CLI entrypoint exported by vitest: vitest/node.mjs supports CLI
    // But safest is to execute the bin name relying on local node_modules/.bin precedence.
    if (vitestMain) {
      // No change needed; rely on local .bin in PATH
    }
  } catch {
    // keep default 'vitest' expecting it on PATH
  }

  // Spawn vitest as a new process group; this allows killing the entire group on cleanup
  const child = spawn(vitestBin, [...enforcedArgs], {
    stdio: 'inherit',
    env: {
      ...process.env,
      ...MEMORY_SAFE_VITEST_ENV,
    },
    cwd: process.cwd(),
    detached: true,
  });

  // Handle process cleanup
  const cleanup = () => {
    clearInterval(watchdog);
    if (child && !child.killed) {
      try {
        // Kill entire process group: negative PID targets the group leader
        log('INFO', 'Terminating Vitest process group (SIGTERM)');
        process.kill(-child.pid, 'SIGTERM');
      } catch {
        // Fall back to direct child
        try {
          child.kill('SIGTERM');
        } catch { }
      }
      // Force-kill after grace period
      setTimeout(() => {
        try {
          log('INFO', 'Force-killing Vitest process group (SIGKILL)');
          process.kill(-child.pid, 'SIGKILL');
        } catch {
          try {
            child.kill('SIGKILL');
          } catch { }
        }
      }, 5000);
    }
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);

  child.on('error', (error) => {
    log('ERROR', `Vitest process error: ${error.message}`);
    cleanup();
    process.exit(1);
  });

  child.on('close', (code, signal) => {
    cleanup();

    if (signal) {
      log('INFO', `Vitest terminated by signal: ${signal}`);
    } else {
      log('INFO', `Vitest completed with exit code: ${code}`);
    }

    process.exit(code || 0);
  });
}

// Only run if this script is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { MEMORY_SAFE_NODE_OPTIONS, MEMORY_SAFE_VITEST_ENV };
