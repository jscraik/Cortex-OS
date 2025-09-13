#!/usr/bin/env node
/**
 * sample-memory.mjs
 * Lightweight periodic memory sampler for Node-based monorepo operations (pnpm / nx / vitest).
 *
 * Usage examples:
 *  node scripts/sample-memory.mjs --tag install --interval 2000 --out .memory/install.jsonl -- pnpm install
 *  node scripts/sample-memory.mjs --tag build -- pnpm build
 *  (Or run separately in another terminal to just watch current process.)
 *
 * Modes:
 *  1. Wrapper mode: Arguments after `--` are spawned as a child process; this script samples that child.
 *  2. Self mode: If no command is provided after `--`, the script samples its own process (useful if you embed via require/import).
 *
 * Output: JSON lines with timestamp, rssMB, heapUsedMB, externalMB, arrayBuffersMB, cpu.percent (best-effort), tag, pid.
 *
 * Safe to add to gitignore for output artifacts. The sampler is intentionally minimal (no deps) and low overhead.
 */

import { spawn } from 'node:child_process';
import os from 'node:os';

const args = process.argv.slice(2);
function parseArgs(raw) {
    const opts = { interval: 3000, tag: 'session', out: null, command: [] };
    let i = 0;
    while (i < raw.length) {
        const a = raw[i];
        if (a === '--') { // remainder is command
            opts.command = raw.slice(i + 1);
            break;
        }
        switch (a) {
            case '--interval':
                opts.interval = Number(raw[++i] ?? 3000) || 3000;
                break;
            case '--tag':
                opts.tag = raw[++i] || opts.tag;
                break;
            case '--out':
                opts.out = raw[++i] || null;
                break;
            case '--help':
            case '-h':
                printHelp();
                process.exit(0);
            default:
                if (a.startsWith('--')) {
                    console.error(`Unknown option: ${a}`);
                    printHelp();
                    process.exit(1);
                }
        }
        i++;
    }
    return opts;
}

function printHelp() {
    console.log(`Memory Sampler\n\n` +
        `Usage: node scripts/sample-memory.mjs [options] -- [command ...]\n\n` +
        `Options:\n` +
        `  --interval <ms>   Sampling interval (default 3000)\n` +
        `  --tag <label>     Tag to include in each record (default 'session')\n` +
        `  --out <file>      Write JSONL samples to file (append). If omitted, stdout only.\n` +
        `  -h, --help        Show this help.\n\n` +
        `Examples:\n` +
        `  node scripts/sample-memory.mjs --tag install --interval 1500 --out .memory/install.jsonl -- pnpm install\n` +
        `  node scripts/sample-memory.mjs --tag build -- pnpm build\n` +
        `  node scripts/sample-memory.mjs --interval 1000            # self-sampling mode\n`);
}

const options = parseArgs(args);

// Lazy build file writer
let fileStream = null;
if (options.out) {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const dir = path.dirname(options.out);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fileStream = fs.createWriteStream(options.out, { flags: 'a' });
}

function sample(pid, tag, extra = {}) {
    const mem = process.memoryUsage();
    const record = {
        time: new Date().toISOString(),
        pid,
        tag,
        rssMB: +(mem.rss / 1024 / 1024).toFixed(2),
        heapUsedMB: +(mem.heapUsed / 1024 / 1024).toFixed(2),
        externalMB: +(mem.external / 1024 / 1024).toFixed(2),
        arrayBuffersMB: +(mem.arrayBuffers / 1024 / 1024).toFixed(2),
        loadAvg: os.loadavg().map(n => +n.toFixed(2)),
        ...extra
    };
    const line = JSON.stringify(record);
    if (fileStream) fileStream.write(line + '\n');
    else console.log(line);
}

function startSampling(pid, tag, getCpuInfo) {
    const interval = setInterval(() => {
        let cpu = {};
        if (getCpuInfo) {
            try { cpu = getCpuInfo() || {}; } catch { /* ignore */ }
        }
        sample(pid, tag, cpu);
    }, options.interval);
    return () => clearInterval(interval);
}

async function run() {
    if (!options.command.length) {
        // Self mode
        const stop = startSampling(process.pid, options.tag);
        console.error(`[memory-sampler] Sampling current process pid=${process.pid} every ${options.interval}ms (tag=${options.tag})`);
        process.on('SIGINT', () => { stop(); process.exit(0); });
        return; // keep process alive
    }

    const child = spawn(options.command[0], options.command.slice(1), {
        stdio: 'inherit',
        env: process.env
    });

    console.error(`[memory-sampler] Launched child pid=${child.pid} tag=${options.tag}`);
    const stop = startSampling(child.pid, options.tag);

    child.on('exit', (code, signal) => {
        stop();
        sample(child.pid, options.tag, { final: true, exitCode: code ?? null, signal: signal ?? null });
        if (fileStream) fileStream.end();
        if (code !== 0) {
            console.error(`[memory-sampler] Child exited with code=${code} signal=${signal ?? 'none'}`);
            process.exit(code || 1);
        }
    });
}

run().catch(err => {
    console.error('[memory-sampler] Error:', err);
    process.exit(1);
});
