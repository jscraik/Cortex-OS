#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

function env(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function loadSummary(p) {
  const json = JSON.parse(fs.readFileSync(path.resolve(p), 'utf8'));
  const dur = json.metrics?.http_req_duration?.values;
  const err = json.metrics?.http_req_failed?.values;
  const rps = json.metrics?.http_reqs?.values;
  return {
    p50: dur?.['p(50)'],
    p95: dur?.['p(95)'],
    p99: dur?.['p(99)'],
    errorRate: err?.rate,
    totalReqs: rps?.count,
  };
}

async function annotate(summaryPath, tags = ['k6', 'cortex-os']) {
  const GRAFANA_URL = env('GRAFANA_URL');
  const GRAFANA_API_KEY = env('GRAFANA_API_KEY');
  const body = loadSummary(summaryPath);
  const text = `k6 quick: p95=${Math.round(body.p95 || 0)}ms, err=${(body.errorRate * 100).toFixed(2)}%, reqs=${body.totalReqs}`;
  const payload = { text, tags };
  const res = await fetch(`${GRAFANA_URL.replace(/\/$/, '')}/api/annotations`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${GRAFANA_API_KEY}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Annotation failed: ${res.status} ${t}`);
  }
  console.log('Annotation created');
}

const file = process.argv[2] || 'k6-summary.json';
annotate(file).catch((e) => {
  console.error(e);
  process.exit(1);
});
