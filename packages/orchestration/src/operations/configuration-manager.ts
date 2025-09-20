/**
 * nO Master Agent Loop - Configuration Manager
 * Part of brAInwav's production-ready nO implementation
 * 
 * Centralized configuration management for operational settings
 * with environment-based overrides and validation
 */

import { EventEmitter } from 'events';
import { existsSync, readFileSync, watchFile } from 'fs';
import { join } from 'path';

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
        integrations: Record<string, any>;
    };
}

export class ConfigurationManager extends EventEmitter {
    private config: OperationalConfiguration;
    private configPath: string;
    private watchEnabled: boolean;

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
            join(__dirname, '..', '..', 'config', 'operational.json')
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
                host: '0.0.0.0'
            },
            health: {
                enabled: true,
                interval: 30000,
                timeout: 5000,
                endpoints: {
                    health: '/health',
                    liveness: '/health/live',
                    readiness: '/health/ready'
                },
                checks: {
                    memory: {
                        enabled: true,
                        warningThreshold: 0.8,
                        criticalThreshold: 0.95
                    },
                    database: {
                        enabled: true,
                        timeout: 5000
                    },
                    redis: {
                        enabled: true,
                        timeout: 3000
                    },
                    agentPool: {
                        enabled: true,
                        timeout: 10000,
                        minHealthyRatio: 0.7
                    }
                }
            },
            monitoring: {
                prometheus: {
                    enabled: true,
                    endpoint: '/metrics',
                    prefix: 'no_'
                },
                grafana: {
                    enabled: true,
                    dashboardPath: './monitoring/grafana-dashboard.json'
                },
                alerting: {
                    enabled: false,
                    channels: []
                }
            },
            security: {
                oauth: {
                    enabled: false,
                    providers: ['google'],
                    scope: ['openid', 'profile', 'email']
                },
                rbac: {
                    enabled: true,
                    defaultRole: 'user',
                    roleHierarchy: {
                        admin: ['user'],
                        user: []
                    }
                },
                rateLimit: {
                    enabled: true,
                    windowMs: 900000, // 15 minutes
                    maxRequests: 100
                }
            },
            performance: {
                autoscaling: {
                    enabled: true,
                    minAgents: 2,
                    maxAgents: 20,
                    targetCpu: 70,
                    targetMemory: 80,
                    scaleUpCooldown: 300000, // 5 minutes
                    scaleDownCooldown: 600000 // 10 minutes
                },
                caching: {
                    enabled: true,
                    defaultTtl: 300000, // 5 minutes
                    maxSize: 1000,
                    layers: ['memory', 'redis']
                },
                connectionPool: {
                    enabled: true,
                    minConnections: 5,
                    maxConnections: 20,
                    acquireTimeout: 10000,
                    idleTimeout: 30000
                }
            },
            operations: {
                gracefulShutdown: {
                    enabled: true,
                    gracePeriod: 30000,
                    forceExitDelay: 5000,
                    signals: ['SIGTERM', 'SIGINT']
                },
                logging: {
                    level: 'info',
                    format: 'json',
                    destination: 'console'
                },
                admin: {
                    enabled: true,
                    endpoints: ['/admin'],
                    authRequired: true
                }
            },
            brainwav: {
                companyName: 'brAInwav',
                productName: 'nO Master Agent Loop',
                brandingEnabled: true,
                customMetrics: ['agent_performance', 'loop_efficiency'],
                integrations: {}
            }
        };
    }

    /**
     * Merge two configuration objects
     */
    private mergeConfigurations(
        base: OperationalConfiguration,
        override: Partial<OperationalConfiguration>
    ): OperationalConfiguration {
        const merged = { ...base };

        for (const key in override) {
            const value = override[key as keyof OperationalConfiguration];
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                merged[key as keyof OperationalConfiguration] = {
                    ...merged[key as keyof OperationalConfiguration],
                    ...value
                } as any;
            } else if (value !== undefined) {
                (merged as any)[key] = value;
            }
        }

        return merged;
    }

    /**
     * Apply environment variable overrides
     */
    private applyEnvironmentOverrides(config: OperationalConfiguration): OperationalConfiguration {
        const envOverrides: Partial<OperationalConfiguration> = {};

        // Service configuration
        if (process.env.NO_SERVICE_PORT) {
            envOverrides.service = { ...config.service, port: parseInt(process.env.NO_SERVICE_PORT) };
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
                enabled: process.env.NO_HEALTH_ENABLED === 'true'
            };
        }

        // Monitoring configuration
        if (process.env.NO_PROMETHEUS_ENABLED) {
            envOverrides.monitoring = {
                ...config.monitoring,
                prometheus: {
                    ...config.monitoring.prometheus,
                    enabled: process.env.NO_PROMETHEUS_ENABLED === 'true'
                }
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
                    redirectUri: process.env.NO_OAUTH_REDIRECT_URI
                }
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
        if (config.health.checks.memory.warningThreshold >= config.health.checks.memory.criticalThreshold) {
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
        let current: any = this.config;

        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                return false;
            }
        }

        return current === true;
    }

    /**
     * Get configuration value by path
     */
    getValue<T>(path: string, defaultValue?: T): T {
        const parts = path.split('.');
        let current: any = this.config;

        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                return defaultValue as T;
            }
        }

        return current as T;
    }
}
