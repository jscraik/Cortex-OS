#!/usr/bin/env tsx

/**
 * Comprehensive Memory System Discovery Tool
 *
 * This tool performs a complete scan of the entire workspace to discover
 * ALL memory-related packages, directories, and implementations.
 *
 * It identifies:
 * - Root level memory directories
 * - Nested memory packages in apps/packages
 * - Memory-related files and configurations
 * - Dependencies and conflicts
 * - Integration vs archive recommendations
 */

import * as fs from 'fs';
import * as path from 'path';
import logger from './utils/logger';

interface MemorySystem {
  location: string;
  relativePath: string;
  type: 'package' | 'directory' | 'standalone' | 'config' | 'tool';
  hasPackageJson: boolean;
  hasTests: boolean;
  hasDocs: boolean;
  hasSource: boolean;
  technologies: string[];
  dependencies: string[];
  purpose: string;
  codeSize: number;
  lastModified: Date;
  conflicts: string[];
  uniqueValue: string[];
  recommendation: 'integrate' | 'archive' | 'consolidate' | 'keep-separate';
  priority: 'high' | 'medium' | 'low';
}

interface ScanResult {
  totalMemorySystems: number;
  byCategory: {
    toIntegrate: MemorySystem[];
    toArchive: MemorySystem[];
    toConsolidate: MemorySystem[];
    toKeepSeparate: MemorySystem[];
  };
  conflicts: string[];
  recommendations: string[];
  migrationPlan: {
    phase: number;
    description: string;
    actions: string[];
    systems: string[];
  }[];
}

class ComprehensiveMemoryScanner {
  private workspaceRoot: string;
  private foundSystems: MemorySystem[] = [];

  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
  }

  async scan(): Promise<ScanResult> {
    logger.info('🔍 Starting Comprehensive Memory System Discovery...');

    // Scan all possible locations
    await this.scanRootLevel();
    await this.scanAppsDirectory();
    await this.scanPackagesDirectory();
    await this.scanExternalDirectory();
    await this.scanToolsDirectory();
    await this.scanConfigDirectories();
    await this.scanInstructionsDirectory();
    await this.scanMemoryFiles();

    logger.info(`📊 Found ${this.foundSystems.length} memory-related systems`);

    // Analyze and categorize
    const analyzed = this.analyzeConflicts();
    const categorized = this.categorizeSystems();
    const migrationPlan = this.createMigrationPlan();

    return {
      totalMemorySystems: this.foundSystems.length,
      byCategory: categorized,
      conflicts: analyzed,
      recommendations: this.generateRecommendations(),
      migrationPlan,
    };
  }

  private async scanRootLevel(): Promise<void> {
    logger.info('📁 Scanning root level directories...');

    const rootDirs = fs
      .readdirSync(this.workspaceRoot, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name)
      .filter((name) => name.includes('memory') || name.includes('cortex-memory'));

    for (const dir of rootDirs) {
      await this.analyzeDirectory(path.join(this.workspaceRoot, dir), dir);
    }
  }

  private async scanAppsDirectory(): Promise<void> {
    logger.info('📁 Scanning apps directory...');

    const appsPath = path.join(this.workspaceRoot, 'apps');
    if (!fs.existsSync(appsPath)) return;

    const apps = fs
      .readdirSync(appsPath, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    for (const app of apps) {
      const appPath = path.join(appsPath, app);

      // Check for memory in app root
      const memoryPaths = [
        path.join(appPath, 'memory'),
        path.join(appPath, 'src', 'memory'),
        path.join(appPath, 'packages', 'memory'),
        path.join(appPath, 'commands', 'memory.ts'),
        path.join(appPath, 'commands', 'memory.py'),
        path.join(appPath, 'commands', 'memory-manager.ts'),
      ];

      for (const memoryPath of memoryPaths) {
        if (fs.existsSync(memoryPath)) {
          const relativePath = path.relative(this.workspaceRoot, memoryPath);
          await this.analyzeDirectory(memoryPath, relativePath);
        }
      }

      // Scan packages within apps
      const packagesPath = path.join(appPath, 'packages');
      if (fs.existsSync(packagesPath)) {
        await this.scanPackagesInDirectory(packagesPath, `apps/${app}/packages`);
      }
    }
  }

  private async scanPackagesDirectory(): Promise<void> {
    logger.info('📁 Scanning packages directory...');

    const packagesPath = path.join(this.workspaceRoot, 'packages');
    if (fs.existsSync(packagesPath)) {
      await this.scanPackagesInDirectory(packagesPath, 'packages');
    }
  }

  private async scanPackagesInDirectory(packagesPath: string, prefix: string): Promise<void> {
    const packages = fs
      .readdirSync(packagesPath, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name)
      .filter((name) => name.includes('memory') || name.includes('brainwav-memory'));

    for (const pkg of packages) {
      const pkgPath = path.join(packagesPath, pkg);
      const relativePath = `${prefix}/${pkg}`;
      await this.analyzeDirectory(pkgPath, relativePath);
    }
  }

  private async scanExternalDirectory(): Promise<void> {
    logger.info('📁 Scanning external directory...');

    const externalPath = path.join(this.workspaceRoot, 'external');
    if (!fs.existsSync(externalPath)) return;

    // External directory exists but cipher has been removed
  }

  private async scanToolsDirectory(): Promise<void> {
    logger.info('📁 Scanning tools directory...');

    const toolsPath = path.join(this.workspaceRoot, 'tools');
    if (!fs.existsSync(toolsPath)) return;

    const memoryToolsPath = path.join(toolsPath, 'memory');
    if (fs.existsSync(memoryToolsPath)) {
      const relativePath = path.relative(this.workspaceRoot, memoryToolsPath);
      await this.analyzeDirectory(memoryToolsPath, relativePath);
    }

    // Scan for memory-related tools
    const tools = fs
      .readdirSync(toolsPath)
      .filter((file) => file.includes('memory') && file.endsWith('.ts'));

    for (const tool of tools) {
      const toolPath = path.join(toolsPath, tool);
      const relativePath = path.relative(this.workspaceRoot, toolPath);
      await this.analyzeFile(toolPath, relativePath);
    }
  }

  private async scanConfigDirectories(): Promise<void> {
    logger.info('📁 Scanning configuration directories...');

    // Check various config locations
    const configPaths = [
      'config',
      '.cortex',
      'cortex-config.json',
      'memory-config.json',
      'cortex-memories/memory-config.json',
    ];

    for (const configPath of configPaths) {
      const fullPath = path.join(this.workspaceRoot, configPath);
      if (fs.existsSync(fullPath)) {
        const relativePath = path.relative(this.workspaceRoot, fullPath);
        if (fs.statSync(fullPath).isDirectory()) {
          await this.analyzeDirectory(fullPath, relativePath);
        } else {
          await this.analyzeFile(fullPath, relativePath);
        }
      }
    }
  }

  private async scanInstructionsDirectory(): Promise<void> {
    logger.info('📁 Scanning instructions directory...');

    const instructionsPath = path.join(this.workspaceRoot, 'instructions');
    if (!fs.existsSync(instructionsPath)) return;

    // Look for memory.ts and swarm.ts (imports SwarmMemoryManager)
    const memoryFiles = ['memory.ts', 'swarm.ts', 'hive.ts'];

    for (const file of memoryFiles) {
      const filePath = path.join(instructionsPath, file);
      if (fs.existsSync(filePath)) {
        const relativePath = path.relative(this.workspaceRoot, filePath);
        await this.analyzeFile(filePath, relativePath);
      }
    }
  }

  private async scanMemoryFiles(): Promise<void> {
    logger.info('📁 Scanning for memory-related files...');

    // Look for specific memory files
    const memoryFiles = [
      'docker/memory_manager.py',
      'scripts/monitoring/memory-leak-monitor.js',
      'scripts/python/memory_compression.py',
      'apps/cortex-py/src/mlx/memory_monitor.py',
    ];

    for (const file of memoryFiles) {
      const filePath = path.join(this.workspaceRoot, file);
      if (fs.existsSync(filePath)) {
        const relativePath = path.relative(this.workspaceRoot, filePath);
        await this.analyzeFile(filePath, relativePath);
      }
    }
  }

  private async analyzeDirectory(dirPath: string, relativePath: string): Promise<void> {
    if (!fs.existsSync(dirPath)) return;

    logger.debug(`  📂 Analyzing: ${relativePath}`);

    const stat = fs.statSync(dirPath);
    const hasPackageJson = fs.existsSync(path.join(dirPath, 'package.json'));
    const hasTests = this.hasTests(dirPath);
    const hasDocs = this.hasDocs(dirPath);
    const hasSource = this.hasSource(dirPath);

    const technologies = this.detectTechnologies(dirPath);
    const dependencies = hasPackageJson ? this.getDependencies(dirPath) : [];
    const purpose = this.inferPurpose(dirPath, relativePath, technologies);
    const codeSize = this.getCodeSize(dirPath);

    const system: MemorySystem = {
      location: dirPath,
      relativePath,
      type: hasPackageJson ? 'package' : 'directory',
      hasPackageJson,
      hasTests,
      hasDocs,
      hasSource,
      technologies,
      dependencies,
      purpose,
      codeSize,
      lastModified: stat.mtime,
      conflicts: this.detectConflicts(relativePath, technologies),
      uniqueValue: this.assessUniqueValue(dirPath, technologies, dependencies),
      recommendation: 'integrate', // Will be determined later
      priority: 'medium', // Will be determined later
    };

    this.foundSystems.push(system);
  }

  private async analyzeFile(filePath: string, relativePath: string): Promise<void> {
    if (!fs.existsSync(filePath)) return;

    logger.debug(`  📄 Analyzing: ${relativePath}`);

    const stat = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    const technologies = this.detectTechnologiesFromContent(content);
    const purpose = this.inferPurposeFromFile(filePath, content);

    const system: MemorySystem = {
      location: filePath,
      relativePath,
      type: filePath.includes('config') ? 'config' : 'tool',
      hasPackageJson: false,
      hasTests: false,
      hasDocs: false,
      hasSource: true,
      technologies,
      dependencies: [],
      purpose,
      codeSize: content.split('\n').length,
      lastModified: stat.mtime,
      conflicts: this.detectConflicts(relativePath, technologies),
      uniqueValue: this.assessUniqueValueFromFile(content, technologies),
      recommendation: 'integrate',
      priority: 'low',
    };

    this.foundSystems.push(system);
  }

  private hasTests(dirPath: string): boolean {
    const testPaths = [
      path.join(dirPath, 'tests'),
      path.join(dirPath, 'test'),
      path.join(dirPath, '__tests__'),
      path.join(dirPath, 'src', 'tests'),
      path.join(dirPath, 'src', 'test'),
    ];

    return (
      testPaths.some((testPath) => fs.existsSync(testPath)) ||
      fs.readdirSync(dirPath).some((file) => file.includes('.test.') || file.includes('.spec.'))
    );
  }

  private hasDocs(dirPath: string): boolean {
    const docPaths = [
      path.join(dirPath, 'README.md'),
      path.join(dirPath, 'docs'),
      path.join(dirPath, 'documentation'),
    ];

    return docPaths.some((docPath) => fs.existsSync(docPath));
  }

  private hasSource(dirPath: string): boolean {
    const srcPaths = [
      path.join(dirPath, 'src'),
      path.join(dirPath, 'lib'),
      path.join(dirPath, 'index.ts'),
      path.join(dirPath, 'index.js'),
    ];

    return srcPaths.some((srcPath) => fs.existsSync(srcPath));
  }

  private detectTechnologies(dirPath: string): string[] {
    const technologies = new Set<string>();

    // Check for specific files
    const files = this.getAllFiles(dirPath);

    for (const file of files) {
      if (file.includes('neo4j') || file.includes('Neo4j')) technologies.add('Neo4j');
      if (file.includes('qdrant') || file.includes('Qdrant')) technologies.add('Qdrant');
      if (file.includes('mem0') || file.includes('Mem0')) technologies.add('Mem0');
      if (file.includes('graphiti') || file.includes('Graphiti')) technologies.add('Graphiti');
      if (file.includes('letta') || file.includes('Letta')) technologies.add('Letta');
      if (file.includes('docker') || file.includes('Docker')) technologies.add('Docker');
      if (file.includes('postgresql') || file.includes('postgres')) technologies.add('PostgreSQL');
      if (file.includes('sqlite') || file.includes('SQLite')) technologies.add('SQLite');
      if (file.endsWith('.py')) technologies.add('Python');
      if (file.endsWith('.ts') || file.endsWith('.js')) technologies.add('TypeScript/JavaScript');
    }

    return Array.from(technologies);
  }

  private detectTechnologiesFromContent(content: string): string[] {
    const technologies = new Set<string>();

    if (content.includes('neo4j') || content.includes('Neo4j')) technologies.add('Neo4j');
    if (content.includes('qdrant') || content.includes('Qdrant')) technologies.add('Qdrant');
    if (content.includes('mem0') || content.includes('Mem0')) technologies.add('Mem0');
    if (content.includes('graphiti') || content.includes('Graphiti')) technologies.add('Graphiti');
    if (content.includes('letta') || content.includes('Letta')) technologies.add('Letta');
    if (content.includes('SwarmMemoryManager')) technologies.add('Swarm Memory');
    if (content.includes('MemoryService')) technologies.add('Memory Service');

    return Array.from(technologies);
  }

  private getAllFiles(dirPath: string): string[] {
    const files: string[] = [];

    try {
      const items = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);

        if (item.isDirectory() && !item.name.startsWith('.')) {
          files.push(...this.getAllFiles(fullPath));
        } else if (item.isFile()) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore permission errors
    }

    return files;
  }

  private getDependencies(dirPath: string): string[] {
    const packageJsonPath = path.join(dirPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) return [];

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const deps = [
        ...Object.keys(packageJson.dependencies || {}),
        ...Object.keys(packageJson.devDependencies || {}),
      ];

      return deps.filter(
        (dep) =>
          dep.includes('memory') ||
          dep.includes('neo4j') ||
          dep.includes('qdrant') ||
          dep.includes('mem0') ||
          dep.includes('graphiti') ||
          dep.includes('letta'),
      );
    } catch {
      return [];
    }
  }

  private inferPurpose(dirPath: string, relativePath: string, technologies: string[]): string {
    if (relativePath.includes('cortex-memories')) return 'Enhanced memory with advanced libraries';
    if (relativePath.includes('packages/memory')) return 'Core memory package';
    if (relativePath.includes('brainwav-memory')) return 'Brainwav memory system';
    if (relativePath.includes('cli') && relativePath.includes('memory'))
      return 'CLI memory commands';
    if (technologies.includes('Neo4j')) return 'Graph-based memory with Neo4j';
    if (technologies.includes('Qdrant')) return 'Vector-based memory with Qdrant';
    if (technologies.includes('Mem0')) return 'Mem0 memory integration';
    if (technologies.includes('Graphiti')) return 'Graphiti knowledge graphs';
    if (technologies.includes('Letta')) return 'Letta persistent memory';

    return 'Memory-related functionality';
  }

  private inferPurposeFromFile(filePath: string, content: string): string {
    if (filePath.includes('memory-manager')) return 'Memory management utilities';
    if (filePath.includes('memory-leak')) return 'Memory leak monitoring';
    if (filePath.includes('memory_compression')) return 'Memory compression utilities';
    if (filePath.includes('memory_monitor')) return 'Memory monitoring';
    if (content.includes('SwarmMemoryManager')) return 'Swarm memory management';
    if (filePath.includes('config')) return 'Memory configuration';

    return 'Memory-related tool or utility';
  }

  private getCodeSize(dirPath: string): number {
    try {
      const files = this.getAllFiles(dirPath);
      return files.filter(
        (file) => file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.py'),
      ).length;
    } catch {
      return 0;
    }
  }

  private detectConflicts(relativePath: string, technologies: string[]): string[] {
    const conflicts: string[] = [];

    // Check for path conflicts
    if (relativePath === 'memory' || relativePath === 'cortex-memories') {
      conflicts.push('Root-level memory directory conflicts with monorepo structure');
    }

    // Check for technology conflicts
    const memoryTechs = technologies.filter((tech) =>
      ['Neo4j', 'Qdrant', 'Mem0', 'Graphiti', 'Letta'].includes(tech),
    );

    if (memoryTechs.length > 1) {
      conflicts.push(`Multiple memory technologies: ${memoryTechs.join(', ')}`);
    }

    return conflicts;
  }

  private assessUniqueValue(
    dirPath: string,
    technologies: string[],
    dependencies: string[],
  ): string[] {
    const uniqueValue: string[] = [];

    if (technologies.includes('Mem0')) uniqueValue.push('Mem0 integration for user memories');
    if (technologies.includes('Graphiti')) uniqueValue.push('Graphiti knowledge graphs');
    if (technologies.includes('Letta')) uniqueValue.push('Letta persistent context');
    if (technologies.includes('Neo4j')) uniqueValue.push('Neo4j graph database');
    if (technologies.includes('Qdrant')) uniqueValue.push('Qdrant vector database');
    if (dependencies.some((dep) => dep.includes('unified')))
      uniqueValue.push('Unified memory management');

    if (uniqueValue.length === 0) {
      uniqueValue.push('Standard memory functionality');
    }

    return uniqueValue;
  }

  private assessUniqueValueFromFile(content: string, technologies: string[]): string[] {
    const uniqueValue: string[] = [];

    if (content.includes('SwarmMemoryManager')) uniqueValue.push('Swarm memory coordination');
    if (content.includes('memory leak')) uniqueValue.push('Memory leak detection');
    if (content.includes('compression')) uniqueValue.push('Memory compression');
    if (content.includes('monitoring')) uniqueValue.push('Memory monitoring');

    if (uniqueValue.length === 0) {
      uniqueValue.push('Memory utility or configuration');
    }

    return uniqueValue;
  }

  private analyzeConflicts(): string[] {
    const conflicts = new Set<string>();

    // Group by location
    const locationGroups = new Map<string, MemorySystem[]>();

    for (const system of this.foundSystems) {
      const key = system.relativePath.split('/')[0];
      if (!locationGroups.has(key)) {
        locationGroups.set(key, []);
      }
      locationGroups.get(key)!.push(system);
    }

    // Detect conflicts
    for (const [location, systems] of locationGroups) {
      if (systems.length > 1) {
        conflicts.add(`Multiple memory systems in ${location}`);
      }
    }

    // Technology conflicts
    const allTechnologies = new Set<string>();
    for (const system of this.foundSystems) {
      for (const tech of system.technologies) {
        allTechnologies.add(tech);
      }
    }

    if (allTechnologies.has('Neo4j') && allTechnologies.has('Qdrant')) {
      conflicts.add('Both Neo4j and Qdrant are used - may need consolidation');
    }

    return Array.from(conflicts);
  }

  private categorizeSystems(): ScanResult['byCategory'] {
    const toIntegrate: MemorySystem[] = [];
    const toArchive: MemorySystem[] = [];
    const toConsolidate: MemorySystem[] = [];
    const toKeepSeparate: MemorySystem[] = [];

    for (const system of this.foundSystems) {
      // Determine recommendation and priority
      if (system.relativePath.includes('cortex-memories')) {
        system.recommendation = 'integrate';
        system.priority = 'high';
        toIntegrate.push(system);
      } else if (system.relativePath.includes('packages/memory')) {
        system.recommendation = 'keep-separate';
        system.priority = 'high';
        toKeepSeparate.push(system);
      } else if (
        system.relativePath === 'memory' ||
        system.relativePath.includes('brainwav-memory')
      ) {
        system.recommendation = 'consolidate';
        system.priority = 'medium';
        toConsolidate.push(system);
      } else if (system.codeSize < 5 && !system.hasPackageJson) {
        system.recommendation = 'archive';
        system.priority = 'low';
        toArchive.push(system);
      } else {
        system.recommendation = 'integrate';
        system.priority = 'medium';
        toIntegrate.push(system);
      }
    }

    return { toIntegrate, toArchive, toConsolidate, toKeepSeparate };
  }

  private generateRecommendations(): string[] {
    return [
      'Consolidate all advanced memory libraries (Mem0, Graphiti, Letta) into packages/memory',
      'Archive small utility files and move functionality to main memory package',
      'Maintain packages/memory as the canonical memory system',
      'Create migration scripts for moving from root directories to packages',
      'Update all imports to use unified memory package',
      'Add comprehensive tests for consolidated memory system',
    ];
  }

  private createMigrationPlan(): ScanResult['migrationPlan'] {
    return [
      {
        phase: 1,
        description: 'Archive unused and duplicate systems',
        actions: [
          'Move cortex-memories content to packages/memory/enhanced',
          'Archive root-level memory directory',
          'Archive small utility files',
        ],
        systems: ['cortex-memories', 'memory', 'tools/memory-*.ts'],
      },
      {
        phase: 2,
        description: 'Consolidate CLI and app-level memory components',
        actions: [
          'Move CLI memory commands to packages/memory/cli',
          'Update imports and references',
          'Add unified memory CLI interface',
        ],
        systems: ['apps/cortex-cli/commands/memory.*', 'apps/cortex-os/packages/memory'],
      },
      {
        phase: 3,
        description: 'Integration testing and validation',
        actions: [
          'Run comprehensive tests',
          'Validate all memory functionality',
          'Update documentation',
        ],
        systems: ['All consolidated systems'],
      },
    ];
  }

  async generateReport(): Promise<void> {
    const results = await this.scan();

    const reportPath = path.join(this.workspaceRoot, 'comprehensive-memory-scan-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

    logger.info('\n📋 Comprehensive Memory System Analysis Complete!');
    logger.info(`📄 Report saved to: ${reportPath}`);

    // Print summary
    logger.info('\n📊 Summary:');
    logger.info(`Total systems found: ${results.totalMemorySystems}`);
    logger.info(`To integrate: ${results.byCategory.toIntegrate.length}`);
    logger.info(`To archive: ${results.byCategory.toArchive.length}`);
    logger.info(`To consolidate: ${results.byCategory.toConsolidate.length}`);
    logger.info(`To keep separate: ${results.byCategory.toKeepSeparate.length}`);

    logger.info('\n🔍 Found Systems:');
    for (const system of this.foundSystems) {
      logger.info(
        `  ${system.recommendation.toUpperCase()}: ${system.relativePath} (${system.purpose})`,
      );
    }

    console.log('\n⚠️  Conflicts:');
    for (const conflict of results.conflicts) {
      console.log(`  - ${conflict}`);
    }

    console.log('\n📝 Migration Plan:');
    for (const phase of results.migrationPlan) {
      console.log(`  Phase ${phase.phase}: ${phase.description}`);
      for (const action of phase.actions) {
        console.log(`    - ${action}`);
      }
    }
  }
}

// Run the scanner if this is the main module
// In ES modules we need to use import.meta.url instead of require.main
if (import.meta.url === `file://${process.argv[1]}`) {
  const scanner = new ComprehensiveMemoryScanner();
  scanner.generateReport().catch(console.error);
}

export { ComprehensiveMemoryScanner, type MemorySystem, type ScanResult };
