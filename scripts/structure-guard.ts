#!/usr/bin/env -S node --no-warnings
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

function main() {
  const cfg = JSON.parse(readFileSync('.cortex/policy/structure.json', 'utf8')) as { allowedRoots: string[] };
  const baseRef = process.env.BASE_REF || 'main';
  const range = process.env.GITHUB_SHA ? `origin/${baseRef}...HEAD` : `${baseRef}...HEAD`;
  const changed = execSync(`git diff --name-only ${range}`, { stdio: ['pipe', 'pipe', 'ignore'] })
    .toString()
    .trim()
    .split('\n')
    .filter(Boolean);
  const ok = new Set(cfg.allowedRoots);
  const bad = changed.filter((p) => ![...ok].some((root) => p === root || p.startsWith(root + '/')));
  if (bad.length) {
    console.error('Blocked paths (not in allowedRoots):\n' + bad.join('\n'));
    process.exit(1);
  }
  console.log('structure-guard: OK');
}

main();
