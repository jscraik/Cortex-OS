#!/usr/bin/env node

// Script to fix .ts extension imports
const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing TypeScript import issues...');

// Find all TypeScript files
const findFiles = (dir, ext) => {
  const results = [];
  const list = fs.readdirSync(dir);

  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip node_modules and dist
      if (!['node_modules', 'dist', '.git'].includes(file)) {
        results.push(...findFiles(fullPath, ext));
      }
    } else if (file.endsWith(ext)) {
      results.push(fullPath);
    }
  });

  return results;
};

const tsFiles = findFiles('.', '.ts');
let fixedCount = 0;

tsFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    let modified = false;

    // Fix vi.mock() calls
    let newContent = content
      .replace(/vi\.mock\(['"`]([^'"`]+)\.ts['"`]\)/g, (match, importPath) => {
        modified = true;
        return `vi.mock('${importPath}')`;
      })
      // Fix regular imports
      .replace(/from ['"`]([^'"`]+)\.ts['"`]/g, (match, importPath) => {
        modified = true;
        return `from '${importPath}'`;
      })
      // Fix import type
      .replace(/import type .* from ['"`]([^'"`]+)\.ts['"`]/g, (match) => {
        modified = true;
        return match.replace('.ts', '');
      });

    if (modified) {
      fs.writeFileSync(file, newContent);
      fixedCount++;
      console.log(`Fixed: ${file}`);
    }
  } catch (err) {
    console.error(`Error processing ${file}:`, err.message);
  }
});

console.log(`\n✅ Fixed ${fixedCount} files`);