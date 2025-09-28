/**
 * nO Master Agent Loop - Security Integration
 *
 * Comprehensive security integration module that combines all security
 * components into a production-ready security suite for brAInwav.
 *
 * Co-authored-by: brAInwav Development Team
 */

import type { Express, NextFunction, Request, Response } from 'express';
import {
	type AuthenticatedRequest,
	AuthMiddleware,
	createAuthMiddleware,
} from './auth-middleware.js';
import { createEncryptionService, type EncryptionConfig, EncryptionService } from './encryption.js';
import { type OAuthConfig, OAuthProvider, OAuthProviders } from './oauth-provider.js';
import { rbacSystem } from './rbac-system.js';
import {
	createSecurityMiddleware,
	type SecurityConfig,
	SecurityMiddleware,
} from './security-middleware.js';

export interface SecurityIntegrationConfig {
	// Security middleware configuration
	security: Partial<SecurityConfig>;

	// Authentication configuration
	auth: {
		oauth: OAuthConfig;
		jwtSecret: string;
		skipPaths?: string[];
		enforceHttps?: boolean;
		rateLimiting?: {
			enabled: boolean;
			maxRequests: number;
			windowMs: number;
		};
	};

	// Encryption configuration
	encryption: {
		masterKey: string;
		config?: Partial<EncryptionConfig>;
	};

	// Environment-specific settings
	environment: 'development' | 'production' | 'test';

	// brAInwav specific configuration
	brainwav: {
		companyName: string;
		apiVersion: string;
		contactInfo?: string;
	};
}

/**
 * Comprehensive Security Suite
 */
export class SecuritySuite {
	private securityMiddleware: SecurityMiddleware;
	private authMiddleware: AuthMiddleware;
	private oauthProvider: OAuthProvider;
	private encryptionService: EncryptionService;
	private config: SecurityIntegrationConfig;

	constructor(config: SecurityIntegrationConfig) {
		this.config = config;

		// Initialize OAuth provider
		this.oauthProvider = new OAuthProvider(config.auth.oauth, config.auth.jwtSecret);

		// Initialize security middleware
		this.securityMiddleware = createSecurityMiddleware(config.security);

		// Initialize authentication middleware
		this.authMiddleware = createAuthMiddleware({
			oauthProvider: this.oauthProvider,
			skipPaths: config.auth.skipPaths,
			enforceHttps: config.auth.enforceHttps,
			rateLimiting: config.auth.rateLimiting,
		});

		// Initialize encryption service
		this.encryptionService = createEncryptionService(
			config.encryption.masterKey,
			config.encryption.config,
		);
	}

	/**
	 * Apply all security middleware to Express app
	 */
	applyToApp(app: Express): void {
		// Apply security headers first
		app.use(this.securityMiddleware.getSecurityHeaders());

		// Apply CORS middleware
		app.use(this.securityMiddleware.getCORS());

		// Apply rate limiting
		app.use(this.securityMiddleware.getRateLimit());

		// Apply audit logging
		app.use(this.securityMiddleware.auditRequest());

		// Apply brAInwav branding headers
		app.use(this.getBrAInwavHeaders());

		// Setup authentication routes
		this.setupAuthRoutes(app);
	}

	/**
	 * Get authentication middleware
	 */
	getAuthMiddleware() {
		return this.authMiddleware.authenticate();
	}

	/**
	 * Get authorization middleware
	 */
	getAuthzMiddleware(resource: string, action: string) {
		return this.authMiddleware.authorize(resource, action);
	}

	/**
	 * Get input validation middleware
	 */
	getValidationMiddleware(schema: any) {
		return this.securityMiddleware.validateInput(schema);
	}

	/**
	 * Get encryption service
	 */
	getEncryptionService(): EncryptionService {
		return this.encryptionService;
	}

	/**
	 * Get OAuth provider
	 */
	getOAuthProvider(): OAuthProvider {
		return this.oauthProvider;
	}

	/**
	 * Setup authentication routes
	 */
	private setupAuthRoutes(app: Express): void {
		// Login endpoint
		app.get('/auth/login', this.authMiddleware.handleLogin());

		// OAuth callback
		app.post('/auth/callback', this.authMiddleware.handleOAuthCallback());

		// Logout endpoint
		app.post(
			'/auth/logout',
			this.authMiddleware.authenticate(),
			this.authMiddleware.handleLogout(),
		);

		// User info endpoint
		app.get(
			'/auth/userinfo',
			this.authMiddleware.authenticate(),
			this.authMiddleware.handleUserInfo(),
		);

		// Security status endpoint
		app.get('/auth/status', this.authMiddleware.authenticate(), this.getSecurityStatus());
	}

	/**
	 * Get brAInwav branding headers middleware
	 */
	private getBrAInwavHeaders() {
		return (_req: Request, res: Response, next: NextFunction) => {
			res.setHeader('X-Powered-By', `${this.config.brainwav.companyName} nO Master Agent Loop`);
			res.setHeader('X-API-Version', this.config.brainwav.apiVersion);
			res.setHeader('X-Security-Level', 'Enterprise');

			if (this.config.brainwav.contactInfo) {
				res.setHeader('X-Contact', this.config.brainwav.contactInfo);
			}

			next();
		};
	}

	/**
	 * Security status endpoint handler
	 */
	private getSecurityStatus() {
		return (req: AuthenticatedRequest, res: Response) => {
			const encryptionStats = this.encryptionService.getStats();
			const auditLog = this.securityMiddleware.getAuditLog();

			res.json({
				security: {
					status: 'active',
					environment: this.config.environment,
					encryption: {
						algorithm: encryptionStats.algorithm,
						keyVersion: encryptionStats.currentKeyVersion,
						rotationEnabled: encryptionStats.keyRotationEnabled,
					},
					authentication: {
						provider: 'OAuth 2.0 / OIDC',
						issuer: this.config.auth.oauth.issuer,
					},
					audit: {
						eventsLogged: auditLog.length,
						lastEvent: auditLog[auditLog.length - 1]?.timestamp,
					},
					brainwav: this.config.brainwav,
				},
				permissions: req.user ? rbacSystem.getUserEffectivePermissions(req.user.sub) : [],
			});
		};
	}

	/**
	 * Get security metrics for monitoring
	 */
	getSecurityMetrics() {
		const auditLog = this.securityMiddleware.getAuditLog();
		const encryptionStats = this.encryptionService.getStats();

		return {
			audit: {
				totalEvents: auditLog.length,
				recentEvents: auditLog.filter((event) => event.timestamp > Date.now() - 24 * 60 * 60 * 1000)
					.length,
			},
			encryption: encryptionStats,
			oauth: {
				issuer: this.config.auth.oauth.issuer,
				clientId: this.config.auth.oauth.clientId,
			},
		};
	}

	/**
	 * Clear security audit logs (admin only)
	 */
	clearAuditLogs(): void {
		this.securityMiddleware.clearAuditLog();
	}

	/**
	 * Encrypt sensitive data
	 */
	async encryptSensitiveData(data: any, fields: string[]): Promise<any> {
		return await this.encryptionService.encryptFields(data, fields);
	}

	/**
	 * Decrypt sensitive data
	 */
	async decryptSensitiveData(data: any, fields: string[]): Promise<any> {
		return await this.encryptionService.decryptFields(data, fields);
	}
}

/**
 * Create production-ready security configuration for brAInwav
 */
export function createProductionSecurityConfig(
	overrides: Partial<SecurityIntegrationConfig> = {},
): SecurityIntegrationConfig {
	const baseConfig: SecurityIntegrationConfig = {
		security: {
			cors: {
				enabled: true,
				origins: [
					'https://*.brainwav.ai',
					'https://brainwav.ai',
					...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : []),
				],
				credentials: true,
				maxAge: 86400,
			},
			headers: {
				csp: {
					enabled: true,
					policy:
						"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.brainwav.ai;",
				},
				hsts: {
					enabled: true,
					maxAge: 31536000,
					includeSubDomains: true,
				},
				referrerPolicy: 'strict-origin-when-cross-origin',
			},
			rateLimiting: {
				windowMs: 15 * 60 * 1000, // 15 minutes
				maxRequests: 100,
				skipSuccessfulRequests: false,
				skipFailedRequests: false,
				standardHeaders: true,
				legacyHeaders: false,
			},
			inputValidation: {
				maxBodySize: '10mb',
				sanitizeHtml: true,
				validateJson: true,
				maxDepth: 10,
			},
			audit: {
				enabled: true,
				sensitiveFields: ['password', 'token', 'apiKey', 'secret', 'authorization'],
				maxLogSize: 1000,
			},
		},
		auth: {
			oauth: {
				issuer: process.env.OAUTH_ISSUER || 'https://auth.brainwav.ai',
				clientId: process.env.OAUTH_CLIENT_ID || '',
				clientSecret: process.env.OAUTH_CLIENT_SECRET || '',
				redirectUri: process.env.OAUTH_REDIRECT_URI || 'https://api.brainwav.ai/auth/callback',
				scope: ['openid', 'profile', 'email'],
			},
			jwtSecret: process.env.JWT_SECRET || 'brainwav-jwt-secret-change-in-production',
			skipPaths: ['/health', '/health/live', '/health/ready', '/metrics'],
			enforceHttps: process.env.NODE_ENV === 'production',
			rateLimiting: {
				enabled: true,
				maxRequests: 10,
				windowMs: 60000,
			},
		},
		encryption: {
			masterKey: process.env.ENCRYPTION_KEY || 'brainwav-encryption-key-change-in-production',
		},
		environment: (process.env.NODE_ENV as any) || 'development',
		brainwav: {
			companyName: 'brAInwav',
			apiVersion: '1.0.0',
			contactInfo: 'security@brainwav.ai',
		},
	};

	return { ...baseConfig, ...overrides };
}

/**
 * Create development security configuration
 */
export function createDevelopmentSecurityConfig(
	overrides: Partial<SecurityIntegrationConfig> = {},
): SecurityIntegrationConfig {
	const devConfig = createProductionSecurityConfig({
		security: {
			cors: {
				enabled: true,
				origins: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
				credentials: true,
			},
			rateLimiting: {
				windowMs: 60 * 1000, // 1 minute
				maxRequests: 1000, // More lenient for development
				skipSuccessfulRequests: false,
				skipFailedRequests: false,
				standardHeaders: true,
				legacyHeaders: false,
			},
		},
		auth: {
			oauth: {
				issuer: 'http://localhost:8080',
				clientId: 'dev-client-id',
				clientSecret: 'dev-client-secret',
				redirectUri: 'http://localhost:3000/auth/callback',
				scope: ['openid', 'profile', 'email'],
			},
			jwtSecret: 'dev-jwt-secret-not-for-production',
			enforceHttps: false,
			rateLimiting: {
				enabled: false, // Disabled for development ease
				maxRequests: 1000,
				windowMs: 60000,
			},
		},
		encryption: {
			masterKey: 'dev-encryption-key-not-for-production',
		},
		environment: 'development',
	});

	return { ...devConfig, ...overrides };
}

/**
 * Factory function to create security suite with environment detection
 */
export function createSecuritySuite(
	configOverrides: Partial<SecurityIntegrationConfig> = {},
): SecuritySuite {
	const isProduction = process.env.NODE_ENV === 'production';
	const config = isProduction
		? createProductionSecurityConfig(configOverrides)
		: createDevelopmentSecurityConfig(configOverrides);

	return new SecuritySuite(config);
}

/**
 * Common OAuth provider configurations for popular services
 */
export const CommonOAuthProviders = {
	auth0: (domain: string) =>
		OAuthProviders.auth0(
			domain,
			process.env.AUTH0_CLIENT_ID || '',
			process.env.AUTH0_CLIENT_SECRET || '',
		),

	keycloak: (realm: string, baseUrl: string) =>
		OAuthProviders.keycloak(
			realm,
			baseUrl,
			process.env.KEYCLOAK_CLIENT_ID || '',
			process.env.KEYCLOAK_CLIENT_SECRET || '',
		),

	okta: (domain: string) =>
		OAuthProviders.okta(
			domain,
			process.env.OKTA_CLIENT_ID || '',
			process.env.OKTA_CLIENT_SECRET || '',
		),
};

// Export all security components for individual use if needed
export {
	AuthMiddleware,
	createAuthMiddleware,
	createEncryptionService,
	createSecurityMiddleware,
	EncryptionService,
	OAuthProvider,
	rbacSystem as RBACSystem,
	SecurityMiddleware,
};

export { SecurityCoordinator } from './security-coordinator.js';
