import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authUtils } from '../../auth';
import { createApp } from '../../server.ts';
import { OAuthService } from '../../services/oauthService.ts';

// Mock OAuthService
vi.mock('../../services/oauthService');
vi.mock('../../auth');

describe('OAuthController', () => {
	let app: any;

	beforeEach(() => {
		app = createApp();
		vi.clearAllMocks();
	});

	describe('GET /api/oauth/providers', () => {
		it('should return all enabled OAuth providers', async () => {
			const mockProviders = [
				{
					id: 'github',
					name: 'GitHub',
					enabled: true,
					scopes: ['user:email'],
					icon: 'github',
					color: '#24292e',
				},
				{
					id: 'google',
					name: 'Google',
					enabled: true,
					scopes: ['openid', 'email'],
					icon: 'google',
					color: '#4285f4',
				},
			];

			vi.mocked(OAuthService.getProviders).mockReturnValue(mockProviders);

			const response = await request(app).get('/api/oauth/providers').expect(200);

			expect(response.body.providers).toEqual(mockProviders);
			expect(response.body.timestamp).toBeDefined();
		});

		it('should handle internal server errors', async () => {
			vi.mocked(OAuthService.getProviders).mockImplementation(() => {
				throw new Error('Database error');
			});

			const response = await request(app).get('/api/oauth/providers').expect(500);

			expect(response.body.error).toBe('Failed to fetch OAuth providers');
		});
	});

	describe('GET /api/oauth/:providerId/url', () => {
		it('should generate OAuth URL for enabled provider', async () => {
			const mockURL = 'http://localhost:3001/api/auth/signin/github';
			vi.mocked(OAuthService.isProviderEnabled).mockReturnValue(true);
			vi.mocked(OAuthService.getOAuthURL).mockReturnValue(mockURL);
			vi.mocked(OAuthService.getScopes).mockReturnValue(['user:email', 'read:user']);

			const response = await request(app).get('/api/oauth/github/url').expect(200);

			expect(response.body.url).toBe(mockURL);
			expect(response.body.state).toBeDefined();
			expect(response.body.providerId).toBe('github');
			expect(response.body.scopes).toEqual(['user:email', 'read:user']);
		});

		it('should return 404 for disabled provider', async () => {
			vi.mocked(OAuthService.isProviderEnabled).mockReturnValue(false);

			const response = await request(app).get('/api/oauth/disabled-provider/url').expect(404);

			expect(response.body.error).toBe('OAuth provider not found or disabled');
		});

		it('should return 500 when URL generation fails', async () => {
			vi.mocked(OAuthService.isProviderEnabled).mockReturnValue(true);
			vi.mocked(OAuthService.getOAuthURL).mockReturnValue(null);

			const response = await request(app).get('/api/oauth/github/url').expect(500);

			expect(response.body.error).toBe('Failed to generate OAuth URL');
		});
	});

	describe('GET /api/oauth/:providerId/callback', () => {
		it('should handle successful OAuth callback', async () => {
			const mockResult = {
				user: { id: 'user123', email: 'user@example.com' },
				session: { token: 'session-token' },
			};

			vi.mocked(OAuthService.isProviderEnabled).mockReturnValue(true);
			vi.mocked(OAuthService.handleCallback).mockResolvedValue(mockResult);

			const response = await request(app)
				.get('/api/oauth/github/callback')
				.query({ code: 'test-code', state: 'test-state' })
				.expect(302);

			expect(response.headers.location).toContain('/auth/callback');
			expect(response.headers.location).toContain('success=true');
		});

		it('should handle OAuth callback with invalid state', async () => {
			vi.mocked(OAuthService.isProviderEnabled).mockReturnValue(true);

			const response = await request(app)
				.get('/api/oauth/github/callback')
				.query({ code: 'test-code', state: 'invalid-state' })
				.expect(302);

			expect(response.headers.location).toContain('/auth/callback');
			expect(response.headers.location).toContain('success=false');
			expect(response.headers.location).toContain('error=Invalid+OAuth+state');
		});

		it('should handle OAuth callback errors', async () => {
			vi.mocked(OAuthService.isProviderEnabled).mockReturnValue(true);
			vi.mocked(OAuthService.handleCallback).mockRejectedValue(new Error('OAuth failed'));

			const response = await request(app)
				.get('/api/oauth/github/callback')
				.query({ code: 'test-code', state: 'test-state' })
				.expect(302);

			expect(response.headers.location).toContain('/auth/callback');
			expect(response.headers.location).toContain('success=false');
		});
	});

	describe('GET /api/oauth/accounts', () => {
		it('should return user OAuth accounts when authenticated', async () => {
			const mockSession = {
				userId: 'user123',
				user: { id: 'user123', email: 'user@example.com' },
			};

			const mockAccounts = [
				{
					providerId: 'github',
					providerAccountId: 'github-123',
					user: { login: 'testuser' },
				},
			];

			vi.mocked(authUtils.getSession).mockResolvedValue(mockSession as any);
			vi.mocked(OAuthService.getUserAccounts).mockResolvedValue(mockAccounts);

			const response = await request(app)
				.get('/api/oauth/accounts')
				.set('Authorization', 'Bearer test-token')
				.expect(200);

			expect(response.body.accounts).toEqual(mockAccounts);
			expect(response.body.timestamp).toBeDefined();
		});

		it('should return 401 when not authenticated', async () => {
			vi.mocked(authUtils.getSession).mockResolvedValue(null);

			const response = await request(app)
				.get('/api/oauth/accounts')
				.set('Authorization', 'Bearer test-token')
				.expect(401);

			expect(response.body.error).toBe('Authentication required');
		});
	});

	describe('POST /api/oauth/link', () => {
		it('should link OAuth account to user', async () => {
			const mockSession = {
				userId: 'user123',
				user: { id: 'user123', email: 'user@example.com' },
			};

			const mockResult = {
				providerId: 'github',
				providerAccountId: 'github-123',
				linked: true,
			};

			vi.mocked(authUtils.getSession).mockResolvedValue(mockSession as any);
			vi.mocked(OAuthService.isProviderEnabled).mockReturnValue(true);
			vi.mocked(OAuthService.linkAccount).mockResolvedValue(mockResult);

			const response = await request(app)
				.post('/api/oauth/link')
				.set('Authorization', 'Bearer test-token')
				.send({
					providerId: 'github',
					code: 'test-code',
					state: 'test-state',
				})
				.expect(200);

			expect(response.body.success).toBe(true);
			expect(response.body.account).toEqual(mockResult);
		});

		it('should validate required fields', async () => {
			const response = await request(app)
				.post('/api/oauth/link')
				.set('Authorization', 'Bearer test-token')
				.send({
					// Missing required fields
				})
				.expect(400);

			expect(response.body.error).toBe('Validation failed');
		});
	});

	describe('POST /api/oauth/unlink', () => {
		it('should unlink OAuth account from user', async () => {
			const mockSession = {
				userId: 'user123',
				user: { id: 'user123', email: 'user@example.com' },
			};

			vi.mocked(authUtils.getSession).mockResolvedValue(mockSession as any);
			vi.mocked(OAuthService.unlinkAccount).mockResolvedValue(true);

			const response = await request(app)
				.post('/api/oauth/unlink')
				.set('Authorization', 'Bearer test-token')
				.send({
					providerId: 'github',
					providerAccountId: 'github-123',
				})
				.expect(200);

			expect(response.body.success).toBe(true);
			expect(response.body.message).toBe('OAuth account unlinked successfully');
		});

		it('should handle unlink failure', async () => {
			const mockSession = {
				userId: 'user123',
				user: { id: 'user123', email: 'user@example.com' },
			};

			vi.mocked(authUtils.getSession).mockResolvedValue(mockSession as any);
			vi.mocked(OAuthService.unlinkAccount).mockResolvedValue(false);

			const response = await request(app)
				.post('/api/oauth/unlink')
				.set('Authorization', 'Bearer test-token')
				.send({
					providerId: 'github',
					providerAccountId: 'github-123',
				})
				.expect(500);

			expect(response.body.error).toBe('Failed to unlink OAuth account');
		});
	});

	describe('POST /api/oauth/refresh', () => {
		it('should refresh OAuth access token', async () => {
			const mockResult = {
				accessToken: 'new-access-token',
				refreshToken: 'new-refresh-token',
				expiresAt: Date.now() + 3600000,
			};

			vi.mocked(OAuthService.isProviderEnabled).mockReturnValue(true);
			vi.mocked(OAuthService.refreshToken).mockResolvedValue(mockResult);

			const response = await request(app)
				.post('/api/oauth/refresh')
				.send({
					providerId: 'github',
					refreshToken: 'old-refresh-token',
				})
				.expect(200);

			expect(response.body.success).toBe(true);
			expect(response.body.tokens).toEqual(mockResult);
		});

		it('should validate required fields', async () => {
			const response = await request(app)
				.post('/api/oauth/refresh')
				.send({
					providerId: 'github',
					// Missing refreshToken
				})
				.expect(400);

			expect(response.body.error).toBe('Provider ID and refresh token are required');
		});
	});

	describe('POST /api/oauth/revoke', () => {
		it('should revoke OAuth access', async () => {
			vi.mocked(OAuthService.isProviderEnabled).mockReturnValue(true);
			vi.mocked(OAuthService.revokeAccess).mockResolvedValue(true);

			const response = await request(app)
				.post('/api/oauth/revoke')
				.send({
					providerId: 'github',
					accessToken: 'access-token',
				})
				.expect(200);

			expect(response.body.success).toBe(true);
			expect(response.body.message).toBe('OAuth access revoked successfully');
		});

		it('should handle revoke failure', async () => {
			vi.mocked(OAuthService.isProviderEnabled).mockReturnValue(true);
			vi.mocked(OAuthService.revokeAccess).mockResolvedValue(false);

			const response = await request(app)
				.post('/api/oauth/revoke')
				.send({
					providerId: 'github',
					accessToken: 'access-token',
				})
				.expect(500);

			expect(response.body.error).toBe('Failed to revoke OAuth access');
		});
	});

	describe('GET /api/oauth/validate', () => {
		it('should validate OAuth configuration', async () => {
			const mockValidation = {
				valid: true,
				errors: [],
			};

			vi.mocked(OAuthService.validateConfiguration).mockReturnValue(mockValidation);

			const response = await request(app).get('/api/oauth/validate').expect(200);

			expect(response.body.valid).toBe(true);
			expect(response.body.errors).toEqual([]);
			expect(response.body.providers).toBeDefined();
		});

		it('should return validation errors', async () => {
			const mockValidation = {
				valid: false,
				errors: ['GitHub: Missing client secret', 'Google: Missing client ID'],
			};

			vi.mocked(OAuthService.validateConfiguration).mockReturnValue(mockValidation);

			const response = await request(app).get('/api/oauth/validate').expect(200);

			expect(response.body.valid).toBe(false);
			expect(response.body.errors).toEqual([
				'GitHub: Missing client secret',
				'Google: Missing client ID',
			]);
		});
	});
});
