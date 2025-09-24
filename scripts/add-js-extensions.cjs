#!/usr/bin/env node

const { readFileSync, writeFileSync, readdirSync, existsSync, lstatSync } = require('fs');
const { join, dirname, relative } = require('path');

console.log('🔧 Adding .js extensions to relative imports...\n');

function getAllTsFiles(dir, files = []) {
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory() &&
        !['node_modules', 'dist', '.git', '.nx', 'coverage', '.uv-cache'].includes(entry.name)) {
      getAllTsFiles(fullPath, files);
    } else if (entry.isFile() &&
               entry.name.endsWith('.ts') &&
               !entry.name.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

function addJsExtensionsInFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  let modified = false;
  let newContent = content;

  // Fix relative import statements without extensions
  const relativeImportRegex = /from\s+['"](\.\.?\/[^'"]*(?<!\.js|\.ts|\.json|\.tsx))['"]/g;
  newContent = newContent.replace(relativeImportRegex, (match, importPath) => {
    // Don't add extensions to directories or files that already have extensions
    if (importPath.endsWith('/')) {
      return match;
    }

    // Check if the imported file exists
    const currentDir = dirname(filePath);
    const absoluteImportPath = join(currentDir, importPath);

    // Try different possible extensions
    const possibleExtensions = ['.ts', '.tsx'];
    for (const ext of possibleExtensions) {
      if (existsSync(absoluteImportPath + ext)) {
        modified = true;
        return match.replace(importPath, importPath + '.js');
      }
    }

    return match;
  });

  if (modified) {
    writeFileSync(filePath, newContent);
    return true;
  }

  return false;
}

function main() {
  const rootDir = process.cwd();
  const tsFiles = getAllTsFiles(rootDir);

  console.log(`Found ${tsFiles.length} TypeScript files to check\n`);

  let fixedCount = 0;
  let fixedFiles = [];

  for (const file of tsFiles) {
    if (addJsExtensionsInFile(file)) {
      fixedCount++;
      fixedFiles.push(file.replace(rootDir + '/', ''));

      if (fixedFiles.length <= 10) {
        console.log(`✅ Fixed: ${file.replace(rootDir + '/', '')}`);
      } else if (fixedFiles.length === 11) {
        console.log(`   ... and ${fixedCount - 10} more files`);
      }
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`- Files checked: ${tsFiles.length}`);
  console.log(`- Files fixed: ${fixedCount}`);
  console.log(`- Total .js extensions added: ${fixedCount}`);

  if (fixedCount > 0) {
    console.log('\n📋 First 10 fixed files:');
    fixedFiles.slice(0, 10).forEach(file => {
      console.log(`  ${file}`);
    });
  } else {
    console.log('\n✅ No relative imports needed .js extensions');
  }
}

main();