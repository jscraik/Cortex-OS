#!/usr/bin/env -S node
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import Ajv from 'ajv';

const cfg = JSON.parse(readFileSync('.cortex/policy/structure.json', 'utf8'));
const schema = JSON.parse(readFileSync('.cortex/schemas/structure.schema.json', 'utf8'));
const ajv = new Ajv({ allErrors: true });
if (!ajv.validate(schema, cfg)) {
  console.error('structure.json invalid', ajv.errors);
  process.exit(2);
}

const base = process.env.GITHUB_BASE_REF || 'origin/main';
const range = `${base}...HEAD`;
const changed = execSync(`git diff --name-only ${range}`)
  .toString()
  .trim()
  .split('\n')
  .filter(Boolean);

const allow = cfg.allowedRoots.map((p: string) => (p.endsWith('/') ? p : p + '/'));
const deny = cfg.denyPatterns.map((p: string) => new RegExp(p));
const bad = changed.filter((f: string) => {
  if (deny.some((rx: RegExp) => rx.test(f))) return true;
  return !allow.some((p: string) => f === p.slice(0, -1) || f.startsWith(p));
});

const max = cfg.maxFilesChangedPerPR;
if (changed.length > max) {
  console.error(`Too many files changed: ${changed.length} > ${max}`);
  process.exit(1);
}
if (bad.length) {
  console.error('Blocked paths:\n' + bad.join('\n'));
  process.exit(1);
}
console.log('structure OK');

