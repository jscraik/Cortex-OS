#!/usr/bin/env tsx
// apps/cortex-os/packages/memory/tools/discovery/memory-discovery.ts
// Memory System Discovery Tool - Relocated from tools/memory-discovery.ts

import * as fs from 'fs';
import * as path from 'path';

interface MemorySystemInfo {
  path: string;
  type: string;
  purpose: string;
  technologies: string[];
  size: number;
  hasPackageJson: boolean;
  recommendation: string;
}

class MemorySystemScanner {
  private workspaceRoot: string;
  private systems: MemorySystemInfo[] = [];

  constructor() {
    this.workspaceRoot = process.cwd();
  }

  scan(): void {
    console.log('🔍 Scanning for all memory systems...\n');

    // Scan known locations
    this.scanLocation('cortex-memories', 'Root memory system with advanced libraries');
    this.scanLocation('memory', 'Root memory directory');
    this.scanLocation('packages/memory', 'Core memory package');
    this.scanLocation('packages/brainwav-memory', 'Brainwav memory package');
    this.scanLocation('apps/cortex-cli/commands/memory.ts', 'CLI memory commands');
    this.scanLocation('apps/cortex-cli/commands/memory.py', 'CLI memory Python');
    this.scanLocation('apps/cortex-cli/commands/memory-manager.ts', 'CLI memory manager');
    this.scanLocation('apps/cortex-os/packages/memory', 'Cortex OS memory package');
    this.scanLocation('tools/memory', 'Memory tools directory');
    this.scanLocation(
      'apps/cortex-os/packages/memory/tools/cli/simple-memory-manager.ts',
      'Memory CLI manager (formerly instructions/memory.ts)',
    );
    this.scanLocation('docker/memory_manager.py', 'Docker memory manager');
    this.scanLocation('scripts/monitoring/memory-leak-monitor.js', 'Memory leak monitor');
    this.scanLocation('scripts/python/memory_compression.py', 'Memory compression');
    this.scanLocation('apps/cortex-py/src/mlx/memory_monitor.py', 'MLX memory monitor');

    // Check for memory-related files with grep
    this.findMemoryFiles();

    this.analyzeAndRecommend();
    this.generateReport();
  }

  private scanLocation(relativePath: string, purpose: string): void {
    const fullPath = path.join(this.workspaceRoot, relativePath);

    if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath);
      const isDirectory = stat.isDirectory();

      const system: MemorySystemInfo = {
        path: relativePath,
        type: isDirectory ? 'directory' : 'file',
        purpose,
        technologies: this.detectTechnologies(fullPath, isDirectory),
        size: isDirectory ? this.getDirectorySize(fullPath) : stat.size,
        hasPackageJson: isDirectory && fs.existsSync(path.join(fullPath, 'package.json')),
        recommendation: 'pending',
      };

      this.systems.push(system);
      console.log(`✅ Found: ${relativePath} (${purpose})`);
    }
  }

  private detectTechnologies(fullPath: string, isDirectory: boolean): string[] {
    const technologies: string[] = [];

    if (isDirectory) {
      const files = this.getAllFiles(fullPath);
      for (const file of files) {
        if (file.includes('neo4j')) technologies.push('Neo4j');
        if (file.includes('qdrant')) technologies.push('Qdrant');
        if (file.includes('mem0')) technologies.push('Mem0');
        if (file.includes('graphiti')) technologies.push('Graphiti');
        if (file.includes('letta')) technologies.push('Letta');
        if (file.includes('docker')) technologies.push('Docker');
      }
    } else {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (content.includes('neo4j') || content.includes('Neo4j')) technologies.push('Neo4j');
      if (content.includes('qdrant') || content.includes('Qdrant')) technologies.push('Qdrant');
      if (content.includes('mem0') || content.includes('Mem0')) technologies.push('Mem0');
      if (content.includes('graphiti') || content.includes('Graphiti'))
        technologies.push('Graphiti');
      if (content.includes('letta') || content.includes('Letta')) technologies.push('Letta');
    }

    return [...new Set(technologies)];
  }

  private getAllFiles(dirPath: string): string[] {
    const files: string[] = [];
    try {
      const items = fs.readdirSync(dirPath);
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && !item.startsWith('.')) {
          files.push(...this.getAllFiles(fullPath));
        } else if (stat.isFile()) {
          files.push(fullPath);
        }
      }
    } catch {
      // Ignore errors
    }
    return files;
  }

  private getDirectorySize(dirPath: string): number {
    try {
      const files = this.getAllFiles(dirPath);
      return files.filter(
        (file) => file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.py'),
      ).length;
    } catch {
      return 0;
    }
  }

  private findMemoryFiles(): void {
    console.log('\n🔍 Searching for additional memory-related files...');

    // Check for files containing memory references
    const memoryFiles = [
      'apps/cortex-web/cortex-web-temp/src/components/memory',
      'CONTEXT/library/roadmaps/memory-enhancement.md',
      '../../agents/resources/prompts/memory-bank.md',
      'docs/concepts/memory.md',
    ];

    for (const file of memoryFiles) {
      const fullPath = path.join(this.workspaceRoot, file);
      if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        this.systems.push({
          path: file,
          type: stat.isDirectory() ? 'directory' : 'file',
          purpose: 'Memory-related documentation or components',
          technologies: [],
          size: stat.isDirectory() ? this.getDirectorySize(fullPath) : stat.size,
          hasPackageJson: false,
          recommendation: 'pending',
        });
        console.log(`✅ Found additional: ${file}`);
      }
    }
  }

  private analyzeAndRecommend(): void {
    console.log('\n📊 Analyzing systems and generating recommendations...\n');

    for (const system of this.systems) {
      // Generate recommendations based on analysis
      if (system.path === 'cortex-memories') {
        system.recommendation =
          'INTEGRATE: Move to packages/memory/enhanced - contains Mem0, Graphiti, Letta';
      } else if (system.path === 'memory') {
        system.recommendation = 'ARCHIVE: Move content to packages/memory, remove root directory';
      } else if (system.path === 'packages/memory') {
        system.recommendation = 'KEEP: Primary memory package - consolidate others here';
      } else if (system.path.includes('packages/brainwav-memory')) {
        system.recommendation = 'CONSOLIDATE: Merge with packages/memory';
      } else if (system.path.includes('cli/commands/memory')) {
        system.recommendation = 'MOVE: Relocate to packages/memory/cli';
      } else if (system.path.includes('tools/memory')) {
        system.recommendation = 'CONSOLIDATE: Move tools to packages/memory/tools';
      } else if (system.size < 100 && !system.hasPackageJson) {
        system.recommendation = 'ARCHIVE: Small utility - consolidate into main package';
      } else {
        system.recommendation = 'REVIEW: Needs manual assessment';
      }
    }
  }

  private generateReport(): void {
    console.log('📋 COMPREHENSIVE MEMORY SYSTEM ANALYSIS REPORT');
    console.log('='.repeat(60));
    console.log(`Total memory systems found: ${this.systems.length}\n`);

    // Group by recommendation
    const byRecommendation = new Map<string, MemorySystemInfo[]>();
    for (const system of this.systems) {
      const action = system.recommendation.split(':')[0];
      if (!byRecommendation.has(action)) {
        byRecommendation.set(action, []);
      }
      byRecommendation.get(action)!.push(system);
    }

    // Display by category
    for (const [action, systems] of byRecommendation) {
      console.log(`\n🔧 ${action} (${systems.length} systems):`);
      for (const system of systems) {
        console.log(`  📁 ${system.path}`);
        console.log(`     Purpose: ${system.purpose}`);
        console.log(`     Technologies: ${system.technologies.join(', ') || 'None'}`);
        console.log(
          `     Size: ${system.type === 'directory' ? `${system.size} files` : `${system.size} bytes`}`,
        );
        console.log(`     Package: ${system.hasPackageJson ? 'Yes' : 'No'}`);
        console.log(`     Action: ${system.recommendation}`);
        console.log('');
      }
    }

    // Generate consolidation plan
    console.log('\n🗺️  CONSOLIDATION PLAN:');
    console.log('='.repeat(40));

    console.log('\nPhase 1: Archive and Clean');
    console.log('- Move /cortex-memories → packages/memory/enhanced/');
    console.log('- Archive /memory directory');
    console.log('- Remove small utility files');

    console.log('\nPhase 2: Consolidate Packages');
    console.log('- Merge packages/brainwav-memory → packages/memory/');
    console.log('- Move CLI commands → packages/memory/cli/');
    console.log('- Move tools → packages/memory/tools/');

    console.log('\nPhase 3: Update References');
    console.log('- Update all imports to use packages/memory');
    console.log('- Update workspace configuration');
    console.log('- Run tests and validate');

    // Save JSON report
    const report = {
      timestamp: new Date().toISOString(),
      totalSystems: this.systems.length,
      systems: this.systems,
      byRecommendation: Object.fromEntries(byRecommendation),
    };

    fs.writeFileSync('memory-discovery-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Detailed report saved to: memory-discovery-report.json');
  }
}

// Run the scanner
const scanner = new MemorySystemScanner();
scanner.scan();
