#!/usr/bin/env node
const base = process.env.STAGING_BASE_URL || 'http://localhost:3333';

const cases = [
  { path: '/mcp', body: { bad: 'input' } }, // invalid payload
  { path: '/a2a', body: { config: { seed: -1 }, message: {} } }, // invalid seed
  {
    path: '/rag',
    body: {
      config: { seed: 1, maxTokens: 1, timeoutMs: 1, memory: { maxItems: 1, maxBytes: 1 } },
      query: { query: '' },
      json: true,
    },
  }, // invalid query
];

async function main() {
  let failures = 0;
  for (const c of cases) {
    const url = `${base}${c.path}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(c.body),
      });
      // Expect non-200 or structured error JSON
      const ok = res.status >= 200 && res.status < 500; // server shouldn’t 500 frequently
      console.log(`[chaos] ${c.path} -> ${res.status}`);
      if (!ok) failures++;
    } catch (e) {
      failures++;
      console.error(`[chaos] ${c.path} error`, e);
    }
  }
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
