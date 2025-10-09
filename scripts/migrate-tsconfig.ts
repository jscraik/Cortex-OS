#!/usr/bin/env tsx
/**
 * TypeScript Configuration Migration Script
 * 
 * Migrates packages to brAInwav TypeScript configuration standards.
 * 
 * Usage:
 *   pnpm tsx scripts/migrate-tsconfig.ts [--dry-run] [--package <path>]
 *   pnpm tsx scripts/migrate-tsconfig.ts --dry-run  # Preview changes
 *   pnpm tsx scripts/migrate-tsconfig.ts --apply    # Apply changes
 *   pnpm tsx scripts/migrate-tsconfig.ts --package packages/my-pkg  # Single package
 * 
 * @brainwav
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface MigrationReport {
  package: string;
  changes: string[];
  warnings: string[];
  errors: string[];
}

interface MigrationOptions {
  dryRun: boolean;
  packagePath?: string;
}

const REQUIRED_EXCLUDES = ['dist', 'node_modules'];
const RECOMMENDED_EXCLUDES = ['**/*.test.ts', '**/*.spec.ts', 'tests/**/*'];

async function migrateTsConfig(
  packagePath: string,
  options: MigrationOptions
): Promise<MigrationReport> {
  const report: MigrationReport = {
    package: packagePath,
    changes: [],
    warnings: [],
    errors: [],
  };

  const tsconfigPath = path.join(packagePath, 'tsconfig.json');
  
  if (!fs.existsSync(tsconfigPath)) {
    report.warnings.push('No tsconfig.json found - skipping');
    return report;
  }

  try {
    const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf-8');
    const tsconfig = JSON.parse(tsconfigContent);
    let modified = false;

    // Initialize compilerOptions if missing
    if (!tsconfig.compilerOptions) {
      tsconfig.compilerOptions = {};
      modified = true;
      report.changes.push('Created compilerOptions object');
    }

    // Check if package is buildable
    const packageJsonPath = path.join(packagePath, 'package.json');
    let isBuildable = false;
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      isBuildable = packageJson.scripts?.build?.includes('tsc') || false;
    }

    // 1. Add composite: true for buildable packages
    if (isBuildable && tsconfig.compilerOptions.composite !== true) {
      tsconfig.compilerOptions.composite = true;
      modified = true;
      report.changes.push('Added composite: true');
    }

    // 2. Standardize outDir to "dist"
    if (tsconfig.compilerOptions.outDir && tsconfig.compilerOptions.outDir !== 'dist') {
      const oldOutDir = tsconfig.compilerOptions.outDir;
      tsconfig.compilerOptions.outDir = 'dist';
      modified = true;
      report.changes.push(`Changed outDir from "${oldOutDir}" to "dist"`);
    } else if (!tsconfig.compilerOptions.outDir && isBuildable) {
      tsconfig.compilerOptions.outDir = 'dist';
      modified = true;
      report.changes.push('Set outDir to "dist"');
    }

    // 3. Ensure noEmit: false for composite packages
    if (tsconfig.compilerOptions.composite && tsconfig.compilerOptions.noEmit !== false) {
      tsconfig.compilerOptions.noEmit = false;
      modified = true;
      report.changes.push('Set noEmit: false (required for composite)');
    }

    // 4. Check for rootDir conflicts
    if (tsconfig.compilerOptions.rootDir) {
      const rootDir = tsconfig.compilerOptions.rootDir;
      const includes = tsconfig.include || [];
      
      // Check if any include patterns fall outside rootDir
      const hasConflict = includes.some((pattern: string) => {
        // Normalize patterns
        const normalizedPattern = pattern.replace(/\/\*\*\/\*$/, '').replace(/\/$/, '');
        const normalizedRootDir = rootDir.replace(/\/$/, '');
        
        // Check if pattern starts with rootDir
        return !normalizedPattern.startsWith(normalizedRootDir) && normalizedPattern !== normalizedRootDir;
      });
      
      if (hasConflict) {
        report.warnings.push(
          `rootDir "${rootDir}" may conflict with include patterns. Consider removing rootDir or adjusting include.`
        );
      }
    }

    // 5. Ensure required excludes
    tsconfig.exclude = tsconfig.exclude || [];
    REQUIRED_EXCLUDES.forEach((ex) => {
      if (!tsconfig.exclude.includes(ex)) {
        tsconfig.exclude.push(ex);
        modified = true;
        report.changes.push(`Added "${ex}" to exclude`);
      }
    });

    // 6. Add recommended excludes (if not already excluding tests)
    const hasTestExcludes = tsconfig.exclude.some((ex: string) =>
      ex.includes('test') || ex.includes('spec')
    );
    
    if (!hasTestExcludes) {
      RECOMMENDED_EXCLUDES.forEach((ex) => {
        if (!tsconfig.exclude.includes(ex)) {
          tsconfig.exclude.push(ex);
          modified = true;
          report.changes.push(`Added "${ex}" to exclude (recommended)`);
        }
      });
    }

    // 7. Check for separate test config
    const hasTests = fs.existsSync(path.join(packagePath, 'tests'));
    const hasSpecConfig = fs.existsSync(path.join(packagePath, 'tsconfig.spec.json'));
    
    if (hasTests && !hasSpecConfig) {
      // Create spec config from template
      const templatePath = path.resolve(process.cwd(), '.cortex/templates/tsconfig/tsconfig.spec.json');
      
      if (fs.existsSync(templatePath)) {
        const specTemplate = fs.readFileSync(templatePath, 'utf-8');
        
        if (!options.dryRun) {
          fs.writeFileSync(
            path.join(packagePath, 'tsconfig.spec.json'),
            specTemplate
          );
        }
        
        modified = true;
        report.changes.push('Created tsconfig.spec.json from template');
      } else {
        report.warnings.push('Package has tests/ but no tsconfig.spec.json (template not found)');
      }
    }

    // 8. Write changes
    if (modified && !options.dryRun) {
      const updatedContent = JSON.stringify(tsconfig, null, 2) + '\n';
      fs.writeFileSync(tsconfigPath, updatedContent);
    }

    if (modified && options.dryRun) {
      report.changes.push('[DRY RUN] - No files were modified');
    }

  } catch (error) {
    report.errors.push(`Failed to process: ${error instanceof Error ? error.message : String(error)}`);
  }

  return report;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const applyChanges = args.includes('--apply');
  const packageIndex = args.indexOf('--package');
  const singlePackage = packageIndex >= 0 ? args[packageIndex + 1] : undefined;

  if (!dryRun && !applyChanges) {
    console.error('❌ Error: Must specify either --dry-run or --apply');
    console.log('\nUsage:');
    console.log('  pnpm tsx scripts/migrate-tsconfig.ts --dry-run  # Preview changes');
    console.log('  pnpm tsx scripts/migrate-tsconfig.ts --apply    # Apply changes');
    console.log('  pnpm tsx scripts/migrate-tsconfig.ts --dry-run --package packages/my-pkg');
    process.exit(1);
  }

  const options: MigrationOptions = {
    dryRun,
    packagePath: singlePackage,
  };

  console.log('🔧 brAInwav TypeScript Configuration Migration\n');
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (preview only)' : '✅ APPLY CHANGES'}\n`);

  // Find all packages
  let packagePaths: string[];
  
  if (singlePackage) {
    packagePaths = [singlePackage];
    console.log(`Target: ${singlePackage}\n`);
  } else {
    const packageJsonFiles = await glob('packages/**/package.json', {
      ignore: ['**/node_modules/**', '**/dist/**'],
      cwd: process.cwd(),
    });

    packagePaths = packageJsonFiles.map((pkg) => path.dirname(pkg));
    console.log(`Found ${packagePaths.length} packages\n`);
  }

  const reports: MigrationReport[] = [];

  for (const pkgPath of packagePaths) {
    const report = await migrateTsConfig(pkgPath, options);
    reports.push(report);
  }

  // Print detailed reports
  console.log('📋 Migration Reports:\n');
  console.log('='.repeat(80));
  
  reports.forEach((report) => {
    if (report.changes.length > 0 || report.warnings.length > 0 || report.errors.length > 0) {
      console.log(`\n📦 ${report.package}:`);
      
      if (report.changes.length > 0) {
        console.log('  ✅ Changes:');
        report.changes.forEach((change) => console.log(`     - ${change}`));
      }
      
      if (report.warnings.length > 0) {
        console.log('  ⚠️  Warnings:');
        report.warnings.forEach((warn) => console.log(`     - ${warn}`));
      }
      
      if (report.errors.length > 0) {
        console.log('  ❌ Errors:');
        report.errors.forEach((err) => console.log(`     - ${err}`));
      }
    }
  });

  // Print summary statistics
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Summary Statistics:\n');
  
  const totalPackages = reports.length;
  const packagesWithChanges = reports.filter(r => r.changes.length > 0).length;
  const packagesWithWarnings = reports.filter(r => r.warnings.length > 0).length;
  const packagesWithErrors = reports.filter(r => r.errors.length > 0).length;
  const totalChanges = reports.reduce((sum, r) => sum + r.changes.length, 0);
  
  console.log(`   Total packages processed: ${totalPackages}`);
  console.log(`   Packages with changes: ${packagesWithChanges}`);
  console.log(`   Packages with warnings: ${packagesWithWarnings}`);
  console.log(`   Packages with errors: ${packagesWithErrors}`);
  console.log(`   Total changes made: ${totalChanges}`);
  
  if (dryRun) {
    console.log('\n💡 This was a dry run. Re-run with --apply to make changes.');
  } else {
    console.log('\n✅ Migration complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Review the changes made');
    console.log('   2. Run: pnpm build:smart');
    console.log('   3. Run: pnpm test:smart');
    console.log('   4. Run: pnpm structure:validate');
    console.log('   5. Commit if all checks pass');
  }

  // Exit with error code if there were any errors
  if (packagesWithErrors > 0) {
    console.log('\n⚠️  Some packages had errors during migration.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
