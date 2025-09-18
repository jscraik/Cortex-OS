import { describe, expect, it } from 'vitest';

// Import types and implementation
import type { EnvironmentConfig } from './env-config-validator-impl.js';
import { createEnvironmentValidator } from './env-config-validator-impl.js';

describe('Environment Configuration Validation', () => {
	describe('Schema validation', () => {
		it('should validate a complete environment configuration', () => {
			const validConfig = {
				nodeEnv: 'production',
				port: 3000,
				logLevel: 'info',
				security: {
					secretsEncryption: true,
					maxRequestSize: 1024 * 1024, // 1MB
					allowedOrigins: ['https://app.example.com'],
					rateLimitEnabled: true,
					sessionTimeout: 3600,
				},
				database: {
					url: 'postgresql://user:pass@localhost:5432/db',
					poolSize: 10,
					sslMode: 'require',
				},
				memory: {
					adapter: 'local',
					namespace: 'prod',
					encryption: true,
				},
				mcp: {
					serverUrls: ['http://localhost:3001'],
					timeout: 30000,
					retryCount: 3,
				},
			};

			expect(() => {
				const validator = createEnvironmentValidator();
				validator.validateSchema(validConfig);
			}).not.toThrow();
		});

		it('should reject configuration with invalid node environment', () => {
			const invalidConfig = {
				nodeEnv: 'invalid-env',
				port: 3000,
				logLevel: 'info',
			};

			expect(() => {
				const validator = createEnvironmentValidator();
				validator.validateSchema(invalidConfig);
			}).toThrow('Invalid node environment');
		});

		it('should require mandatory fields', () => {
			const incompleteConfig = {
				port: 3000,
				// Missing nodeEnv and logLevel
			};

			expect(() => {
				const validator = createEnvironmentValidator();
				validator.validateSchema(incompleteConfig);
			}).toThrow();
		});

		it('should validate port range', () => {
			const invalidConfig = {
				nodeEnv: 'development',
				port: 70000, // Invalid port
				logLevel: 'info',
			};

			expect(() => {
				const validator = createEnvironmentValidator();
				validator.validateSchema(invalidConfig);
			}).toThrow('Invalid port number');
		});

		it('should validate log level enum', () => {
			const invalidConfig = {
				nodeEnv: 'development',
				port: 3000,
				logLevel: 'invalid-level',
			};

			expect(() => {
				const validator = createEnvironmentValidator();
				validator.validateSchema(invalidConfig);
			}).toThrow('Invalid log level');
		});
	});

	describe('Security configuration validation', () => {
		it('should validate security settings', () => {
			const validConfig = {
				nodeEnv: 'production',
				port: 3000,
				logLevel: 'info',
				security: {
					secretsEncryption: true,
					maxRequestSize: 1024 * 1024,
					allowedOrigins: ['https://secure.example.com'],
					rateLimitEnabled: true,
					sessionTimeout: 3600,
				},
			};

			expect(() => {
				const validator = createEnvironmentValidator();
				validator.validateSchema(validConfig);
			}).not.toThrow();
		});

		it('should reject invalid origin URLs', () => {
			const invalidConfig = {
				nodeEnv: 'production',
				port: 3000,
				logLevel: 'info',
				security: {
					secretsEncryption: true,
					maxRequestSize: 1024 * 1024,
					allowedOrigins: ['not-a-valid-url'],
					rateLimitEnabled: true,
					sessionTimeout: 3600,
				},
			};

			expect(() => {
				const validator = createEnvironmentValidator();
				validator.validateSchema(invalidConfig);
			}).toThrow('Invalid origin URL');
		});

		it('should validate session timeout range', () => {
			const invalidConfig = {
				nodeEnv: 'production',
				port: 3000,
				logLevel: 'info',
				security: {
					secretsEncryption: true,
					maxRequestSize: 1024 * 1024,
					allowedOrigins: ['https://example.com'],
					rateLimitEnabled: true,
					sessionTimeout: -1, // Invalid timeout
				},
			};

			expect(() => {
				const validator = createEnvironmentValidator();
				validator.validateSchema(invalidConfig);
			}).toThrow('Invalid session timeout');
		});
	});

	describe('Database configuration validation', () => {
		it('should validate database configuration', () => {
			const validConfig = {
				nodeEnv: 'production',
				port: 3000,
				logLevel: 'info',
				database: {
					url: 'postgresql://user:pass@localhost:5432/mydb',
					poolSize: 20,
					sslMode: 'require',
				},
			};

			expect(() => {
				const validator = createEnvironmentValidator();
				validator.validateSchema(validConfig);
			}).not.toThrow();
		});

		it('should reject invalid database URL format', () => {
			const invalidConfig = {
				nodeEnv: 'production',
				port: 3000,
				logLevel: 'info',
				database: {
					url: 'invalid-db-url',
					poolSize: 10,
					sslMode: 'require',
				},
			};

			expect(() => {
				const validator = createEnvironmentValidator();
				validator.validateSchema(invalidConfig);
			}).toThrow('Invalid database URL');
		});

		it('should validate SSL mode enum', () => {
			const invalidConfig = {
				nodeEnv: 'production',
				port: 3000,
				logLevel: 'info',
				database: {
					url: 'postgresql://user:pass@localhost:5432/db',
					poolSize: 10,
					sslMode: 'invalid-ssl-mode',
				},
			};

			expect(() => {
				const validator = createEnvironmentValidator();
				validator.validateSchema(invalidConfig);
			}).toThrow('Invalid SSL mode');
		});
	});

	describe('Environment loading from process.env', () => {
		it('should load configuration from environment variables', () => {
			const mockEnv = {
				NODE_ENV: 'development',
				PORT: '4000',
				LOG_LEVEL: 'debug',
				SECRETS_ENCRYPTION: 'true',
				MAX_REQUEST_SIZE: '2048',
				ALLOWED_ORIGINS: 'https://dev.example.com,https://test.example.com',
				RATE_LIMIT_ENABLED: 'true',
				SESSION_TIMEOUT: '7200',
				DATABASE_URL: 'postgresql://dev:pass@localhost:5432/devdb',
				DATABASE_POOL_SIZE: '15',
				DATABASE_SSL_MODE: 'prefer',
				MEMORY_ADAPTER: 'sqlite',
				MEMORY_NAMESPACE: 'dev',
				MEMORY_ENCRYPTION: 'false',
				MCP_SERVER_URLS: 'http://localhost:3001,http://localhost:3002',
				MCP_TIMEOUT: '45000',
				MCP_RETRY_COUNT: '5',
			};

			const validator = createEnvironmentValidator();
			const config = validator.loadFromEnv(mockEnv);

			expect(config.nodeEnv).toBe('development');
			expect(config.port).toBe(4000);
			expect(config.logLevel).toBe('debug');
			expect(config.security?.secretsEncryption).toBe(true);
			expect(config.security?.allowedOrigins).toEqual([
				'https://dev.example.com',
				'https://test.example.com',
			]);
			expect(config.database?.poolSize).toBe(15);
			expect(config.memory?.adapter).toBe('sqlite');
			expect(config.mcp?.serverUrls).toEqual([
				'http://localhost:3001',
				'http://localhost:3002',
			]);
		});

		it('should apply default values for missing environment variables', () => {
			const minimalEnv = {
				NODE_ENV: 'development',
			};

			const validator = createEnvironmentValidator();
			const config = validator.loadFromEnv(minimalEnv);

			expect(config.port).toBe(3000); // default
			expect(config.logLevel).toBe('info'); // default
			expect(config.security?.rateLimitEnabled).toBe(true); // default
			expect(config.database?.poolSize).toBe(10); // default
		});

		it('should throw error for invalid environment variable values', () => {
			const invalidEnv = {
				NODE_ENV: 'invalid-env',
				PORT: 'not-a-number',
			};

			expect(() => {
				const validator = createEnvironmentValidator();
				validator.loadFromEnv(invalidEnv);
			}).toThrow();
		});
	});

	describe('Configuration security checks', () => {
		it('should detect insecure configurations in production', () => {
			const insecureConfig: EnvironmentConfig = {
				nodeEnv: 'production',
				port: 3000,
				logLevel: 'debug', // Too verbose for production
				security: {
					secretsEncryption: false, // Insecure
					maxRequestSize: 1024 * 1024,
					allowedOrigins: ['*'], // Too permissive
					rateLimitEnabled: false, // Insecure
					sessionTimeout: 86400, // Too long
				},
			};

			const validator = createEnvironmentValidator();
			const warnings = validator.checkSecurityIssues(insecureConfig);

			expect(warnings).toContain('Secrets encryption disabled in production');
			expect(warnings).toContain('Rate limiting disabled in production');
			expect(warnings).toContain('Wildcard origins allowed in production');
			expect(warnings).toContain('Debug logging enabled in production');
			expect(warnings).toContain('Session timeout too long for production');
		});

		it('should not warn about development-appropriate settings', () => {
			const devConfig: EnvironmentConfig = {
				nodeEnv: 'development',
				port: 3000,
				logLevel: 'debug',
				security: {
					secretsEncryption: false,
					maxRequestSize: 1024 * 1024,
					allowedOrigins: ['http://localhost:3000'],
					rateLimitEnabled: false,
					sessionTimeout: 86400,
				},
			};

			const validator = createEnvironmentValidator();
			const warnings = validator.checkSecurityIssues(devConfig);

			expect(warnings).toHaveLength(0);
		});

		it('should validate required secrets in production', () => {
			const mockEnvWithoutSecrets = {
				NODE_ENV: 'production',
				PORT: '3000',
				// Missing required secrets
			};

			const validator = createEnvironmentValidator();
			const missingSecrets = validator.validateRequiredSecrets(
				mockEnvWithoutSecrets,
			);

			expect(missingSecrets).toContain('DATABASE_URL');
			expect(missingSecrets).toContain('JWT_SECRET');
			expect(missingSecrets).toContain('ENCRYPTION_KEY');
		});
	});

	describe('Configuration utilities', () => {
		it('should merge configurations with precedence', () => {
			const defaultConfig: EnvironmentConfig = {
				nodeEnv: 'development',
				port: 3000,
				logLevel: 'info',
				security: {
					secretsEncryption: false,
					rateLimitEnabled: false,
					maxRequestSize: 1024 * 1024,
					allowedOrigins: ['http://localhost:3000'],
					sessionTimeout: 86400,
				},
			};

			const overrideConfig: Partial<EnvironmentConfig> = {
				port: 4000,
				logLevel: 'debug',
				security: {
					// Only overriding specific fields; other required fields should still come from defaultConfig merge logic.
					// Provide them here to satisfy static typing of nested object.
					secretsEncryption: false,
					maxRequestSize: 1024 * 1024,
					allowedOrigins: ['http://localhost:4000'],
					rateLimitEnabled: true,
					sessionTimeout: 3600,
				},
			};

			const validator = createEnvironmentValidator();
			const merged = validator.mergeConfigurations(
				defaultConfig,
				overrideConfig,
			);

			expect(merged.nodeEnv).toBe('development'); // from default
			expect(merged.port).toBe(4000); // overridden
			expect(merged.logLevel).toBe('debug'); // overridden
			expect(merged.security?.secretsEncryption).toBe(false); // from default
			expect(merged.security?.rateLimitEnabled).toBe(true); // overridden
		});

		it('should redact sensitive information when converting to string', () => {
			const configWithSecrets: EnvironmentConfig = {
				nodeEnv: 'production',
				port: 3000,
				logLevel: 'info',
				database: {
					url: 'postgresql://user:testpass@localhost:5432/db', // Test password
					poolSize: 10,
					sslMode: 'require',
				},
				secrets: {
					jwtSecret: 'super-secret-key',
					encryptionKey: 'another-secret',
				},
			};

			const validator = createEnvironmentValidator();
			const safeString = validator.toSafeString(configWithSecrets);

			expect(safeString).toContain('[REDACTED]');
			expect(safeString).not.toContain('secretpass');
			expect(safeString).not.toContain('super-secret-key');
			expect(safeString).not.toContain('another-secret');
			expect(safeString).toContain('production'); // Non-sensitive data should be visible
		});
	});
});
