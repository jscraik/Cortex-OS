#!/usr/bin/env node
const base = process.env.STAGING_BASE_URL || 'http://localhost:3333';

const scenarios = [
  { path: '/a2a', body: { config: { seed: 1, maxTokens: 64, timeoutMs: 1000, memory: { maxItems: 10, maxBytes: 2048 } }, message: { from: 'shadow', to: 'agent', action: 'noop' }, json: true } },
  { path: '/rag', body: { config: { seed: 1, maxTokens: 64, timeoutMs: 1000, memory: { maxItems: 100, maxBytes: 8192 } }, query: { query: 'shadow test', topK: 3 }, json: true } },
  { path: '/simlab', body: { config: { seed: 1, maxTokens: 64, timeoutMs: 1000, memory: { maxItems: 10, maxBytes: 2048 } }, command: { scenario: 'shadow', step: 'noop' }, json: true } },
];

async function main() {
  let failures = 0;
  for (const s of scenarios) {
    const url = `${base}${s.path}`;
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(s.body) });
      if (!res.ok) failures++;
      console.log(`[shadow] ${s.path} -> ${res.status}`);
    } catch (e) {
      failures++;
      console.error(`[shadow] ${s.path} error`, e);
    }
  }
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
