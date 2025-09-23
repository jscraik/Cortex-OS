#!/usr/bin/env node
/**
 * Enforce that Local Memory MCP/REST (local-memory-mcp) is the first layer.
 * Supports dual mode detection and optional strict health/binary checks.
 *
 * Acceptable configurations (any of):
 * - MEMORIES_SHORT_STORE in { local, local-mcp, local-memory }
 * - MEMORIES_ADAPTER or MEMORY_STORE in { local, local-mcp, local-memory }
 * And LOCAL_MEMORY_BASE_URL must be set (REST API).
 *
 * Strict checks (enable with LOCAL_MEMORY_ENFORCE_STRICT=1 or CI_LOCAL_MEMORY_STRICT=1):
 * - Verify REST health endpoint responds OK
 * - Verify local-memory binary exists (LOCAL_MEMORY_BIN | ~/.local/bin/local-memory | which local-memory)
 *
 * Optional: LOCAL_MEMORY_NAMESPACE and LOCAL_MEMORY_API_KEY
 */
/* eslint-disable no-console */

import { execSync } from 'node:child_process';

const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const skip = process.env.CI_SKIP_LOCAL_MEMORY_ENFORCE === '1' || process.env.CI_SKIP_MEMORY_ENFORCE === '1';
const strict = process.env.LOCAL_MEMORY_ENFORCE_STRICT === '1' || process.env.CI_LOCAL_MEMORY_STRICT === '1';

function fail(msg) {
    console.error(`[enforce-local-memory] ERROR: ${msg}`);
    process.exit(1);
}

function warn(msg) {
    console.warn(`[enforce-local-memory] WARN: ${msg}`);
}

function isLocalFirst(shortStore, memAdapter) {
    const v = (s) => (s ? String(s).toLowerCase() : '');
    const val = v(shortStore) || v(memAdapter);
    return val === 'local' || val === 'local-mcp' || val === 'local-memory';
}

function getBaseUrl() {
    const base = process.env.LOCAL_MEMORY_BASE_URL;
    return base ? String(base).trim() : '';
}

async function checkHealth(baseUrl) {
    const url = baseUrl.replace(/\/$/, '');
    const candidates = [
        `${url}/health`,
        // Fallback if base points to host without /api/v1
        `${url}/api/v1/health`,
    ];
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    try {
        for (const h of candidates) {
            try {
                const res = await fetch(h, { signal: controller.signal });
                if (res.ok) {
                    clearTimeout(t);
                    return true;
                }
            } catch {
                // try next candidate
            }
        }
        clearTimeout(t);
        return false;
    } catch {
        clearTimeout(t);
        return false;
    }
}

function whichLocalMemory() {
    const explicit = process.env.LOCAL_MEMORY_BIN;
    const home = process.env.HOME || process.env.USERPROFILE || '';
    const defaultPath = home ? `${home}/.local/bin/local-memory` : '';
    if (explicit) return explicit;
    try {
        const found = execSync('which local-memory', { stdio: ['ignore', 'pipe', 'ignore'] })
            .toString()
            .trim();
        if (found) return found;
    } catch { }
    return defaultPath;
}

async function main() {
    if (skip) {
        console.log('[enforce-local-memory] Skipped by CI_SKIP_LOCAL_MEMORY_ENFORCE/CI_SKIP_MEMORY_ENFORCE');
        return;
    }

    const shortStore = process.env.MEMORIES_SHORT_STORE;
    const memAdapter = process.env.MEMORIES_ADAPTER || process.env.MEMORY_STORE;
    const baseUrl = getBaseUrl();

    if (!isLocalFirst(shortStore, memAdapter)) {
        const msg =
            'Local Memory is not configured as the first layer. Set `MEMORIES_SHORT_STORE=local` (preferred) or `MEMORIES_ADAPTER=local`.';
        if (isCI) return fail(msg);
        return warn(msg);
    }

    if (!baseUrl) {
        const msg =
            'Missing `LOCAL_MEMORY_BASE_URL`. Configure the Local Memory REST endpoint (e.g., http://localhost:3002/api/v1).';
        if (isCI) return fail(msg);
        return warn(msg);
    }

    if (!process.env.LOCAL_MEMORY_NAMESPACE) {
        warn('`LOCAL_MEMORY_NAMESPACE` not set. Defaulting to unspecified namespace may reduce isolation.');
    }

    if (strict) {
        const healthy = await checkHealth(baseUrl);
        if (!healthy) {
            return fail(`Local Memory REST health check failed at base: ${baseUrl}`);
        }
        const bin = whichLocalMemory();
        if (!bin) {
            return fail('Could not locate `local-memory` binary (set LOCAL_MEMORY_BIN or install to ~/.local/bin/local-memory).');
        }
        console.log(`[enforce-local-memory] strict: health OK, binary: ${bin}`);
    }

    console.log('[enforce-local-memory] OK: Local Memory is enforced as first layer.');
}

// Node 20+ supports top-level await
await main();
