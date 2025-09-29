/**
 * nO Master Agent Loop - Configuration Manager
 * Part of brAInwav's production-ready nO implementation
 *
 * Centralized configuration management for operational settings
 * with environment-based overrides and validation
 */

import { EventEmitter } from 'node:events';
import { existsSync, readFileSync, watchFile } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

export interface OperationalConfiguration {
  // Service configuration
  service: {
    name: string;
    version: string;
    environment: string;
    port: number;
    host: string;
  };

  // Health check configuration
  health: {
    enabled: boolean;
    interval: number;
    timeout: number;
    endpoints: {
      health: string;
      liveness: string;
      readiness: string;
    };
    checks: {
      memory: {
        enabled: boolean;
        warningThreshold: number;
        criticalThreshold: number;
      };
      database: {
        enabled: boolean;
        timeout: number;
      };
      redis: {
        enabled: boolean;
        timeout: number;
      };
      agentPool: {
        enabled: boolean;
        timeout: number;
        minHealthyRatio: number;
      };
    };
  };

  // Monitoring configuration
  monitoring: {
    prometheus: {
      enabled: boolean;
      endpoint: string;
      prefix: string;
    };
    grafana: {
      enabled: boolean;
      dashboardPath: string;
    };
    alerting: {
      enabled: boolean;
      channels: string[];
    };
  };

  // Security configuration
  security: {
    oauth: {
      enabled: boolean;
      providers: string[];
      clientId?: string;
      clientSecret?: string;
      redirectUri?: string;
      scope: string[];
    };
    rbac: {
      enabled: boolean;
      defaultRole: string;
      roleHierarchy: Record<string, string[]>;
    };
    rateLimit: {
      enabled: boolean;
      windowMs: number;
      maxRequests: number;
    };
  };

  // Performance configuration
  performance: {
    autoscaling: {
      enabled: boolean;
      minAgents: number;
      maxAgents: number;
      targetCpu: number;
      targetMemory: number;
      scaleUpCooldown: number;
      scaleDownCooldown: number;
    };
    caching: {
      enabled: boolean;
      defaultTtl: number;
      maxSize: number;
      layers: string[];
    };
    connectionPool: {
      enabled: boolean;
      minConnections: number;
      maxConnections: number;
      acquireTimeout: number;
      idleTimeout: number;
    };
  };

  // Operational configuration
  operations: {
    gracefulShutdown: {
      enabled: boolean;
      gracePeriod: number;
      forceExitDelay: number;
      signals: string[];
    };
    logging: {
      level: string;
      format: string;
      destination: string;
    };
    admin: {
      enabled: boolean;
      endpoints: string[];
      authRequired: boolean;
    };
  };

  // Custom brAInwav configuration
  brainwav: {
    companyName: string;
    productName: string;
    brandingEnabled: boolean;
    customMetrics: string[];
    integrations: Record<string, unknown>;
  };
}

export class ConfigurationManager extends EventEmitter {
  private config: OperationalConfiguration;
  private readonly configPath: string;
  private readonly watchEnabled: boolean;

  constructor(configPath?: string, watchEnabled = true) {
    super();

    this.configPath = configPath || this.findConfigFile();
    this.watchEnabled = watchEnabled;
    this.config = this.loadConfiguration();

    if (this.watchEnabled && existsSync(this.configPath)) {
      this.setupConfigWatcher();
    }
  }

  /**
   * Find configuration file in common locations
   */
  private findConfigFile(): string {
    const possiblePaths = [
      process.env.NO_CONFIG_PATH,
      join(process.cwd(), 'config', 'operational.json'),
      join(process.cwd(), 'config', 'operational.yaml'),
      join(process.cwd(), 'operational.json'),
      join(__dirname, '..', '..', 'config', 'operational.json'),
    ].filter(Boolean) as string[];

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        return path;
      }
    }

    // Return default path if no config file found
    return join(process.cwd(), 'config', 'operational.json');
  }

  /**
   * Load configuration from file and environment variables
   */
  private loadConfiguration(): OperationalConfiguration {
    // Start with default configuration
    let config = this.getDefaultConfiguration();

    // Load from file if it exists
    if (existsSync(this.configPath)) {
      try {
        const fileContent = readFileSync(this.configPath, 'utf8');
        const fileConfig = JSON.parse(fileContent);
        config = this.mergeConfigurations(config, fileConfig);
      } catch (error) {
        console.warn(`Failed to load configuration from ${this.configPath}:`, error);
      }
    }

    // Apply environment variable overrides
    config = this.applyEnvironmentOverrides(config);

    // Validate configuration
    this.validateConfiguration(config);

    return config;
  }

  /**
   * Get default configuration
   */
  private getDefaultConfiguration(): OperationalConfiguration {
    return {
      service: {
        name: 'nO Master Agent Loop',
        version: '1.0.0',
        environment: 'development',
        port: 3000,
        host: '0.0.0.0',
      },
      health: {
        enabled: true,
        interval: 30000,
        timeout: 5000,
        endpoints: {
          health: '/health',
          liveness: '/health/live',
          readiness: '/health/ready',
        },
        checks: {
          memory: {
            enabled: true,
            warningThreshold: 0.8,
            criticalThreshold: 0.95,
          },
          database: {
            enabled: true,
            timeout: 5000,
          },
          redis: {
            enabled: true,
            timeout: 3000,
          },
          agentPool: {
            enabled: true,
            timeout: 10000,
            minHealthyRatio: 0.7,
          },
        },
      },
      monitoring: {
        prometheus: {
          enabled: true,
          endpoint: '/metrics',
          prefix: 'no_',
        },
        grafana: {
          enabled: true,
          dashboardPath: './monitoring/grafana-dashboard.json',
        },
        alerting: {
          enabled: false,
          channels: [],
        },
      },
      security: {
        oauth: {
          enabled: false,
          providers: ['google'],
          scope: ['openid', 'profile', 'email'],
        },
        rbac: {
          enabled: true,
          defaultRole: 'user',
          roleHierarchy: {
            admin: ['user'],
            user: [],
          },
        },
        rateLimit: {
          enabled: true,
          windowMs: 900000, // 15 minutes
          maxRequests: 100,
        },
      },
      performance: {
        autoscaling: {
          enabled: true,
          minAgents: 2,
          maxAgents: 20,
          targetCpu: 70,
          targetMemory: 80,
          scaleUpCooldown: 300000, // 5 minutes
          scaleDownCooldown: 600000, // 10 minutes
        },
        caching: {
          enabled: true,
          defaultTtl: 300000, // 5 minutes
          maxSize: 1000,
          layers: ['memory', 'redis'],
        },
        connectionPool: {
          enabled: true,
          minConnections: 5,
          maxConnections: 20,
          acquireTimeout: 10000,
          idleTimeout: 30000,
        },
      },
      operations: {
        gracefulShutdown: {
          enabled: true,
          gracePeriod: 30000,
          forceExitDelay: 5000,
          signals: ['SIGTERM', 'SIGINT'],
        },
        logging: {
          level: 'info',
          format: 'json',
          destination: 'console',
        },
        admin: {
          enabled: true,
          endpoints: ['/admin'],
          authRequired: true,
        },
      },
      brainwav: {
        companyName: 'brAInwav',
        productName: 'nO Master Agent Loop',
        brandingEnabled: true,
        customMetrics: ['agent_performance', 'loop_efficiency'],
        integrations: {},
      },
    };
  }

  // Add a Zod schema for runtime validation of merged records
  private static readonly OperationalConfigurationSchema = z.object({
    service: z.object({
      name: z.string(),
      version: z.string(),
      environment: z.string(),
      port: z.number(),
      host: z.string(),
    }),
    health: z.object({
      enabled: z.boolean(),
      interval: z.number(),
      timeout: z.number(),
      endpoints: z.object({
        health: z.string(),
        liveness: z.string(),
        readiness: z.string(),
      }),
      checks: z.record(z.any()),
    }),
    monitoring: z.object({
      prometheus: z.object({ enabled: z.boolean(), endpoint: z.string(), prefix: z.string() }),
      grafana: z.object({ enabled: z.boolean(), dashboardPath: z.string() }),
      alerting: z.object({ enabled: z.boolean(), channels: z.array(z.string()) }),
    }),
    security: z.object({
      oauth: z.object({ enabled: z.boolean(), providers: z.array(z.string()) }).partial(),
      rbac: z.object({ enabled: z.boolean(), defaultRole: z.string(), roleHierarchy: z.record(z.array(z.string())) }),
      rateLimit: z.object({ enabled: z.boolean(), windowMs: z.number(), maxRequests: z.number() }),
    }),
    performance: z.object({
      autoscaling: z.object({
        enabled: z.boolean(),
        minAgents: z.number(),
        maxAgents: z.number(),
        targetCpu: z.number(),
        targetMemory: z.number(),
        scaleUpCooldown: z.number(),
        scaleDownCooldown: z.number(),
      }),
      caching: z.object({ enabled: z.boolean(), defaultTtl: z.number(), maxSize: z.number(), layers: z.array(z.string()) }),
      connectionPool: z.object({ enabled: z.boolean(), minConnections: z.number(), maxConnections: z.number(), acquireTimeout: z.number(), idleTimeout: z.number() }),
    }),
    operations: z.object({
      gracefulShutdown: z.object({ enabled: z.boolean(), gracePeriod: z.number(), forceExitDelay: z.number(), signals: z.array(z.string()) }),
      logging: z.object({ level: z.string(), format: z.string(), destination: z.string() }),
      admin: z.object({ enabled: z.boolean(), endpoints: z.array(z.string()), authRequired: z.boolean() }),
    }),
    brainwav: z.object({
      companyName: z.string(),
      productName: z.string(),
      brandingEnabled: z.boolean(),
      customMetrics: z.array(z.string()),
      integrations: z.record(z.unknown()),
    }),
  });

  /**
   * Merge two configuration objects
   */
  private mergeConfigurations(
    base: OperationalConfiguration,
    override: Partial<OperationalConfiguration>,
  ): OperationalConfiguration {
    // Use an intermediate unknown record to perform shallow merges without
    // resorting to explicit `any` casts. We carefully cast back to the
    // strongly-typed OperationalConfiguration at the end.
    const mergedRecord: Record<string, unknown> = { ...base } as Record<string, unknown>;

    for (const key in override) {
      const value = override[key as keyof OperationalConfiguration] as unknown;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const existing = mergedRecord[key] as Record<string, unknown> | undefined;
        mergedRecord[key] = {
          ...(existing ?? {}),
          ...(value as Record<string, unknown>),
        };
      } else if (value !== undefined) {
        mergedRecord[key] = value;
      }
    }

    // Validate the merged record at runtime and return the typed result.
    // Use Zod schema to ensure runtime shape matches OperationalConfiguration.
    try {
      return ConfigurationManager.OperationalConfigurationSchema.parse(mergedRecord) as OperationalConfiguration;
    } catch (e) {
      // Fallback: for backward compatibility, rethrow with context so callers can handle.
      throw new Error(`Invalid configuration shape after merge: ${(e as Error).message}`);
    }
  }

  /**
   * Apply environment variable overrides
   */
  private applyEnvironmentOverrides(config: OperationalConfiguration): OperationalConfiguration {
    const envOverrides: Partial<OperationalConfiguration> = {};

    // Service configuration
    if (process.env.NO_SERVICE_PORT) {
      envOverrides.service = { ...config.service, port: parseInt(process.env.NO_SERVICE_PORT, 10) };
    }
    if (process.env.NO_SERVICE_HOST) {
      envOverrides.service = { ...config.service, host: process.env.NO_SERVICE_HOST };
    }
    if (process.env.NODE_ENV) {
      envOverrides.service = { ...config.service, environment: process.env.NODE_ENV };
    }

    // Health check configuration
    if (process.env.NO_HEALTH_ENABLED) {
      envOverrides.health = {
        ...config.health,
        enabled: process.env.NO_HEALTH_ENABLED === 'true',
      };
    }

    // Monitoring configuration
    if (process.env.NO_PROMETHEUS_ENABLED) {
      envOverrides.monitoring = {
        ...config.monitoring,
        prometheus: {
          ...config.monitoring.prometheus,
          enabled: process.env.NO_PROMETHEUS_ENABLED === 'true',
        },
      };
    }

    // Security configuration
    if (process.env.NO_OAUTH_CLIENT_ID) {
      envOverrides.security = {
        ...config.security,
        oauth: {
          ...config.security.oauth,
          clientId: process.env.NO_OAUTH_CLIENT_ID,
          clientSecret: process.env.NO_OAUTH_CLIENT_SECRET,
          redirectUri: process.env.NO_OAUTH_REDIRECT_URI,
        },
      };
    }

    return this.mergeConfigurations(config, envOverrides);
  }

  /**
   * Validate configuration
   */
  private validateConfiguration(config: OperationalConfiguration): void {
    // Validate service configuration
    if (config.service.port < 1 || config.service.port > 65535) {
      throw new Error('Invalid service port number');
    }

    // Validate health check thresholds
    if (
      config.health.checks.memory.warningThreshold >= config.health.checks.memory.criticalThreshold
    ) {
      throw new Error('Memory warning threshold must be less than critical threshold');
    }

    // Validate autoscaling configuration
    if (config.performance.autoscaling.minAgents >= config.performance.autoscaling.maxAgents) {
      throw new Error('Minimum agents must be less than maximum agents');
    }

    // Validate timeout values
    if (config.health.timeout <= 0) {
      throw new Error('Health check timeout must be positive');
    }
  }

  /**
   * Setup configuration file watcher
   */
  private setupConfigWatcher(): void {
    watchFile(this.configPath, { interval: 5000 }, () => {
      try {
        console.log('Configuration file changed, reloading...');
        const newConfig = this.loadConfiguration();
        const oldConfig = this.config;
        this.config = newConfig;
        this.emit('config-changed', newConfig, oldConfig);
      } catch (error) {
        console.error('Failed to reload configuration:', error);
        this.emit('config-error', error);
      }
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): OperationalConfiguration {
    return { ...this.config };
  }

  /**
   * Get specific configuration section
   */
  getSection<K extends keyof OperationalConfiguration>(section: K): OperationalConfiguration[K] {
    return { ...this.config[section] };
  }

  /**
   * Update configuration programmatically
   */
  updateConfig(updates: Partial<OperationalConfiguration>): void {
    const newConfig = this.mergeConfigurations(this.config, updates);
    this.validateConfiguration(newConfig);

    const oldConfig = this.config;
    this.config = newConfig;
    this.emit('config-updated', newConfig, oldConfig);
  }

  /**
   * Reload configuration from file
   */
  reload(): void {
    const newConfig = this.loadConfiguration();
    const oldConfig = this.config;
    this.config = newConfig;
    this.emit('config-reloaded', newConfig, oldConfig);
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(feature: string): boolean {
    const parts = feature.split('.');
    let current: unknown = this.config;

    for (const part of parts) {
      if (current && typeof current === 'object') {
        const record = current as Record<string, unknown>;
        if (part in record) {
          current = record[part];
          continue;
        }
      }
      return false;
    }

    return current === true;
  }

  /**
   * Get configuration value by path
   */
  getValue<T>(path: string, defaultValue?: T): T {
    const parts = path.split('.');
    let current: unknown = this.config;

    for (const part of parts) {
      if (current && typeof current === 'object') {
        const record = current as Record<string, unknown>;
        if (part in record) {
          current = record[part];
          continue;
        }
      }
      return defaultValue as T;
    }

    return current as T;
  }
}
