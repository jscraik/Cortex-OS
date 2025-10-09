#!/usr/bin/env tsx
/**
 * TypeScript Project References - Auto-Add Script
 * 
 * Automatically adds TypeScript project references to packages based on
 * their workspace dependencies.
 * 
 * Usage:
 *   pnpm tsx scripts/add-project-references.ts [--dry-run] [--package <name>]
 * 
 * @brainwav
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface Reference {
  path: string;
}

interface TsConfig {
  extends?: string;
  compilerOptions?: Record<string, unknown>;
  include?: string[];
  exclude?: string[];
  references?: Reference[];
  [key: string]: unknown;
}

/**
 * Find all packages in the monorepo
 */
function findAllPackages(): Map<string, string> {
  const output = execSync(
    'find packages apps libs -name "package.json" -not -path "*/node_modules/*" -not -path "*/dist/*"',
    { cwd: process.cwd(), encoding: 'utf-8' }
  );
  
  const packageMap = new Map<string, string>();
  
  output
    .trim()
    .split('\n')
    .filter(Boolean)
    .forEach(pkgJsonPath => {
      const pkgPath = path.dirname(pkgJsonPath);
      const pkgJsonFullPath = path.join(process.cwd(), pkgJsonPath);
      
      try {
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonFullPath, 'utf-8'));
        if (pkgJson.name) {
          packageMap.set(pkgJson.name, pkgPath);
        }
      } catch {
        // Skip invalid package.json
      }
    });
  
  return packageMap;
}

/**
 * Get workspace dependencies from package.json
 */
function getWorkspaceDependencies(packagePath: string): string[] {
  const packageJsonPath = path.join(process.cwd(), packagePath, 'package.json');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
    
    return Object.keys(allDeps).filter(dep => dep.startsWith('@cortex-os/') || dep.startsWith('@apps/'));
  } catch {
    return [];
  }
}

/**
 * Calculate relative path between packages
 */
function getRelativePath(fromPath: string, toPath: string): string {
  const from = path.join(process.cwd(), fromPath);
  const to = path.join(process.cwd(), toPath);
  return path.relative(from, to);
}

/**
 * Generate project references for a package
 */
function generateReferences(packagePath: string, packageMap: Map<string, string>): Reference[] {
  const dependencies = getWorkspaceDependencies(packagePath);
  const references: Reference[] = [];
  
  for (const dep of dependencies) {
    const depPath = packageMap.get(dep);
    
    if (depPath) {
      // Check if dependency has tsconfig.json
      const tsconfigPath = path.join(process.cwd(), depPath, 'tsconfig.json');
      
      if (fs.existsSync(tsconfigPath)) {
        const relativePath = getRelativePath(packagePath, depPath);
        references.push({ path: relativePath });
      }
    }
  }
  
  return references;
}

/**
 * Add references to tsconfig.json
 */
function addReferencesToTsConfig(
  packagePath: string,
  references: Reference[],
  dryRun: boolean
): boolean {
  const tsconfigPath = path.join(process.cwd(), packagePath, 'tsconfig.json');
  
  if (!fs.existsSync(tsconfigPath)) {
    console.log(`⚠️  No tsconfig.json found at ${packagePath}`);
    return false;
  }
  
  try {
    const content = fs.readFileSync(tsconfigPath, 'utf-8');
    const tsconfig: TsConfig = JSON.parse(content);
    
    // Check if references already exist
    if (tsconfig.references && tsconfig.references.length > 0) {
      console.log(`ℹ️  ${packagePath} already has references (${tsconfig.references.length})`);
      return false;
    }
    
    // Add references
    tsconfig.references = references;
    
    if (dryRun) {
      console.log(`[DRY RUN] Would add ${references.length} references to ${packagePath}`);
      return true;
    }
    
    // Write back
    const updatedContent = JSON.stringify(tsconfig, null, 2) + '\n';
    fs.writeFileSync(tsconfigPath, updatedContent);
    
    console.log(`✅ Added ${references.length} references to ${packagePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error processing ${packagePath}:`, error);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const packageIndex = args.indexOf('--package');
  const targetPackage = packageIndex >= 0 ? args[packageIndex + 1] : null;
  
  console.log('🔧 brAInwav TypeScript Project References - Auto-Add\n');
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (preview only)' : '✅ APPLY CHANGES'}\n`);
  
  const packageMap = findAllPackages();
  console.log(`Found ${packageMap.size} packages\n`);
  
  let processed = 0;
  let updated = 0;
  
  if (targetPackage) {
    // Process single package
    const fullName = targetPackage.startsWith('@') ? targetPackage : `@cortex-os/${targetPackage}`;
    const pkgPath = packageMap.get(fullName);
    
    if (!pkgPath) {
      console.error(`❌ Package not found: ${fullName}`);
      console.log(`\nAvailable packages:`);
      Array.from(packageMap.keys()).forEach(name => console.log(`  - ${name}`));
      process.exit(1);
    }
    
    console.log(`📦 Processing: ${fullName}`);
    console.log(`   Path: ${pkgPath}\n`);
    
    const references = generateReferences(pkgPath, packageMap);
    
    console.log(`   Dependencies: ${references.length}`);
    references.forEach(ref => console.log(`     - ${ref.path}`));
    console.log();
    
    processed = 1;
    if (addReferencesToTsConfig(pkgPath, references, dryRun)) {
      updated = 1;
    }
  } else {
    // Process top packages with most dependencies
    const packagesWithDeps: Array<[string, string]> = [];
    
    packageMap.forEach((pkgPath, pkgName) => {
      const deps = getWorkspaceDependencies(pkgPath);
      if (deps.length > 0) {
        packagesWithDeps.push([pkgName, pkgPath]);
      }
    });
    
    // Sort by dependency count (descending)
    packagesWithDeps.sort((a, b) => {
      const aDeps = getWorkspaceDependencies(a[1]).length;
      const bDeps = getWorkspaceDependencies(b[1]).length;
      return bDeps - aDeps;
    });
    
    // Process top 10 packages
    const topPackages = packagesWithDeps.slice(0, 10);
    
    console.log(`🎯 Processing top 10 packages with most dependencies:\n`);
    
    for (const [pkgName, pkgPath] of topPackages) {
      console.log(`📦 ${pkgName}`);
      const references = generateReferences(pkgPath, packageMap);
      
      processed++;
      if (addReferencesToTsConfig(pkgPath, references, dryRun)) {
        updated++;
      }
      console.log();
    }
  }
  
  console.log('='.repeat(80));
  console.log(`\n📊 Summary:`);
  console.log(`   Packages processed: ${processed}`);
  console.log(`   Packages updated: ${updated}`);
  
  if (dryRun) {
    console.log(`\n💡 Run without --dry-run to apply changes`);
  } else {
    console.log(`\n✅ Project references added successfully!`);
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Test builds: pnpm tsc --build packages/gateway`);
    console.log(`   2. Run validation: pnpm vitest run tests/scripts/typescript-config.test.ts`);
    console.log(`   3. Check for errors: pnpm typecheck:smart`);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
