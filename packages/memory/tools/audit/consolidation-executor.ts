#!/usr/bin/env tsx

/**
 * Memory Consolidation Implementation Script
 *
 * Executes the 3-phase consolidation plan to unify all memory systems
 * into the canonical packages/memory location.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface ConsolidationAction {
  phase: number;
  description: string;
  source: string;
  destination: string;
  action: 'move' | 'copy' | 'backup' | 'remove' | 'create';
  validation: string;
}

class MemoryConsolidationExecutor {
  private workspaceRoot: string;
  private backupDir: string;
  private canonicalMemoryPath: string;
  private actions: ConsolidationAction[] = [];

  constructor() {
    this.workspaceRoot = process.cwd();
    this.backupDir = path.join(this.workspaceRoot, '__archive__');
    this.canonicalMemoryPath = path.join(this.workspaceRoot, 'apps/cortex-os/packages/memory');
  }

  async execute(): Promise<void> {
    console.log('🚀 Starting Memory System Consolidation...\n');

    this.planActions();
    await this.createBackups();
    await this.executePhase1();
    await this.executePhase2();
    await this.executePhase3();
    await this.validateConsolidation();

    console.log('\n✅ Memory System Consolidation Complete!');
    console.log(`📁 Canonical location: ${this.canonicalMemoryPath}`);
  }

  private planActions(): void {
    console.log('📋 Planning consolidation actions...\n');

    // Phase 1: Backup and clean root directories
    this.actions.push(
      {
        phase: 1,
        description: 'Backup cortex-memories',
        source: 'cortex-memories',
        destination: '__archive__/cortex-memories-backup-' + new Date().toISOString().split('T')[0],
        action: 'backup',
        validation: 'Backup directory exists',
      },
      {
        phase: 1,
        description: 'Move cortex-memories to enhanced',
        source: 'cortex-memories',
        destination: 'apps/cortex-os/packages/memory/enhanced',
        action: 'move',
        validation: 'Enhanced directory contains Mem0, Graphiti, Letta',
      },
      {
        phase: 1,
        description: 'Backup root memory directory',
        source: 'memory',
        destination: '__archive__/memory-backup-' + new Date().toISOString().split('T')[0],
        action: 'backup',
        validation: 'Backup directory exists',
      },
      {
        phase: 1,
        description: 'Extract docker configs from memory',
        source: 'memory/docker-compose.yml',
        destination: 'apps/cortex-os/packages/memory/docker/docker-compose.yml',
        action: 'copy',
        validation: 'Docker config copied',
      },
    );

    // Phase 2: Consolidate packages and commands
    this.actions.push(
      {
        phase: 2,
        description: 'Move brainwav-memory package',
        source: 'packages/brainwav-memory',
        destination: 'apps/cortex-os/packages/memory/brainwav',
        action: 'move',
        validation: 'Brainwav functionality integrated',
      },
      {
        phase: 2,
        description: 'Move CLI memory commands',
        source: 'apps/cortex-cli/commands/memory.ts',
        destination: 'apps/cortex-os/packages/memory/cli/memory.ts',
        action: 'move',
        validation: 'CLI commands in memory package',
      },
      {
        phase: 2,
        description: 'Move CLI memory Python',
        source: 'apps/cortex-cli/commands/memory.py',
        destination: 'apps/cortex-os/packages/memory/cli/memory.py',
        action: 'move',
        validation: 'Python CLI commands moved',
      },
      {
        phase: 2,
        description: 'Move CLI memory manager',
        source: 'apps/cortex-cli/commands/memory-manager.ts',
        destination: 'apps/cortex-os/packages/memory/cli/memory-manager.ts',
        action: 'move',
        validation: 'Memory manager moved',
      },
      {
        phase: 2,
        description: 'Move memory tools',
        source: 'tools/memory',
        destination: 'apps/cortex-os/packages/memory/tools',
        action: 'move',
        validation: 'Tools directory moved',
      },
    );

    // Phase 3: Clean up and remove empty directories
    this.actions.push(
      {
        phase: 3,
        description: 'Remove empty packages/memory',
        source: 'packages/memory',
        destination: '',
        action: 'remove',
        validation: 'Empty packages/memory removed',
      },
      {
        phase: 3,
        description: 'Remove root memory directory',
        source: 'memory',
        destination: '',
        action: 'remove',
        validation: 'Root memory directory removed',
      },
    );

    console.log(`📊 Planned ${this.actions.length} actions across 3 phases\n`);
  }

  private async createBackups(): Promise<void> {
    console.log('💾 Creating backups...\n');

    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().split('T')[0];

    // Backup critical systems
    const backups = [
      { src: 'cortex-memories', dest: `cortex-memories-backup-${timestamp}` },
      { src: 'memory', dest: `memory-backup-${timestamp}` },
      { src: 'packages/brainwav-memory', dest: `brainwav-memory-backup-${timestamp}` },
    ];

    for (const backup of backups) {
      const srcPath = path.join(this.workspaceRoot, backup.src);
      const destPath = path.join(this.backupDir, backup.dest);

      if (fs.existsSync(srcPath)) {
        console.log(`  📦 Backing up ${backup.src} → ${backup.dest}`);
        execSync(`cp -r "${srcPath}" "${destPath}"`);
      }
    }
  }

  private async executePhase1(): Promise<void> {
    console.log('🔄 Phase 1: Archive and Clean Root Directories\n');

    const phase1Actions = this.actions.filter((action) => action.phase === 1);

    for (const action of phase1Actions) {
      await this.executeAction(action);
    }

    console.log('✅ Phase 1 complete: Root directories cleaned\n');
  }

  private async executePhase2(): Promise<void> {
    console.log('🔄 Phase 2: Consolidate Packages and Commands\n');

    // Ensure canonical memory directory structure exists
    const directories = [
      'apps/cortex-os/packages/memory/enhanced',
      'apps/cortex-os/packages/memory/cli',
      'apps/cortex-os/packages/memory/tools',
      'apps/cortex-os/packages/memory/brainwav',
      'apps/cortex-os/packages/memory/docker',
      'apps/cortex-os/packages/memory/config',
    ];

    for (const dir of directories) {
      const fullPath = path.join(this.workspaceRoot, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`  📁 Created directory: ${dir}`);
      }
    }

    const phase2Actions = this.actions.filter((action) => action.phase === 2);

    for (const action of phase2Actions) {
      await this.executeAction(action);
    }

    console.log('✅ Phase 2 complete: Packages and commands consolidated\n');
  }

  private async executePhase3(): Promise<void> {
    console.log('🔄 Phase 3: Clean Up and Validate\n');

    const phase3Actions = this.actions.filter((action) => action.phase === 3);

    for (const action of phase3Actions) {
      await this.executeAction(action);
    }

    // Update workspace configuration
    await this.updateWorkspaceConfig();

    console.log('✅ Phase 3 complete: Cleanup and configuration updates\n');
  }

  private async executeAction(action: ConsolidationAction): Promise<void> {
    const srcPath = path.join(this.workspaceRoot, action.source);
    const destPath = action.destination ? path.join(this.workspaceRoot, action.destination) : '';

    console.log(`  ${this.getActionIcon(action.action)} ${action.description}`);

    switch (action.action) {
      case 'backup':
        if (fs.existsSync(srcPath)) {
          execSync(`cp -r "${srcPath}" "${destPath}"`);
          console.log(`     ✅ Backed up to ${action.destination}`);
        } else {
          console.log(`     ⚠️  Source not found: ${action.source}`);
        }
        break;

      case 'move':
        if (fs.existsSync(srcPath)) {
          // Ensure destination directory exists
          const destDir = path.dirname(destPath);
          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
          }

          execSync(`mv "${srcPath}" "${destPath}"`);
          console.log(`     ✅ Moved to ${action.destination}`);
        } else {
          console.log(`     ⚠️  Source not found: ${action.source}`);
        }
        break;

      case 'copy':
        if (fs.existsSync(srcPath)) {
          const destDir = path.dirname(destPath);
          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
          }

          execSync(`cp "${srcPath}" "${destPath}"`);
          console.log(`     ✅ Copied to ${action.destination}`);
        } else {
          console.log(`     ⚠️  Source not found: ${action.source}`);
        }
        break;

      case 'remove':
        if (fs.existsSync(srcPath)) {
          execSync(`rm -rf "${srcPath}"`);
          console.log(`     ✅ Removed ${action.source}`);
        } else {
          console.log(`     ⚠️  Already removed: ${action.source}`);
        }
        break;

      case 'create':
        if (!fs.existsSync(destPath)) {
          fs.mkdirSync(destPath, { recursive: true });
          console.log(`     ✅ Created ${action.destination}`);
        } else {
          console.log(`     ⚠️  Already exists: ${action.destination}`);
        }
        break;
    }
  }

  private getActionIcon(action: string): string {
    const icons = {
      backup: '💾',
      move: '📦',
      copy: '📋',
      remove: '🗑️',
      create: '📁',
    };
    return icons[action] || '🔧';
  }

  private async updateWorkspaceConfig(): Promise<void> {
    console.log('  🔧 Updating workspace configuration...');

    // Update pnpm-workspace.yaml to remove consolidated packages
    const workspaceConfigPath = path.join(this.workspaceRoot, 'pnpm-workspace.yaml');

    if (fs.existsSync(workspaceConfigPath)) {
      let config = fs.readFileSync(workspaceConfigPath, 'utf-8');

      // Remove lines for consolidated packages
      config = config.replace(/^\s*-\s*"packages\/memory"\s*$/m, '');
      config = config.replace(/^\s*-\s*"packages\/brainwav-memory"\s*$/m, '');

      // Clean up empty lines
      config = config.replace(/\n\s*\n/g, '\n');

      fs.writeFileSync(workspaceConfigPath, config);
      console.log('     ✅ Updated pnpm-workspace.yaml');
    }

    // Create symbolic links for CLI commands (temporary migration aid)
    const cliLinks = [
      {
        src: '../../packages/memory/cli/memory.ts',
        dest: 'apps/cortex-cli/commands/memory.ts',
      },
      {
        src: '../../packages/memory/cli/memory.py',
        dest: 'apps/cortex-cli/commands/memory.py',
      },
    ];

    for (const link of cliLinks) {
      const linkPath = path.join(this.workspaceRoot, link.dest);
      const srcPath = link.src;

      try {
        if (!fs.existsSync(linkPath)) {
          fs.symlinkSync(srcPath, linkPath);
          console.log(`     🔗 Created symbolic link: ${link.dest}`);
        }
      } catch (error) {
        console.log(`     ⚠️  Could not create link: ${link.dest}`);
      }
    }
  }

  private async validateConsolidation(): Promise<void> {
    console.log('🔍 Validating consolidation...\n');

    const validations = [
      {
        check: 'Canonical memory package exists',
        path: this.canonicalMemoryPath,
        expected: 'directory',
      },
      {
        check: 'Enhanced memory integrated',
        path: path.join(this.canonicalMemoryPath, 'enhanced'),
        expected: 'directory',
      },
      {
        check: 'CLI commands moved',
        path: path.join(this.canonicalMemoryPath, 'cli'),
        expected: 'directory',
      },
      {
        check: 'Tools consolidated',
        path: path.join(this.canonicalMemoryPath, 'tools'),
        expected: 'directory',
      },
      {
        check: 'Root memory directory removed',
        path: path.join(this.workspaceRoot, 'memory'),
        expected: 'missing',
      },
      {
        check: 'Root cortex-memories removed',
        path: path.join(this.workspaceRoot, 'cortex-memories'),
        expected: 'missing',
      },
    ];

    let allValid = true;

    for (const validation of validations) {
      const exists = fs.existsSync(validation.path);
      const isValid = validation.expected === 'missing' ? !exists : exists;

      if (isValid) {
        console.log(`  ✅ ${validation.check}`);
      } else {
        console.log(`  ❌ ${validation.check}`);
        allValid = false;
      }
    }

    if (allValid) {
      console.log('\n🎉 All validations passed!');
    } else {
      console.log('\n⚠️  Some validations failed - please review');
    }

    // Generate summary report
    this.generateSummaryReport();
  }

  private generateSummaryReport(): void {
    const report = {
      timestamp: new Date().toISOString(),
      canonicalLocation: this.canonicalMemoryPath,
      actionsExecuted: this.actions.length,
      phases: {
        phase1: 'Archive and clean root directories',
        phase2: 'Consolidate packages and commands',
        phase3: 'Clean up and update configuration',
      },
      structure: {
        enhanced: 'Mem0, Graphiti, Letta integrations',
        cli: 'CLI commands and management tools',
        tools: 'Memory utilities and tools',
        brainwav: 'Brainwav-specific memory features',
        docker: 'Docker configurations',
        config: 'Configuration files',
      },
      nextSteps: [
        'Run comprehensive tests: pnpm test',
        'Update import statements across codebase',
        'Update documentation to reflect new structure',
        'Remove symbolic links once imports updated',
      ],
    };

    const reportPath = path.join(this.workspaceRoot, 'memory-consolidation-completed.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n📄 Summary report saved to: memory-consolidation-completed.json`);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const executor = new MemoryConsolidationExecutor();
  executor.execute().catch(console.error);
}

export { MemoryConsolidationExecutor };
