#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const METRICS_URL = process.env.METRICS_URL || 'http://localhost:3333/metrics/eval';

function* iterJsonFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* iterJsonFiles(p);
    else if (e.isFile() && e.name.endsWith('.json')) yield p;
  }
}

function parseResult(file) {
  try {
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    const suite = j.suite || path.basename(file, '.json');
    const failures = Number(j.failures ?? 0);
    const total = Array.isArray(j.results) ? j.results.length : Number(j.total ?? 0) || 0;
    if (total === 0 && failures === 0) return null;
    return { suite, failures, total };
  } catch {
    return null;
  }
}

async function post(rec) {
  const res = await fetch(METRICS_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(rec),
  });
  if (!res.ok) throw new Error(`post failed ${res.status}: ${await res.text()}`);
}

async function main() {
  const root = process.argv[2] || 'python';
  let count = 0;
  for (const f of iterJsonFiles(root)) {
    const rec = parseResult(f);
    if (!rec) continue;
    await post(rec);
    console.log(`posted suite=${rec.suite} failures=${rec.failures} total=${rec.total}`);
    count++;
  }
  if (count === 0) {
    console.warn('No eval result files found to post');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
