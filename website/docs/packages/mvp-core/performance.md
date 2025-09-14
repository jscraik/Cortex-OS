---
title: Performance
sidebar_label: Performance
---

# Performance & Benchmarking

Use Node's `--cpu-prof` flag to profile commands.

Benchmark database queries:

Create a file at `benchmarks/db.js` with your benchmarking code. For example:

```js
// benchmarks/db.js
const { performance } = require('perf_hooks');
const db = require('../src/db'); // Adjust the path as needed

async function benchmarkQuery() {
  const start = performance.now();
  await db.query('SELECT 1'); // Replace with your actual query
  const end = performance.now();
  console.log(`Query took ${end - start} ms`);
}

benchmarkQuery().catch(console.error);
```bash
node benchmarks/db.js
```

Keep query counts low to maintain responsiveness.

```