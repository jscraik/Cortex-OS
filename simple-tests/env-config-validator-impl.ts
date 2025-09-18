import { z } from 'zod';

// Zod schemas for environment configuration validation
const SecurityConfigSchema = z.object({
	secretsEncryption: z.boolean(),
	maxRequestSize: z.number().positive(),
	allowedOrigins: z.array(
		z.string().refine(
			(url) => {
				try {
					// Allow wildcard for development
					if (url === '*') return true;
					new URL(url);
					return true;
				} catch {
					return false;
				}
			},
			{ message: 'Invalid origin URL' },
		),
	),
	rateLimitEnabled: z.boolean(),
	sessionTimeout: z
		.number()
		.min(60)
		.max(86400)
		.refine((timeout) => timeout >= 60 && timeout <= 86400, {
			message: 'Invalid session timeout',
		}),
});

const DatabaseConfigSchema = z.object({
	url: z.string().refine(
		(url) => {
			// Basic database URL validation
			const dbUrlRegex = /^(postgresql|mysql|mongodb|sqlite):\/\/.+/;
			return dbUrlRegex.test(url);
		},
		{ message: 'Invalid database URL' },
	),
	poolSize: z.number().min(1).max(100),
	sslMode: z.enum(['disable', 'allow', 'prefer', 'require'], {
		errorMap: () => ({ message: 'Invalid SSL mode' }),
	}),
});

const MemoryConfigSchema = z.object({
	adapter: z.enum(['local', 'sqlite', 'prisma', 'memory']),
	namespace: z.string().optional(),
	encryption: z.boolean(),
});

const McpConfigSchema = z.object({
	serverUrls: z.array(z.string().url()),
	timeout: z.number().positive(),
	retryCount: z.number().min(0).max(10),
});

const EnvironmentConfigSchema = z.object({
	nodeEnv: z.enum(['development', 'test', 'production'], {
		errorMap: () => ({ message: 'Invalid node environment' }),
	}),
	port: z.number().min(1).max(65535, 'Invalid port number'),
	logLevel: z.enum(['error', 'warn', 'info', 'debug', 'trace'], {
		errorMap: () => ({ message: 'Invalid log level' }),
	}),
	security: SecurityConfigSchema.optional(),
	database: DatabaseConfigSchema.optional(),
	memory: MemoryConfigSchema.optional(),
	mcp: McpConfigSchema.optional(),
	secrets: z.record(z.string()).optional(),
});

// Type inference from schemas
export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;
export type SecurityConfig = z.infer<typeof SecurityConfigSchema>;
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
export type MemoryConfig = z.infer<typeof MemoryConfigSchema>;
export type McpConfig = z.infer<typeof McpConfigSchema>;

export interface EnvironmentValidator {
	validateSchema(config: unknown): EnvironmentConfig;
	loadFromEnv(env: Record<string, string | undefined>): EnvironmentConfig;
	checkSecurityIssues(config: EnvironmentConfig): string[];
	validateRequiredSecrets(env: Record<string, string | undefined>): string[];
	mergeConfigurations(
		defaultConfig: EnvironmentConfig,
		overrideConfig: Partial<EnvironmentConfig>,
	): EnvironmentConfig;
	toSafeString(config: EnvironmentConfig): string;
}

class EnvironmentValidatorImpl implements EnvironmentValidator {
	validateSchema(config: unknown): EnvironmentConfig {
		return EnvironmentConfigSchema.parse(config);
	}

	loadFromEnv(env: Record<string, string | undefined>): EnvironmentConfig {
		// Apply defaults when loading from environment
		const config: EnvironmentConfig = {
			nodeEnv:
				(env.NODE_ENV as 'development' | 'test' | 'production') ||
				'development',
			port: env.PORT ? parseInt(env.PORT, 10) : 3000,
			logLevel:
				(env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug') || 'info',
			// Always include security config with defaults
			security: {
				// Only include schema-supported properties
				secretsEncryption: env.SECRETS_ENCRYPTION
					? env.SECRETS_ENCRYPTION === 'true'
					: true,
				maxRequestSize: env.MAX_REQUEST_SIZE
					? parseInt(env.MAX_REQUEST_SIZE, 10)
					: 1048576,
				allowedOrigins: env.ALLOWED_ORIGINS?.split(',') || [
					'http://localhost:3000',
				],
				rateLimitEnabled: env.RATE_LIMIT_ENABLED
					? env.RATE_LIMIT_ENABLED === 'true'
					: true,
				sessionTimeout: env.SESSION_TIMEOUT
					? parseInt(env.SESSION_TIMEOUT, 10)
					: 3600,
			},
			// Always include database config with defaults
			database: {
				url: env.DATABASE_URL || 'sqlite://memory.db',
				sslMode:
					(env.DATABASE_SSL_MODE as
						| 'disable'
						| 'allow'
						| 'prefer'
						| 'require') || 'prefer',
				poolSize: env.DATABASE_POOL_SIZE
					? parseInt(env.DATABASE_POOL_SIZE, 10)
					: 10,
			},
		};

		// Add other optional configurations
		this.addMemoryConfig(config, env);
		this.addMcpConfig(config, env);

		// Validate the constructed configuration
		return this.validateSchema(config);
	}

	private addMemoryConfig(
		config: EnvironmentConfig,
		env: Record<string, string | undefined>,
	): void {
		if (env.MEMORY_ADAPTER) {
			config.memory = {
				adapter: env.MEMORY_ADAPTER as 'local' | 'sqlite' | 'prisma' | 'memory',
				namespace: env.MEMORY_NAMESPACE,
				encryption: env.MEMORY_ENCRYPTION === 'true',
			};
		}
	}

	private addMcpConfig(
		config: EnvironmentConfig,
		env: Record<string, string | undefined>,
	): void {
		if (env.MCP_SERVER_URLS) {
			config.mcp = {
				serverUrls: env.MCP_SERVER_URLS.split(',').map((s) => s.trim()),
				timeout: env.MCP_TIMEOUT ? parseInt(env.MCP_TIMEOUT, 10) : 30000,
				retryCount: env.MCP_RETRY_COUNT ? parseInt(env.MCP_RETRY_COUNT, 10) : 3,
			};
		}
	}

	checkSecurityIssues(config: EnvironmentConfig): string[] {
		const warnings: string[] = [];

		if (config.nodeEnv === 'production') {
			this.checkProductionLogging(config, warnings);
			this.checkProductionSecurity(config, warnings);
		}

		return warnings;
	}

	private checkProductionLogging(
		config: EnvironmentConfig,
		warnings: string[],
	): void {
		if (config.logLevel === 'debug' || config.logLevel === 'trace') {
			warnings.push('Debug logging enabled in production');
		}
	}

	private checkProductionSecurity(
		config: EnvironmentConfig,
		warnings: string[],
	): void {
		if (!config.security) return;

		if (!config.security.secretsEncryption) {
			warnings.push('Secrets encryption disabled in production');
		}

		if (!config.security.rateLimitEnabled) {
			warnings.push('Rate limiting disabled in production');
		}

		if (config.security.allowedOrigins.includes('*')) {
			warnings.push('Wildcard origins allowed in production');
		}

		if (config.security.sessionTimeout > 7200) {
			// 2 hours
			warnings.push('Session timeout too long for production');
		}
	}

	validateRequiredSecrets(env: Record<string, string | undefined>): string[] {
		const missing: string[] = [];
		const requiredInProduction = [
			'DATABASE_URL',
			'JWT_SECRET',
			'ENCRYPTION_KEY',
		];

		if (env.NODE_ENV === 'production') {
			for (const secret of requiredInProduction) {
				if (!env[secret]) {
					missing.push(secret);
				}
			}
		}

		return missing;
	}

	mergeConfigurations(
		defaultConfig: EnvironmentConfig,
		overrideConfig: Partial<EnvironmentConfig>,
	): EnvironmentConfig {
		const merged = { ...defaultConfig };

		// Merge top-level properties
		Object.assign(merged, overrideConfig);

		// Deep merge security config
		if (defaultConfig.security && overrideConfig.security) {
			merged.security = {
				...defaultConfig.security,
				...overrideConfig.security,
			};
		} else if (overrideConfig.security) {
			merged.security = overrideConfig.security;
		}

		// Deep merge database config
		if (defaultConfig.database && overrideConfig.database) {
			merged.database = {
				...defaultConfig.database,
				...overrideConfig.database,
			};
		} else if (overrideConfig.database) {
			merged.database = overrideConfig.database;
		}

		// Deep merge memory config
		if (defaultConfig.memory && overrideConfig.memory) {
			merged.memory = { ...defaultConfig.memory, ...overrideConfig.memory };
		} else if (overrideConfig.memory) {
			merged.memory = overrideConfig.memory;
		}

		// Deep merge MCP config
		if (defaultConfig.mcp && overrideConfig.mcp) {
			merged.mcp = { ...defaultConfig.mcp, ...overrideConfig.mcp };
		} else if (overrideConfig.mcp) {
			merged.mcp = overrideConfig.mcp;
		}

		return merged;
	}

	toSafeString(config: EnvironmentConfig): string {
		// Create a deep clone and redact sensitive information
		const safeConfig = JSON.parse(JSON.stringify(config));

		// Redact database passwords
		if (safeConfig.database?.url) {
			safeConfig.database.url = safeConfig.database.url.replace(
				/:([^@:]+)@/,
				':[REDACTED]@',
			);
		}

		// Redact secrets
		if (safeConfig.secrets) {
			for (const key in safeConfig.secrets) {
				safeConfig.secrets[key] = '[REDACTED]';
			}
		}

		return JSON.stringify(safeConfig, null, 2);
	}
}

export function createEnvironmentValidator(): EnvironmentValidator {
	return new EnvironmentValidatorImpl();
}
