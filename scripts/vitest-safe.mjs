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
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// CRITICAL MEMORY CONSTRAINTS - Never change these without system admin approval
const MEMORY_SAFE_NODE_OPTIONS = [
    '--max-old-space-size=1536',
    '--heapsnapshot-near-heap-limit=1',
    '--expose-gc',
    '--max-semi-space-size=64' // removed --optimize-for-size (unsupported in NODE_OPTIONS)
].join(' ');

const MEMORY_SAFE_VITEST_ENV = {
    // Vitest worker constraints
    'VITEST_MAX_THREADS': '1',
    'VITEST_MIN_THREADS': '1',
    'VITEST_MAX_FORKS': '1',
    'VITEST_MIN_FORKS': '1',
    'VITEST_POOL_TIMEOUT': '30000',

    // Force sequential execution
    'VITEST_FILE_PARALLELISM': 'false',
    'VITEST_SEQUENCE_CONCURRENT': 'false',

    // Node.js memory constraints
    'NODE_OPTIONS': MEMORY_SAFE_NODE_OPTIONS,

    // Disable daemon to prevent memory leaks
    'NX_DAEMON': 'false',
    'VITEST_REPORTER': 'default', // Avoid memory-heavy reporters
};

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
            const freeMemoryMB = (parseInt(freePages) * pageSize) / (1024 * 1024);
            if (freeMemoryMB < 2048) { // Less than 2GB free
                log('WARN', `Low system memory: ${freeMemoryMB.toFixed(0)}MB free. Consider running memory cleanup first.`);
                log('INFO', 'Run: pnpm memory:clean:gentle');
            }
        }
    } catch (error) {
        log('WARN', `Could not check system memory: ${error.message}`);
    }
}

function checkForRunningVitest() {
    try {
        const processes = execSync('pgrep -f "vitest.*run" || true', { encoding: 'utf-8' });
        if (processes.trim()) {
            log('ERROR', 'Other Vitest processes detected! This could cause memory exhaustion.');
            log('INFO', 'Run: pnpm memory:clean to cleanup existing processes');

            // List the processes for visibility
            try {
                const processDetails = execSync('ps -p ' + processes.trim().replace(/\n/g, ',') + ' -o pid,rss,command', { encoding: 'utf-8' });
                console.error('Running Vitest processes:');
                console.error(processDetails);
            } catch { }

            // Exit to prevent multiple vitest processes
            process.exit(1);
        }
    } catch (error) {
        // pgrep failed, probably no processes - that's good
        log('DEBUG', `Process check completed: ${error.message}`);
    }
}

function createMemoryWatchdog() {
    const watchdogInterval = setInterval(() => {
        try {
            // Check if our vitest process exists and its memory usage
            const pid = process.pid;
            const rss = execSync(`ps -o rss= -p ${pid}`, { encoding: 'utf-8' }).trim();
            const rssMB = parseInt(rss) / 1024;

            if (rssMB > 1800) { // Approaching our 1536MB limit + some buffer
                log('ERROR', `Memory usage critical: ${rssMB.toFixed(0)}MB. Terminating to prevent system freeze.`);
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

    // Force memory-safe configuration
    const enforcedArgs = [
        '--pool=forks',
        '--no-file-parallelism',
        '--max-workers=1',
        '--pool-options.forks.singleFork=true',
        '--pool-options.forks.maxForks=1',
        ...vitestArgs.filter(arg => !arg.startsWith('--pool') && !arg.startsWith('--max-workers')),
    ];

    log('INFO', `Spawning Vitest with args: ${enforcedArgs.join(' ')}`);
    log('INFO', `Memory constraints: ${MEMORY_SAFE_NODE_OPTIONS}`);

    // Spawn vitest with memory-safe environment
    const child = spawn('npx', ['vitest', ...enforcedArgs], {
        stdio: 'inherit',
        env: {
            ...process.env,
            ...MEMORY_SAFE_VITEST_ENV
        },
        cwd: process.cwd(),
    });

    // Handle process cleanup
    const cleanup = () => {
        clearInterval(watchdog);
        if (child && !child.killed) {
            log('INFO', 'Terminating Vitest process');
            child.kill('SIGTERM');
            setTimeout(() => child.kill('SIGKILL'), 5000); // Force kill after 5s
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
