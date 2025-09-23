#!/usr/bin/env node
/**
 * Enforce that Local Memory (MCP/REST) is used as the first layer of memories.
 * Fails in CI when configuration is missing or misconfigured.
 *
 * Acceptable configurations (any of):
 * - MEMORIES_SHORT_STORE=local (preferred) and LOCAL_MEMORY_BASE_URL set
 * - MEMORY_STORE=local (legacy) and LOCAL_MEMORY_BASE_URL set
 * - MEMORIES_ADAPTER=local and LOCAL_MEMORY_BASE_URL set
 *
 * Optional: LOCAL_MEMORY_NAMESPACE default can be anything; API key is optional.
 */
/* eslint-disable no-console */

const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const skip = process.env.CI_SKIP_LOCAL_MEMORY_ENFORCE === '1' || process.env.CI_SKIP_MEMORY_ENFORCE === '1';

function fail(msg) {
  console.error(`[enforce-local-memory] ERROR: ${msg}`);
  process.exit(1);
}

function warn(msg) {
  console.warn(`[enforce-local-memory] WARN: ${msg}`);
}

function main() {
  const shortStore = process.env.MEMORIES_SHORT_STORE;
  const memAdapter = process.env.MEMORIES_ADAPTER || process.env.MEMORY_STORE;
  const baseUrl = process.env.LOCAL_MEMORY_BASE_URL;

  if (skip) {
    console.log('[enforce-local-memory] Skipped by CI_SKIP_LOCAL_MEMORY_ENFORCE/CI_SKIP_MEMORY_ENFORCE');
    return;
  }

  // Determine if local memory is configured as first layer
  const localFirst =
    (shortStore && shortStore.toLowerCase() === 'local') ||
    (memAdapter && memAdapter.toLowerCase() === 'local');

  if (!localFirst) {
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

  // Optional namespace and API key
  if (!process.env.LOCAL_MEMORY_NAMESPACE) {
    warn('`LOCAL_MEMORY_NAMESPACE` not set. Defaulting to unspecified namespace may reduce isolation.');
  }

  console.log('[enforce-local-memory] OK: Local Memory is enforced as first layer.');
}

main();
