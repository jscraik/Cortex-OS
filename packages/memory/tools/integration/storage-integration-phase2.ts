#!/usr/bin/env node
/* eslint-disable no-console */
// tools/storage-integration-phase2.ts
// Phase 2: External Storage Integration for Enhanced Memory System

import * as fs from 'fs';
import * as path from 'path';

interface StorageConfig {
  name: string;
  path: string;
  type: 'ssd' | 'hdd';
  capacity: string;
  purpose: string[];
  variables: string[];
}

interface StorageIntegration {
  timestamp: string;
  phase: string;
  storageDevices: StorageConfig[];
  environmentTemplate: string;
  configFiles: string[];
  integrationPlan: {
    ssdTargets: string[];
    hddTargets: string[];
    migrationSteps: string[];
  };
}

interface Phase1Report {
  baseline?: {
    distribution?: {
      database?: number;
      api?: number;
      auth?: number;
    };
  };
}

class StorageIntegrator {
  private workspaceRoot: string;
  private phase1Report: Phase1Report;

  constructor() {
    this.workspaceRoot = process.cwd();
    this.phase1Report = {};
    this.loadPhase1Report();
  }

  private loadPhase1Report(): void {
    try {
      const reportPath = path.join(this.workspaceRoot, 'phase1-env-consolidation-report.json');
      const reportData = fs.readFileSync(reportPath, 'utf-8');
      this.phase1Report = JSON.parse(reportData);
      console.log('📊 Loaded Phase 1 environment consolidation report');
    } catch (error) {
      console.error('❌ Failed to load Phase 1 report:', error);
      process.exit(1);
    }
  }

  public async integrateExternalStorage(): Promise<StorageIntegration> {
    console.log('🚀 Starting Phase 2: External Storage Integration');

    // Define storage devices based on requirements
    const storageDevices: StorageConfig[] = [
      {
        name: 'cortex-ssd-critical',
        path: '/Volumes/ExternalSSD', // macOS external volume path
        type: 'ssd',
        capacity: '1.5TB',
        purpose: ['critical-data', 'database-storage', 'high-performance-cache'],
        variables: this.getCriticalVariables(),
      },
      {
        name: 'cortex-hdd-features',
        path: '/Volumes/ExternalHDD', // macOS external volume path
        type: 'hdd',
        capacity: '4TB',
        purpose: ['feature-storage', 'long-term-cache', 'backup-data'],
        variables: this.getFeatureVariables(),
      },
    ];

    // Create storage directories
    await this.createStorageDirectories(storageDevices);

    // Generate environment template
    const envTemplate = this.generateEnvironmentTemplate(storageDevices);

    // Create configuration files
    const configFiles = await this.createConfigurationFiles(storageDevices);

    // Generate migration plan
    const migrationSteps = this.generateMigrationPlan(storageDevices);

    const integration: StorageIntegration = {
      timestamp: new Date().toISOString(),
      phase: 'Phase 2: External Storage Integration',
      storageDevices,
      environmentTemplate: envTemplate,
      configFiles,
      integrationPlan: {
        ssdTargets: storageDevices[0].variables,
        hddTargets: storageDevices[1].variables,
        migrationSteps,
      },
    };

    // Save integration report
    const reportPath = path.join(this.workspaceRoot, 'phase2-storage-integration-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(integration, null, 2));

    console.log('✅ Phase 2 external storage integration complete!');
    console.log(`📄 Report saved to: ${reportPath}`);

    return integration;
  }

  private getCriticalVariables(): string[] {
    // Extract high-priority variables from Phase 1 that should go on SSD
    const critical = [];

    // Database variables
    if (this.phase1Report?.baseline?.distribution?.database) {
      critical.push('DATABASE_URL', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_PASSWORD', 'DB_USER');
    }

    // API variables
    if (this.phase1Report?.baseline?.distribution?.api) {
      critical.push('API_KEY', 'API_URL', 'API_SECRET', 'PORT');
    }

    // Auth variables
    if (this.phase1Report?.baseline?.distribution?.auth) {
      critical.push('JWT_SECRET', 'AUTH_TOKEN', 'SESSION_SECRET');
    }

    // System critical
    critical.push('NODE_ENV', 'LOG_LEVEL', 'MEMORY_LIMIT');

    return critical;
  }

  private getFeatureVariables(): string[] {
    // Extract feature variables that can go on slower HDD storage
    const features = [];

    // Feature flags and non-critical configs
    features.push(
      'CACHE_DIR',
      'TEMP_DIR',
      'UPLOAD_DIR',
      'BACKUP_DIR',
      'MEMORY_MONITORING',
      'MLX_CONCURRENCY',
      'MLX_SERVICE_URL',
    );

    return features;
  }

  private async createStorageDirectories(devices: StorageConfig[]): Promise<void> {
    console.log('📁 Creating storage directories...');

    for (const device of devices) {
      const directories = [
        path.join(device.path, 'cortex-memories'),
        path.join(device.path, 'cortex-config'),
        path.join(device.path, 'cortex-cache'),
        path.join(device.path, 'cortex-data'),
        path.join(device.path, 'cortex-logs'),
      ];

      for (const dir of directories) {
        try {
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`  ✅ Created: ${dir}`);
          } else {
            console.log(`  📁 Exists: ${dir}`);
          }
        } catch (error) {
          console.warn(`  ⚠️  Could not create ${dir} (external drive may not be mounted)`);
        }
      }
    }
  }

  private generateEnvironmentTemplate(devices: StorageConfig[]): string {
    console.log('📝 Generating environment template...');

    const template = `# Cortex OS Enhanced Memory System Configuration
# Generated: ${new Date().toISOString()}
# Phase 2: External Storage Integration

# ================================================================
# CRITICAL STORAGE (SSD - High Performance)
# ================================================================
${devices[0].name.toUpperCase()}_PATH=${devices[0].path}
${devices[0].name.toUpperCase()}_TYPE=${devices[0].type}

# Database Configuration (SSD)
DATABASE_URL=\${${devices[0].name.toUpperCase()}_PATH}/cortex-data/cortex.db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cortex_os
DB_USER=cortex_admin
DB_PASSWORD=\${CORTEX_DB_SECRET}

# API Configuration (SSD)
API_KEY=\${CORTEX_API_SECRET}
API_URL=https://api.cortex-os.local
PORT=3000

# Authentication (SSD)
JWT_SECRET=\${CORTEX_JWT_SECRET}
AUTH_TOKEN=\${CORTEX_AUTH_TOKEN}
SESSION_SECRET=\${CORTEX_SESSION_SECRET}

# ================================================================
# FEATURE STORAGE (HDD - High Capacity)
# ================================================================
${devices[1].name.toUpperCase()}_PATH=${devices[1].path}
${devices[1].name.toUpperCase()}_TYPE=${devices[1].type}

# Memory System Configuration (HDD)
CORTEX_MEMORIES_PATH=\${${devices[1].name.toUpperCase()}_PATH}/cortex-memories
MEMORY_MONITORING=enabled
MEMORY_INTEGRATION=external

# MLX Configuration (HDD)
MLX_CONCURRENCY=4
MLX_SERVICE_URL=http://localhost:8080
MLX_MANAGER_ENDPOINT=http://localhost:8081
MLX_PYTHON_SERVICE=http://localhost:8082

# Cache and Temporary Storage (HDD)
CACHE_DIR=\${${devices[1].name.toUpperCase()}_PATH}/cortex-cache
TEMP_DIR=\${${devices[1].name.toUpperCase()}_PATH}/cortex-temp
UPLOAD_DIR=\${${devices[1].name.toUpperCase()}_PATH}/cortex-uploads
BACKUP_DIR=\${${devices[1].name.toUpperCase()}_PATH}/cortex-backups

# ================================================================
# ADVANCED MEMORY LIBRARIES
# ================================================================
# Mem0 Configuration
MEM0_STORAGE_PATH=\${${devices[0].name.toUpperCase()}_PATH}/cortex-data/mem0
MEM0_CACHE_PATH=\${${devices[1].name.toUpperCase()}_PATH}/cortex-cache/mem0

# Graphiti Configuration  
GRAPHITI_GRAPH_PATH=\${${devices[0].name.toUpperCase()}_PATH}/cortex-data/graphiti
GRAPHITI_INDEX_PATH=\${${devices[1].name.toUpperCase()}_PATH}/cortex-cache/graphiti

# Letta Configuration
LETTA_MEMORY_PATH=\${${devices[0].name.toUpperCase()}_PATH}/cortex-data/letta
LETTA_CONTEXT_PATH=\${${devices[1].name.toUpperCase()}_PATH}/cortex-cache/letta

# ================================================================
# SYSTEM CONFIGURATION
# ================================================================
NODE_ENV=production
LOG_LEVEL=info
MEMORY_LIMIT=8192
LOG_PATH=\${${devices[1].name.toUpperCase()}_PATH}/cortex-logs
`;

    // Save template
    const templatePath = path.join(this.workspaceRoot, '.env.cortex.template');
    fs.writeFileSync(templatePath, template);
    console.log(`  📄 Template saved: ${templatePath}`);

    return templatePath;
  }

  private async createConfigurationFiles(devices: StorageConfig[]): Promise<string[]> {
    console.log('⚙️  Creating configuration files...');

    const configFiles: string[] = [];

    // Storage configuration
    const storageConfig = {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      devices: devices.map((device) => ({
        name: device.name,
        path: device.path,
        type: device.type,
        capacity: device.capacity,
        purpose: device.purpose,
        variableCount: device.variables.length,
      })),
      integration: {
        status: 'configured',
        phase: 'Phase 2',
        nextPhase: 'Phase 3: Mem0 Integration',
      },
    };

    const storageConfigPath = path.join(
      this.workspaceRoot,
      'cortex-memories',
      'storage-config.json',
    );

    // Ensure cortex-memories directory exists
    const memoryDir = path.join(this.workspaceRoot, 'cortex-memories');
    if (!fs.existsSync(memoryDir)) {
      fs.mkdirSync(memoryDir, { recursive: true });
    }

    fs.writeFileSync(storageConfigPath, JSON.stringify(storageConfig, null, 2));
    configFiles.push(storageConfigPath);

    // Memory system configuration
    const memoryConfig = {
      version: '2.0.0',
      enhanced: true,
      externalStorage: true,
      libraries: {
        mem0: { configured: false, path: null },
        graphiti: { configured: false, path: null },
        letta: { configured: false, path: null },
      },
      storage: {
        ssd: {
          device: devices[0].name,
          path: devices[0].path,
          purpose: 'critical-high-performance',
        },
        hdd: {
          device: devices[1].name,
          path: devices[1].path,
          purpose: 'features-long-term',
        },
      },
    };

    const memoryConfigPath = path.join(this.workspaceRoot, 'cortex-memories', 'memory-config.json');
    fs.writeFileSync(memoryConfigPath, JSON.stringify(memoryConfig, null, 2));
    configFiles.push(memoryConfigPath);

    console.log(`  ✅ Created ${configFiles.length} configuration files`);
    return configFiles;
  }

  private generateMigrationPlan(_devices: StorageConfig[]): string[] {
    console.log('📋 Generating migration plan...');

    const steps = [
      'Mount external storage devices (1.5TB SSD, 4TB HDD)',
      'Verify storage device accessibility and permissions',
      'Create cortex storage directory structure on both devices',
      'Configure environment variables using .env.cortex.template',
      'Migrate critical data to SSD storage paths',
      'Migrate feature data to HDD storage paths',
      'Update application configurations to use external storage',
      'Test storage integration and performance',
      'Proceed to Phase 3: Mem0 Integration',
    ];

    return steps;
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const integrator = new StorageIntegrator();
  integrator
    .integrateExternalStorage()
    .then(() => {
      console.log('🎯 Phase 2 complete! Ready for Phase 3: Mem0 Integration');
    })
    .catch((error) => {
      console.error('❌ Phase 2 failed:', error);
      process.exit(1);
    });
}

export { StorageIntegrator };
export type { StorageConfig, StorageIntegration };
