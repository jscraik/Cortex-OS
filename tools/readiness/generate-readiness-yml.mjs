#!/usr/bin/env node
import yaml from 'js-yaml';
import fs from 'node:fs';
import path from 'node:path';

const pkgsDir = path.resolve(process.cwd(), 'packages');
const packages = fs
  .readdirSync(pkgsDir)
  .filter((p) => fs.statSync(path.join(pkgsDir, p)).isDirectory());

const defaultChecklist = {
  tdd: true,
  contracts: false,
  a11y: false,
  security: false,
  docs: false,
  architecture: false,
  reliability: false,
};

for (const pkg of packages) {
  const pkgPath = path.join(pkgsDir, pkg);
  const filePath = path.join(pkgPath, 'readiness.yml');
  if (fs.existsSync(filePath)) continue;
  const doc = {
    package: pkg,
    coverage: { statements: 0, branches: 0, functions: 0, lines: 0 },
    thresholds: { statements: 95, branches: 95, functions: 95, lines: 95 },
    checklist: defaultChecklist,
  };
  fs.writeFileSync(filePath, yaml.dump(doc));
  console.log(`Created ${path.relative(process.cwd(), filePath)}`);
}
