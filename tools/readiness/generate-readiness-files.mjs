#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

// Default readiness template
const createReadinessTemplate = (packageName) => `package: "${packageName}"
coverage:
  statements: 0
  branches: 0
  functions: 0
  lines: 0
checklist:
  tdd: false
  contracts: false
  a11y: false
  security: false
  docs: false
  architecture: false
  reliability: false
thresholds:
  statements: 50
  branches: 50
  functions: 50
  lines: 50
`;

// Get package name from package.json
function getPackageName(packageDir) {
  const packageJsonPath = path.join(packageDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      return packageJson.name || path.basename(packageDir);
    } catch (error) {
      console.warn(`Failed to parse package.json in ${packageDir}:`, error.message);
    }
  }
  return path.basename(packageDir);
}

// Main function
function generateReadinessFiles() {
  const packagesDir = path.resolve(process.cwd(), 'packages');

  if (!fs.existsSync(packagesDir)) {
    console.error('packages directory not found');
    process.exit(1);
  }

  const packages = fs.readdirSync(packagesDir)
    .filter(item => {
      const itemPath = path.join(packagesDir, item);
      return fs.statSync(itemPath).isDirectory() &&
             !item.startsWith('.') &&
             item !== 'README.md' &&
             item !== 'SUCCESS_REPORT.md';
    });

  console.log(`Found ${packages.length} packages to process...`);

  for (const pkg of packages) {
    const packageDir = path.join(packagesDir, pkg);
    const readinessPath = path.join(packageDir, 'readiness.yml');

    if (fs.existsSync(readinessPath)) {
      console.log(`[skip] readiness.yml already exists for ${pkg}`);
      continue;
    }

    const packageName = getPackageName(packageDir);
    const content = createReadinessTemplate(packageName);

    try {
      fs.writeFileSync(readinessPath, content, 'utf-8');
      console.log(`[created] readiness.yml for ${pkg} (${packageName})`);
    } catch (error) {
      console.error(`[error] Failed to create readiness.yml for ${pkg}:`, error.message);
    }
  }

  console.log('Readiness file generation complete!');
}

generateReadinessFiles();
