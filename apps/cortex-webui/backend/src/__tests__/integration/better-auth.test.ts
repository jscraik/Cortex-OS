import type { Server } from 'node:http';
import { createServer } from 'node:http';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auth } from '../../auth';
import { createApp } from '../../src/server';
import { authMonitoringService } from '../../src/services/authMonitoringService';

// Plugin interface for better-auth plugins
interface BetterAuthPlugin {
	id: string;
	[key: string]: unknown;
}

describe('Better Auth Integration Tests', () => {
	let app: Express;
	let server: Server;

	beforeAll(async () => {
		// Create Express app
		app = createApp();
		server = createServer(app);
	});

	afterAll(async () => {
		if (server) {
			server.close();
		}
	});

	describe('Auth Endpoints', () => {
		it('should have auth endpoints available', async () => {
			// Check if the auth handler is properly mounted
			expect(auth).toBeDefined();
			expect(auth.handler).toBeDefined();
		});

		it('should handle session management', async () => {
			// Test session validation
			const session = await auth.api.getSession({
				headers: {},
			});

			expect(session).toBeDefined();
		});

		it('should log auth events', async () => {
			// Test that we can log auth events
			await authMonitoringService.logEvent({
				eventType: 'test_event',
				metadata: { test: true },
			});

			const events = await authMonitoringService.getRecentEvents(1);
			expect(events.length).toBeGreaterThan(0);
		});

		it('should track auth metrics', async () => {
			const metrics = await authMonitoringService.getMetrics('1h');
			expect(metrics).toBeDefined();
			expect(typeof metrics.totalLogins).toBe('number');
			expect(typeof metrics.failedLogins).toBe('number');
		});
	});

	describe('Security Features', () => {
		it('should have 2FA configured', () => {
			const authConfig = auth.$;
			expect(authConfig.plugins).toBeDefined();

			const twoFactorPlugin = authConfig.plugins.find(
				(plugin: BetterAuthPlugin) => plugin.id === 'twoFactor',
			);
			expect(twoFactorPlugin).toBeDefined();
		});

		it('should have social providers configured', () => {
			const authConfig = auth.$;
			expect(authConfig.socialProviders).toBeDefined();
			expect(authConfig.socialProviders.github).toBeDefined();
			expect(authConfig.socialProviders.google).toBeDefined();
		});

		it('should have email verification configured', () => {
			const authConfig = auth.$;
			expect(authConfig.emailVerification).toBeDefined();
			expect(authConfig.emailVerification.sendVerificationEmail).toBeDefined();
		});
	});

	describe('OAuth Configuration', () => {
		it('should have OAuth providers configured', () => {
			const authConfig = auth.$;
			expect(authConfig.socialProviders.github.clientId).toBeDefined();
			expect(authConfig.socialProviders.google.clientId).toBeDefined();
			expect(authConfig.socialProviders.discord.clientId).toBeDefined();
		});
	});

	describe('Session Configuration', () => {
		it('should have secure session configuration', () => {
			const authConfig = auth.$;
			expect(authConfig.session).toBeDefined();
			expect(authConfig.session.cookieAttributes).toBeDefined();
			expect(authConfig.session.cookieAttributes.secure).toBeDefined();
		});
	});

	describe('Database Integration', () => {
		it('should have database configured', () => {
			const authConfig = auth.$;
			expect(authConfig.database).toBeDefined();
		});

		it('should have database hooks configured', () => {
			const authConfig = auth.$;
			expect(authConfig.databaseHooks).toBeDefined();
			expect(authConfig.databaseHooks.user).toBeDefined();
		});
	});

	describe('Rate Limiting', () => {
		it('should have rate limiting configured', () => {
			const authConfig = auth.$;
			expect(authConfig.rateLimit).toBeDefined();
			expect(authConfig.rateLimit.enabled).toBe(true);
		});
	});

	describe('Email Service Integration', () => {
		it('should have email service integrated', async () => {
			// This test verifies the email service is properly configured
			const authConfig = auth.$;
			expect(authConfig.emailVerification).toBeDefined();
			expect(authConfig.passwordReset).toBeDefined();
			expect(typeof authConfig.emailVerification.sendVerificationEmail).toBe('function');
		});
	});

	describe('Auth Event Monitoring', () => {
		it('should detect security alerts', async () => {
			// Log some failed login attempts to test alert detection
			for (let i = 0; i < 15; i++) {
				await authMonitoringService.logEvent({
					eventType: 'failed_login',
					ipAddress: '192.168.1.100',
					metadata: { email: `test${i}@example.com` },
				});
			}

			const alerts = await authMonitoringService.getSecurityAlerts();
			expect(alerts.length).toBeGreaterThan(0);
		});
	});

	describe('CORS Configuration', () => {
		it('should handle CORS preflight', async () => {
			const response = await request(app)
				.options('/api/auth/login')
				.set('Origin', 'http://localhost:3000')
				.expect(200);

			expect(response.headers['access-control-allow-methods']).toBeDefined();
		});
	});

	describe('Password Requirements', () => {
		it('should enforce password length requirements', () => {
			const authConfig = auth.$;
			expect(authConfig.emailAndPassword.minPasswordLength).toBe(8);
			expect(authConfig.emailAndPassword.maxPasswordLength).toBe(64);
		});
	});

	describe('Two-Factor Authentication Features', () => {
		it('should have backup codes configured', () => {
			const authConfig = auth.$;
			const twoFactorPlugin = authConfig.plugins.find(
				(plugin: BetterAuthPlugin) => plugin.id === 'twoFactor',
			);

			expect(twoFactorPlugin.backupCodes).toBeDefined();
			expect(twoFactorPlugin.backupCodes.enabled).toBe(true);
		});

		it('should have enforcement options', () => {
			const authConfig = auth.$;
			const twoFactorPlugin = authConfig.plugins.find(
				(plugin: BetterAuthPlugin) => plugin.id === 'twoFactor',
			);

			expect(twoFactorPlugin.enforce).toBeDefined();
		});
	});

	describe('Organization Support', () => {
		it('should have organization plugin configured', () => {
			const authConfig = auth.$;
			const orgPlugin = authConfig.plugins.find(
				(plugin: BetterAuthPlugin) => plugin.id === 'organization',
			);

			expect(orgPlugin).toBeDefined();
			expect(orgPlugin.ac).toBeDefined();
			expect(orgPlugin.ac.model).toBe('rbac');
		});
	});

	describe('Bearer Token Support', () => {
		it('should have bearer token plugin configured', () => {
			const authConfig = auth.$;
			const bearerPlugin = authConfig.plugins.find(
				(plugin: BetterAuthPlugin) => plugin.id === 'bearer',
			);

			expect(bearerPlugin).toBeDefined();
			expect(bearerPlugin.storage).toBe('database');
		});
	});

	describe('Passkey/WebAuthn Support', () => {
		it('should have passkey plugin configured', () => {
			const authConfig = auth.$;
			const passkeyPlugin = authConfig.plugins.find(
				(plugin: BetterAuthPlugin) => plugin.id === 'passkey',
			);

			expect(passkeyPlugin).toBeDefined();
			expect(passkeyPlugin.rpName).toBe('Cortex-OS');
		});
	});

	describe('Magic Link Support', () => {
		it('should have magic link plugin configured', () => {
			const authConfig = auth.$;
			const magicLinkPlugin = authConfig.plugins.find(
				(plugin: BetterAuthPlugin) => plugin.id === 'magicLink',
			);

			expect(magicLinkPlugin).toBeDefined();
			expect(magicLinkPlugin.expiresIn).toBe(3600);
		});
	});

	describe('OAuth2 Plugin', () => {
		it('should have OAuth2 plugin configured', () => {
			const authConfig = auth.$;
			const oauth2Plugin = authConfig.plugins.find(
				(plugin: BetterAuthPlugin) => plugin.id === 'oauth2',
			);

			expect(oauth2Plugin).toBeDefined();
		});
	});

	describe('Secret Management', () => {
		it('should have auth secret configured', () => {
			const authConfig = auth.$;
			expect(authConfig.secret).toBeDefined();
			expect(authConfig.secret.length).toBeGreaterThan(10);
		});
	});

	describe('Base URL Configuration', () => {
		it('should have base URL configured', () => {
			const authConfig = auth.$;
			expect(authConfig.baseURL).toBeDefined();
		});
	});

	describe('Cookie Configuration', () => {
		it('should have secure cookie settings in production', () => {
			const authConfig = auth.$;
			const originalNodeEnv = process.env.NODE_ENV;

			// Test production mode
			process.env.NODE_ENV = 'production';
			expect(authConfig.session.cookieAttributes.secure).toBe(true);

			// Test development mode
			process.env.NODE_ENV = 'development';
			expect(authConfig.session.cookieAttributes.secure).toBe(false);

			// Restore original value
			process.env.NODE_ENV = originalNodeEnv;
		});
	});

	describe('Cross-Subdomain Cookies', () => {
		it('should have cross-subdomain cookie configuration', () => {
			const authConfig = auth.$;
			expect(authConfig.advanced.crossSubDomainCookies).toBeDefined();
		});
	});

	describe('CSRF Protection', () => {
		it('should have CSRF protection enabled', () => {
			const authConfig = auth.$;
			expect(authConfig.advanced.disableCSRF).toBe(false);
		});
	});
});
