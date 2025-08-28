#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

function loadJsonSummary(pkgPath) {
  const covPath = path.join(pkgPath, 'coverage', 'coverage-summary.json');
  if (!fs.existsSync(covPath)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(covPath, 'utf-8'));
    const total = data.total || data; // vitest coverage summary
    return {
      statements: total.statements?.pct ?? 0,
      branches: total.branches?.pct ?? 0,
      functions: total.functions?.pct ?? 0,
      lines: total.lines?.pct ?? 0
    };
  } catch (e) {
    return null;
  }
}

const pkgsDir = path.resolve(process.cwd(), 'packages');
const packages = fs.readdirSync(pkgsDir).filter((p) => fs.statSync(path.join(pkgsDir, p)).isDirectory());
let failed = false;

for (const pkg of packages) {
  const pkgPath = path.join(pkgsDir, pkg);
  const readinessPath = path.join(pkgPath, 'readiness.yml');
  if (!fs.existsSync(readinessPath)) {
    console.warn(`[warn] Missing readiness.yml for ${pkg}`);
    continue;
  }
  const doc = yaml.load(fs.readFileSync(readinessPath, 'utf-8')) || {};
  const thresholds = doc.thresholds || { statements: 95, branches: 95, functions: 95, lines: 95 };
  const coverage = loadJsonSummary(pkgPath) || doc.coverage || { statements: 0, branches: 0, functions: 0, lines: 0 };

  const checks = [
    ['statements', coverage.statements, thresholds.statements],
    ['branches', coverage.branches, thresholds.branches],
    ['functions', coverage.functions, thresholds.functions],
    ['lines', coverage.lines, thresholds.lines]
  ];

  for (const [name, actual, min] of checks) {
    if (actual < min) {
      console.error(`[fail] ${pkg} ${name} coverage ${actual}% < ${min}%`);
      failed = true;
    } else {
      console.log(`[ok]   ${pkg} ${name} coverage ${actual}% >= ${min}%`);
    }
  }
}

if (failed) {
  console.error('Readiness check failed. Raise coverage or adjust thresholds intentionally.');
  process.exit(1);
} else {
  console.log('All packages meet readiness thresholds.');
}
