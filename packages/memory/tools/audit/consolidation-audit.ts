#!/usr/bin/env node
/* eslint-disable no-console */
// apps/cortex-os/packages/memory/tools/audit/consolidation-audit.ts
// Phase 2: Memory System Consolidation - Audit and Rationalization
// Relocated from tools/memory-consolidation-audit.ts

import * as fs from 'fs';
import * as path from 'path';

interface MemorySystemAudit {
  location: string;
  type: 'package' | 'standalone' | 'development';
  hasPackageJson: boolean;
  hasTests: boolean;
  hasDocs: boolean;
  technologies: string[];
  dependencies: string[];
  purpose: string;
  codeSize: number;
  lastModified: string;
  conflicts: string[];
  uniqueValue: string[];
}

interface ConsolidationPlan {
  timestamp: string;
  auditResults: MemorySystemAudit[];
  canonicalLocation: string;
  migrations: {
    source: string;
    action: 'merge' | 'deprecate' | 'relocate';
    reason: string;
    conflicts: string[];
  }[];
  dependencies: {
    toUpdate: string[];
    toRemove: string[];
    toAdd: string[];
  };
  recommendations: string[];
}

class MemorySystemConsolidator {
  private workspaceRoot: string;
  private auditResults: MemorySystemAudit[] = [];

  constructor() {
    this.workspaceRoot = process.cwd();
  }

  public async consolidateMemorySystems(): Promise<ConsolidationPlan> {
    console.log('🔍 Starting Memory System Consolidation Audit');

    // Step 1: Audit all memory systems
    await this.auditAllMemorySystems();

    // Step 2: Analyze conflicts and overlaps
    const plan = this.createConsolidationPlan();

    // Step 3: Execute consolidation
    await this.executeConsolidation(plan);

    // Step 4: Save consolidation report
    const reportPath = path.join(this.workspaceRoot, 'memory-consolidation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(plan, null, 2));

    console.log('✅ Memory System Consolidation Complete!');
    console.log(`📄 Report saved to: ${reportPath}`);

    return plan;
  }

  private async auditAllMemorySystems(): Promise<void> {
    console.log('📊 Auditing all memory systems...');

    const memoryLocations = [
      '/cortex-memories',
      '/memory',
      '/apps/cortex-os/packages/memory',
      '/packages/brainwav-memory',
      '/packages/memu',
      '/dev', // Development artifacts
    ];

    for (const location of memoryLocations) {
      const fullPath = path.join(this.workspaceRoot, location.substring(1));

      if (fs.existsSync(fullPath)) {
        const audit = await this.auditMemorySystem(location, fullPath);
        this.auditResults.push(audit);
        console.log(`  ✅ Audited: ${location}`);
      } else {
        console.log(`  ⚠️  Missing: ${location}`);
      }
    }
  }

  private async auditMemorySystem(location: string, fullPath: string): Promise<MemorySystemAudit> {
    const stats = fs.statSync(fullPath);

    // Check for key files
    const hasPackageJson = fs.existsSync(path.join(fullPath, 'package.json'));
    const hasTests = this.hasTestDirectory(fullPath);
    const hasDocs = this.hasDocumentation(fullPath);

    // Analyze technologies and dependencies
    const technologies = this.detectTechnologies(fullPath);
    const dependencies = this.extractDependencies(fullPath);

    // Determine purpose and conflicts
    const purpose = this.determinePurpose(location, fullPath);
    const conflicts = this.identifyConflicts(location, technologies);
    const uniqueValue = this.identifyUniqueValue(location, fullPath);

    // Calculate code size
    const codeSize = this.calculateCodeSize(fullPath);

    return {
      location,
      type: this.determineType(location),
      hasPackageJson,
      hasTests,
      hasDocs,
      technologies,
      dependencies,
      purpose,
      codeSize,
      lastModified: stats.mtime.toISOString(),
      conflicts,
      uniqueValue,
    };
  }

  private hasTestDirectory(dirPath: string): boolean {
    const testDirs = ['tests', 'test', '__tests__', 'spec'];
    return testDirs.some((dir) => fs.existsSync(path.join(dirPath, dir)));
  }

  private hasDocumentation(dirPath: string): boolean {
    const docFiles = ['README.md', 'docs', 'RUNBOOK.md'];
    return docFiles.some((file) => fs.existsSync(path.join(dirPath, file)));
  }

  private detectTechnologies(dirPath: string): string[] {
    const technologies: string[] = [];

    // Check for specific technology indicators
    if (fs.existsSync(path.join(dirPath, 'package.json'))) {
      technologies.push('TypeScript/Node.js');

      try {
        const packageJson = JSON.parse(
          fs.readFileSync(path.join(dirPath, 'package.json'), 'utf-8'),
        );

        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };

        if (allDeps.qdrant) technologies.push('Qdrant');
        if (allDeps.neo4j) technologies.push('Neo4j');
        if (allDeps.redis) technologies.push('Redis');
        if (allDeps.mem0 || allDeps['mem0-ai']) technologies.push('Mem0');
        if (allDeps.graphiti) technologies.push('Graphiti');
        if (allDeps.letta) technologies.push('Letta');
        if (allDeps.vitest || allDeps.jest) technologies.push('Testing');
      } catch (error) {
        console.warn(`Failed to parse package.json in ${dirPath}:`, error);
      }
    }

    if (fs.existsSync(path.join(dirPath, 'docker-compose.yml'))) {
      technologies.push('Docker');
    }

    if (fs.existsSync(path.join(dirPath, 'requirements.txt'))) {
      technologies.push('Python');
    }

    // Check for specific files
    const files = this.getAllFiles(dirPath);
    if (files.some((f) => f.includes('qdrant'))) technologies.push('Qdrant');
    if (files.some((f) => f.includes('neo4j'))) technologies.push('Neo4j');
    if (files.some((f) => f.includes('graphiti'))) technologies.push('Graphiti');
    if (files.some((f) => f.includes('mem0'))) technologies.push('Mem0');
    if (files.some((f) => f.includes('letta'))) technologies.push('Letta');

    return [...new Set(technologies)];
  }

  private extractDependencies(dirPath: string): string[] {
    const dependencies: string[] = [];

    const packageJsonPath = path.join(dirPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };
        dependencies.push(...Object.keys(allDeps));
      } catch (error) {
        // Ignore parsing errors
      }
    }

    return dependencies;
  }

  private determinePurpose(location: string, dirPath: string): string {
    if (location.includes('/dev')) return 'Development artifacts and documentation';
    if (location.includes('memu')) return 'MemU Cloud API client';
    if (location.includes('brainwav')) return 'Brainwav-specific memory implementation';
    if (location.includes('cortex-memories')) return 'Enhanced memory with Mem0/Graphiti/Letta';
    if (location === '/memory') return 'Standalone memory with Qdrant/Neo4j';
    if (location.includes('apps/cortex-os/packages/memory')) return 'Monorepo memory package';

    return 'Unknown purpose';
  }

  private determineType(location: string): 'package' | 'standalone' | 'development' {
    if (location.includes('/dev')) return 'development';
    if (location.includes('/packages/')) return 'package';
    if (location.includes('/apps/')) return 'package';
    return 'standalone';
  }

  private identifyConflicts(location: string, technologies: string[]): string[] {
    const conflicts: string[] = [];

    // Check for technology conflicts
    const memoryTechs = ['Qdrant', 'Neo4j', 'Mem0', 'Graphiti', 'Letta'];
    const foundMemoryTechs = technologies.filter((t) => memoryTechs.includes(t));

    if (foundMemoryTechs.length > 0) {
      conflicts.push(`Implements memory technologies: ${foundMemoryTechs.join(', ')}`);
    }

    // Check for naming conflicts
    if (location.includes('memory')) {
      conflicts.push('Uses "memory" in path - potential naming conflict');
    }

    return conflicts;
  }

  private identifyUniqueValue(location: string, dirPath: string): string[] {
    const uniqueValue: string[] = [];

    switch (location) {
      case '/cortex-memories':
        uniqueValue.push('Advanced library integrations (Mem0, Graphiti, Letta)');
        uniqueValue.push('Unified memory management system');
        uniqueValue.push('Cross-library synchronization');
        break;

      case '/memory':
        uniqueValue.push('Production-ready Qdrant integration');
        uniqueValue.push('Neo4j graph database setup');
        uniqueValue.push('Docker compose configuration');
        break;

      case '/apps/cortex-os/packages/memory':
        uniqueValue.push('Proper monorepo package structure');
        uniqueValue.push('Existing workspace integration');
        break;

      case '/packages/brainwav-memory':
        uniqueValue.push('Brainwav-specific implementations');
        break;

      case '/packages/memu':
        uniqueValue.push('MemU Cloud API client');
        uniqueValue.push('External service integration');
        break;

      case '/dev':
        uniqueValue.push('Development documentation');
        uniqueValue.push('Change logs and bug tracking');
        break;
    }

    return uniqueValue;
  }

  private calculateCodeSize(dirPath: string): number {
    try {
      const files = this.getAllFiles(dirPath);
      const codeFiles = files.filter(
        (f) => f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.py') || f.endsWith('.md'),
      );

      let totalSize = 0;
      for (const file of codeFiles) {
        try {
          const stats = fs.statSync(file);
          totalSize += stats.size;
        } catch (error) {
          // Ignore file access errors
        }
      }

      return Math.round(totalSize / 1024); // Size in KB
    } catch (error) {
      return 0;
    }
  }

  private getAllFiles(dirPath: string): string[] {
    const files: string[] = [];

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          files.push(...this.getAllFiles(fullPath));
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore directory access errors
    }

    return files;
  }

  private createConsolidationPlan(): ConsolidationPlan {
    console.log('📋 Creating consolidation plan...');

    // Determine canonical location (packages/memory for monorepo standards)
    const canonicalLocation = '/packages/memory';

    const migrations = this.auditResults
      .filter((audit) => audit.location !== canonicalLocation)
      .map((audit) => {
        if (audit.location === '/dev') {
          return {
            source: audit.location,
            action: 'merge' as const,
            reason: 'Merge development docs into canonical package documentation',
            conflicts: audit.conflicts,
          };
        } else if (audit.location === '/packages/memu') {
          return {
            source: audit.location,
            action: 'relocate' as const,
            reason: 'Keep as separate package - different purpose (API client)',
            conflicts: audit.conflicts,
          };
        } else if (audit.location === '/packages/brainwav-memory') {
          return {
            source: audit.location,
            action: 'merge' as const,
            reason: 'Merge Brainwav-specific features into canonical memory package',
            conflicts: audit.conflicts,
          };
        } else {
          return {
            source: audit.location,
            action: 'merge' as const,
            reason: 'Merge valuable features into canonical memory package',
            conflicts: audit.conflicts,
          };
        }
      });

    const plan: ConsolidationPlan = {
      timestamp: new Date().toISOString(),
      auditResults: this.auditResults,
      canonicalLocation,
      migrations,
      dependencies: {
        toUpdate: ['@cortex-os/memory references', 'import paths'],
        toRemove: ['duplicate dependencies', 'conflicting configurations'],
        toAdd: ['unified dependencies in canonical package'],
      },
      recommendations: [
        'Establish packages/memory as the single source of truth for memory functionality',
        'Create clear interfaces for different memory backends (Qdrant, Neo4j, Mem0, etc.)',
        'Maintain backward compatibility during migration',
        'Update all imports and references to use canonical package',
        'Deprecate root-level memory directories',
        'Document migration path for consumers',
      ],
    };

    return plan;
  }

  private async executeConsolidation(plan: ConsolidationPlan): Promise<void> {
    console.log('🔧 Executing consolidation plan...');

    // Create canonical package structure if it doesn't exist
    const canonicalPath = path.join(this.workspaceRoot, 'packages', 'memory');

    // Create consolidation directories
    const consolidationDir = path.join(canonicalPath, 'consolidated');
    if (!fs.existsSync(consolidationDir)) {
      fs.mkdirSync(consolidationDir, { recursive: true });
    }

    // Create migration documentation
    const migrationDoc = this.createMigrationDocumentation(plan);
    fs.writeFileSync(path.join(consolidationDir, 'MIGRATION.md'), migrationDoc);

    // Create unified package.json
    const unifiedPackageJson = this.createUnifiedPackageJson(plan);
    fs.writeFileSync(
      path.join(consolidationDir, 'package.json.new'),
      JSON.stringify(unifiedPackageJson, null, 2),
    );

    // Create implementation plan
    const implementationPlan = this.createImplementationPlan(plan);
    fs.writeFileSync(path.join(consolidationDir, 'IMPLEMENTATION.md'), implementationPlan);

    console.log(`  📁 Created consolidation directory: ${consolidationDir}`);
    console.log('  📋 Created migration documentation');
    console.log('  📦 Created unified package.json');
    console.log('  🔧 Created implementation plan');
  }

  private createMigrationDocumentation(plan: ConsolidationPlan): string {
    return `# Memory System Consolidation Migration Guide

## Overview

This document outlines the migration from multiple scattered memory systems to a single, canonical implementation at \`packages/memory\`.

## Current State Analysis

${plan.auditResults
  .map(
    (audit) => `
### ${audit.location}
- **Type**: ${audit.type}
- **Purpose**: ${audit.purpose}
- **Technologies**: ${audit.technologies.join(', ')}
- **Code Size**: ${audit.codeSize}KB
- **Unique Value**: ${audit.uniqueValue.join(', ')}
- **Conflicts**: ${audit.conflicts.join(', ')}
`,
  )
  .join('')}

## Migration Plan

${plan.migrations
  .map(
    (migration) => `
### ${migration.source}
- **Action**: ${migration.action}
- **Reason**: ${migration.reason}
- **Conflicts**: ${migration.conflicts.join(', ')}
`,
  )
  .join('')}

## Dependencies to Update

### To Update
${plan.dependencies.toUpdate.map((dep) => `- ${dep}`).join('\\n')}

### To Remove
${plan.dependencies.toRemove.map((dep) => `- ${dep}`).join('\\n')}

### To Add
${plan.dependencies.toAdd.map((dep) => `- ${dep}`).join('\\n')}

## Recommendations

${plan.recommendations.map((rec) => `- ${rec}`).join('\\n')}

## Next Steps

1. Review this migration plan
2. Update package.json with unified dependencies
3. Migrate valuable code from each location
4. Update all imports and references
5. Deprecate old locations
6. Update documentation

---
Generated: ${plan.timestamp}
`;
  }

  private createUnifiedPackageJson(plan: ConsolidationPlan): any {
    // Collect all unique dependencies from all memory systems
    const allDependencies = new Set<string>();

    plan.auditResults.forEach((audit) => {
      audit.dependencies.forEach((dep) => allDependencies.add(dep));
    });

    return {
      name: '@cortex-os/memory',
      version: '2.0.0',
      description: 'Unified memory system for Cortex OS with multiple backend support',
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      scripts: {
        build: 'tsc',
        test: 'vitest',
        'test:watch': 'vitest --watch',
        'test:coverage': 'vitest --coverage',
        lint: 'eslint src/**/*.ts',
        'lint:fix': 'eslint src/**/*.ts --fix',
      },
      dependencies: {
        // Core dependencies that would be unified
        '@cortex-os/core': 'workspace:*',
        '@cortex-os/config': 'workspace:*',

        // Memory backends
        qdrant: '^1.8.0',
        'neo4j-driver': '^5.15.0',
        redis: '^4.6.0',

        // Enhanced libraries (from cortex-memories)
        'mem0-ai': '^0.1.0',
        graphiti: 'latest',
        letta: 'latest',

        // Common utilities
        zod: '^3.22.0',
        'node-fetch': '^3.3.0',
      },
      devDependencies: {
        typescript: '^5.0.0',
        vitest: '^1.0.0',
        '@types/node': '^20.0.0',
        eslint: '^8.0.0',
      },
      keywords: [
        'memory',
        'vector-database',
        'graph-database',
        'qdrant',
        'neo4j',
        'mem0',
        'graphiti',
        'letta',
        'cortex-os',
      ],
    };
  }

  private createImplementationPlan(plan: ConsolidationPlan): string {
    return `# Memory System Consolidation Implementation Plan

## Phase 1: Preparation
- [ ] Backup all existing memory systems
- [ ] Create feature matrix of all existing implementations
- [ ] Identify breaking changes and migration path
- [ ] Set up canonical packages/memory structure

## Phase 2: Core Infrastructure
- [ ] Implement unified memory interface
- [ ] Create backend abstraction layer
- [ ] Set up configuration management
- [ ] Implement connection pooling

## Phase 3: Backend Integration
- [ ] Migrate Qdrant integration from /memory
- [ ] Migrate Neo4j integration from /memory  
- [ ] Integrate Mem0 from /cortex-memories
- [ ] Integrate Graphiti from /cortex-memories
- [ ] Integrate Letta from /cortex-memories

## Phase 4: Feature Consolidation
- [ ] Merge Brainwav-specific features
- [ ] Implement unified search interface
- [ ] Create cross-backend synchronization
- [ ] Add monitoring and observability

## Phase 5: Testing & Documentation
- [ ] Create comprehensive test suite
- [ ] Write API documentation
- [ ] Create migration guide for consumers
- [ ] Performance benchmarking

## Phase 6: Migration & Cleanup
- [ ] Update all imports to use packages/memory
- [ ] Deprecate old memory systems
- [ ] Remove redundant directories
- [ ] Update CI/CD pipelines

## Success Criteria
- Single memory package at packages/memory
- All memory functionality accessible through unified API
- Zero breaking changes for existing consumers
- Comprehensive test coverage (>90%)
- Performance equivalent or better than existing systems

---
Generated: ${new Date().toISOString()}
`;
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const consolidator = new MemorySystemConsolidator();
  consolidator
    .consolidateMemorySystems()
    .then(() => {
      console.log('🎯 Memory System Consolidation audit complete!');
      console.log('📋 Review the consolidation plan and proceed with implementation');
    })
    .catch((error) => {
      console.error('❌ Memory System Consolidation failed:', error);
      process.exit(1);
    });
}

export { MemorySystemConsolidator };
