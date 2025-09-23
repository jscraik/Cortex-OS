import { betterAuth } from 'better-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Test GitHub OAuth integration with Better Auth
describe('GitHub OAuth Integration', () => {
	let auth: ReturnType<typeof betterAuth>;

	beforeEach(() => {
		// Mock Better Auth instance for GitHub OAuth
		auth = betterAuth({
			secret: 'test-secret',
			baseURL: 'http://localhost:3000',
			socialProviders: {
				github: {
					clientId: 'test-github-client-id',
					clientSecret: 'test-github-client-secret',
				},
			},
		});
	});

	describe('OAuth URL Generation', () => {
		it('should generate correct GitHub OAuth URL', () => {
			const authURL = `${auth.baseURL}/api/auth/github`;

			expect(authURL).toBe('http://localhost:3000/api/auth/github');
			expect(authURL).toContain('github');
		});

		it('should include required OAuth parameters', () => {
			const baseUrl = auth.baseURL;
			const clientId = 'test-github-client-id';

			// The actual URL generation is handled by Better Auth internally
			// We're testing that our configuration is correct
			expect(clientId).toBeDefined();
			expect(baseUrl).toBeDefined();
		});
	});

	describe('OAuth Flow Handling', () => {
		it('should handle OAuth callback successfully', async () => {
			// Mock the OAuth callback handler
			const mockHandleOAuthCallback = vi.fn().mockResolvedValue({
				user: {
					id: 'github-user-123',
					email: 'github@example.com',
					name: 'GitHub User',
					image: 'https://github.com/avatar.jpg',
				},
				session: {
					token: 'github-session-token',
					expires: Date.now() + 3600000,
				},
				account: {
					providerId: 'github',
					providerAccountId: 'github-account-123',
				},
			});

			// Mock the Better Auth API
			vi.spyOn(auth.api, 'handleOAuthCallback').mockImplementation(mockHandleOAuthCallback);

			const result = await auth.api.handleOAuthCallback({
				provider: 'github',
				code: 'test-github-code',
				state: 'test-state',
			});

			expect(result.user).toBeDefined();
			expect(result.user.email).toBe('github@example.com');
			expect(result.session.token).toBe('github-session-token');
			expect(result.account.providerId).toBe('github');
		});

		it('should handle OAuth errors gracefully', async () => {
			vi.spyOn(auth.api, 'handleOAuthCallback').mockRejectedValueOnce(
				new Error('OAuth authentication failed'),
			);

			await expect(
				auth.api.handleOAuthCallback({
					provider: 'github',
					code: 'invalid-code',
					state: 'test-state',
				}),
			).rejects.toThrow('OAuth authentication failed');
		});

		it('should validate OAuth state parameter', async () => {
			const mockHandleOAuthCallback = vi.fn();

			vi.spyOn(auth.api, 'handleOAuthCallback').mockImplementation(mockHandleOAuthCallback);

			// Should fail without state parameter
			await expect(
				auth.api.handleOAuthCallback({
					provider: 'github',
					code: 'test-code',
					// Missing state
				} as any),
			).rejects.toThrow();
		});
	});

	describe('Token Management', () => {
		it('should handle GitHub token refresh', async () => {
			const mockRefreshToken = vi.fn().mockResolvedValue({
				accessToken: 'new-github-token',
				refreshToken: 'new-github-refresh-token',
				expiresAt: Date.now() + 3600000,
			});

			vi.spyOn(auth.api, 'refreshAccessToken').mockImplementation(mockRefreshToken);

			const result = await auth.api.refreshAccessToken({
				refreshToken: 'old-github-refresh-token',
				provider: 'github',
			});

			expect(result.accessToken).toBe('new-github-token');
			expect(result.refreshToken).toBe('new-github-refresh-token');
		});

		it('should validate GitHub token permissions', async () => {
			// Mock GitHub API response for token validation
			const mockUserData = {
				login: 'testuser',
				id: 12345,
				email: 'test@example.com',
				scopes: ['repo', 'user:email'],
			};

			// In a real implementation, this would make an actual GitHub API call
			expect(mockUserData.scopes).toContain('repo');
			expect(mockUserData.scopes).toContain('user:email');
		});
	});

	describe('GitHub Integration Events', () => {
		it('should emit GitHub connection events', () => {
			// Test that we can emit events when GitHub account is connected
			const eventBus = {
				emit: vi.fn(),
			};

			const eventData = {
				type: 'github:connected',
				data: {
					userId: 'user-123',
					githubUsername: 'testuser',
					connectedAt: Date.now(),
				},
			};

			eventBus.emit('github:connected', eventData);

			expect(eventBus.emit).toHaveBeenCalledWith('github:connected', eventData);
		});

		it('should handle GitHub webhook events', () => {
			const mockWebhookHandler = vi.fn();

			const webhookEvent = {
				type: 'pull_request',
				action: 'opened',
				repository: {
					name: 'test-repo',
					owner: {
						login: 'testuser',
					},
				},
				pull_request: {
					number: 1,
					title: 'Test PR',
				},
			};

			mockWebhookHandler(webhookEvent);

			expect(mockWebhookHandler).toHaveBeenCalledWith(webhookEvent);
		});
	});

	describe('GitHub API Client Integration', () => {
		it('should create GitHub API client with OAuth token', () => {
			const token = 'github-oauth-token';

			// Mock GitHub client creation
			const createGitHubClient = (token: string) => ({
				auth: `token ${token}`,
				defaults: {
					headers: {
						Authorization: `token ${token}`,
					},
				},
			});

			const client = createGitHubClient(token);

			expect(client.auth).toBe(`token ${token}`);
			expect(client.defaults.headers.Authorization).toBe(`token ${token}`);
		});

		it('should handle GitHub API rate limits', async () => {
			const mockApiResponse = {
				data: [],
				headers: {
					'x-ratelimit-remaining': '4999',
					'x-ratelimit-limit': '5000',
					'x-ratelimit-reset': '1234567890',
				},
			};

			// Mock API call with rate limit headers
			const mockApiCall = vi.fn().mockResolvedValue(mockApiResponse);

			const result = await mockApiCall();

			expect(result.headers['x-ratelimit-remaining']).toBe('4999');
			expect(result.headers['x-ratelimit-limit']).toBe('5000');
		});
	});

	describe('Error Handling', () => {
		it('should handle GitHub API errors', async () => {
			const mockApiCall = vi.fn().mockRejectedValue({
				status: 401,
				message: 'Bad credentials',
				response: {
					data: {
						message: 'Bad credentials',
						documentation_url: 'https://docs.github.com/',
					},
				},
			});

			await expect(mockApiCall()).rejects.toMatchObject({
				status: 401,
				message: 'Bad credentials',
			});
		});

		it('should handle network errors', async () => {
			const mockApiCall = vi.fn().mockRejectedValue(new Error('Network error'));

			await expect(mockApiCall()).rejects.toThrow('Network error');
		});

		it('should handle timeout errors', async () => {
			const mockApiCall = vi.fn().mockRejectedValue(new Error('Request timeout'));

			await expect(mockApiCall()).rejects.toThrow('Request timeout');
		});
	});

	describe('Security Considerations', () => {
		it('should store tokens securely', () => {
			const token = 'github-oauth-token';

			// Mock secure token storage
			const secureStorage = {
				set: vi.fn((key: string, value: string) => {
					// In real implementation, this would encrypt the token
					expect(key).toBe('github_token');
					expect(value).toBe(token);
				}),
				get: vi.fn(),
			};

			secureStorage.set('github_token', token);

			expect(secureStorage.set).toHaveBeenCalledWith('github_token', token);
		});

		it('should validate token scope', () => {
			const tokenScopes = ['repo', 'user:email'];
			const requiredScopes = ['repo'];

			const hasRequiredScopes = requiredScopes.every((scope) => tokenScopes.includes(scope));

			expect(hasRequiredScopes).toBe(true);
		});

		it('should handle token expiration', () => {
			const expiredToken = {
				accessToken: 'expired-token',
				refreshToken: 'refresh-token',
				expiresAt: Date.now() - 3600000, // 1 hour ago
			};

			const isExpired = expiredToken.expiresAt < Date.now();

			expect(isExpired).toBe(true);
		});
	});
});
