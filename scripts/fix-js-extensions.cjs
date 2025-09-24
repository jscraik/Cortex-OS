#!/usr/bin/env node

const { execSync } = require('child_process');
const { readFileSync, writeFileSync, readdirSync, existsSync, lstatSync } = require('fs');
const { join, dirname } = require('path');

console.log('🔧 Fixing .js extensions in imports...\n');

function getAllTsFiles(dir, files = []) {
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory() &&
        !['node_modules', 'dist', '.git', '.nx', 'coverage'].includes(entry.name)) {
      getAllTsFiles(fullPath, files);
    } else if (entry.isFile() &&
               entry.name.endsWith('.ts') &&
               !entry.name.endsWith('.d.ts') &&
               !entry.name.includes('test-fixtures')) {
      files.push(fullPath);
    }
  }

  return files;
}

function fixJsExtensionsInFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  let modified = false;
  let newContent = content;

  // Fix import statements with .js extensions
  const importRegex = /from\s+['"]([^'"]*\.js)['"]/g;
  newContent = newContent.replace(importRegex, (match, importPath) => {
    modified = true;
    // Preserve relative paths
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      return `from '${importPath.replace('.js', '')}'`;
    }
    return `from '${importPath.replace('.js', '')}'`;
  });

  // Fix dynamic import() calls
  const dynamicImportRegex = /import\(\s*['"]([^'"]*\.js)['"]\s*\)/g;
  newContent = newContent.replace(dynamicImportRegex, (match, importPath) => {
    modified = true;
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      return `import('${importPath.replace('.js', '')}')`;
    }
    return `import('${importPath.replace('.js', '')}')`;
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
    if (fixJsExtensionsInFile(file)) {
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
  console.log(`- Total .js extensions removed: ${fixedCount}`);

  if (fixedCount > 0) {
    console.log('\n📋 Fixed files:');
    fixedFiles.forEach(file => {
      console.log(`  ${file}`);
    });

    // Try to build a few key packages
    console.log('\n🔍 Testing fixes...');
    try {
      const packagesToTest = [
        'packages/utils',
        'packages/types',
        'packages/contracts',
        'packages/agent-toolkit'
      ];

      for (const pkg of packagesToTest) {
        if (existsSync(join(rootDir, pkg))) {
          try {
            execSync(`cd ${pkg} && pnpm build`, { stdio: 'pipe' });
            console.log(`✅ ${pkg} builds successfully`);
          } catch (error) {
            console.log(`⚠️ ${pkg} still has issues`);
          }
        }
      }
    } catch (error) {
      console.log('Could not test builds');
    }
  } else {
    console.log('\n✅ No .js extensions found in imports');
  }
}

main();