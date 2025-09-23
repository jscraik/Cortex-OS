import { auth } from '../auth';

// OAuth provider configuration interface
export interface OAuthProvider {
	id: string;
	name: string;
	enabled: boolean;
	clientId?: string;
	clientSecret?: string;
	scopes: string[];
	icon: string;
	color: string;
}

// OAuth provider configurations
export const OAUTH_PROVIDERS: OAuthProvider[] = [
	{
		id: 'github',
		name: 'GitHub',
		enabled: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
		clientId: process.env.GITHUB_CLIENT_ID,
		clientSecret: process.env.GITHUB_CLIENT_SECRET,
		scopes: ['user:email', 'read:user'],
		icon: 'github',
		color: '#24292e',
	},
	{
		id: 'google',
		name: 'Google',
		enabled: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
		clientId: process.env.GOOGLE_CLIENT_ID,
		clientSecret: process.env.GOOGLE_CLIENT_SECRET,
		scopes: ['openid', 'email', 'profile'],
		icon: 'google',
		color: '#4285f4',
	},
	{
		id: 'discord',
		name: 'Discord',
		enabled: Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET),
		clientId: process.env.DISCORD_CLIENT_ID,
		clientSecret: process.env.DISCORD_CLIENT_SECRET,
		scopes: ['identify', 'email'],
		icon: 'discord',
		color: '#5865f2',
	},
	{
		id: 'microsoft',
		name: 'Microsoft',
		enabled: Boolean(
			process.env.MICROSOFT_CLIENT_ID &&
				process.env.MICROSOFT_CLIENT_SECRET &&
				process.env.MICROSOFT_TENANT_ID,
		),
		clientId: process.env.MICROSOFT_CLIENT_ID,
		clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
		scopes: ['openid', 'email', 'profile'],
		icon: 'microsoft',
		color: '#0078d4',
	},
];

// OAuth service class
export class OAuthService {
	/**
	 * Get all configured OAuth providers
	 */
	static getProviders(): OAuthProvider[] {
		return OAUTH_PROVIDERS.filter((provider) => provider.enabled);
	}

	/**
	 * Get a specific OAuth provider by ID
	 */
	static getProvider(id: string): OAuthProvider | undefined {
		return OAUTH_PROVIDERS.find((provider) => provider.id === id && provider.enabled);
	}

	/**
	 * Generate OAuth URL for a provider
	 */
	static getOAuthURL(providerId: string): string | null {
		const provider = OAuthService.getProvider(providerId);
		if (!provider) return null;

		const baseURL = process.env.BASE_URL || 'http://localhost:3001';
		return `${baseURL}/api/auth/signin/${providerId}`;
	}

	/**
	 * Generate OAuth callback URL for a provider
	 */
	static getCallbackURL(providerId: string): string | null {
		const provider = OAuthService.getProvider(providerId);
		if (!provider) return null;

		const baseURL = process.env.BASE_URL || 'http://localhost:3001';
		return `${baseURL}/api/auth/callback/${providerId}`;
	}

	/**
	 * Validate OAuth configuration
	 */
	static validateConfiguration(): { valid: boolean; errors: string[] } {
		const errors: string[] = [];

		OAUTH_PROVIDERS.forEach((provider) => {
			if (provider.enabled) {
				if (!provider.clientId) {
					errors.push(`${provider.name}: Missing client ID`);
				}
				if (!provider.clientSecret) {
					errors.push(`${provider.name}: Missing client secret`);
				}
				if (provider.id === 'microsoft' && !process.env.MICROSOFT_TENANT_ID) {
					errors.push(`${provider.name}: Missing tenant ID`);
				}
			}
		});

		return {
			valid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Get OAuth scopes for a provider
	 */
	static getScopes(providerId: string): string[] {
		const provider = OAuthService.getProvider(providerId);
		return provider?.scopes || [];
	}

	/**
	 * Check if a provider is configured and enabled
	 */
	static isProviderEnabled(providerId: string): boolean {
		return OAuthService.getProvider(providerId) !== undefined;
	}

	/**
	 * Handle OAuth callback from provider
	 */
	static async handleCallback(providerId: string, code: string, state?: string): Promise<any> {
		try {
			const result = await auth.api.handleOAuthCallback({
				provider: providerId,
				code,
				state,
			});

			return result;
		} catch (error) {
			console.error(`OAuth callback error for ${providerId}:`, error);
			throw error;
		}
	}

	/**
	 * Refresh OAuth access token
	 */
	static async refreshToken(providerId: string, refreshToken: string): Promise<any> {
		try {
			const result = await auth.api.refreshAccessToken({
				provider: providerId,
				refreshToken,
			});

			return result;
		} catch (error) {
			console.error(`OAuth token refresh error for ${providerId}:`, error);
			throw error;
		}
	}

	/**
	 * Revoke OAuth access
	 */
	static async revokeAccess(providerId: string, accessToken: string): Promise<boolean> {
		try {
			await auth.api.revokeAccessToken({
				provider: providerId,
				accessToken,
			});

			return true;
		} catch (error) {
			console.error(`OAuth revoke error for ${providerId}:`, error);
			return false;
		}
	}

	/**
	 * Get user's connected OAuth accounts
	 */
	static async getUserAccounts(userId: string): Promise<any[]> {
		try {
			const accounts = await auth.api.listUserAccounts({
				userId,
			});

			return accounts;
		} catch (error) {
			console.error('Error fetching user OAuth accounts:', error);
			return [];
		}
	}

	/**
	 * Link OAuth account to user
	 */
	static async linkAccount(
		userId: string,
		providerId: string,
		code: string,
		state?: string,
	): Promise<any> {
		try {
			const result = await auth.api.linkOAuthAccount({
				userId,
				provider: providerId,
				code,
				state,
			});

			return result;
		} catch (error) {
			console.error(`Error linking ${providerId} account:`, error);
			throw error;
		}
	}

	/**
	 * Unlink OAuth account from user
	 */
	static async unlinkAccount(
		userId: string,
		providerId: string,
		providerAccountId: string,
	): Promise<boolean> {
		try {
			await auth.api.unlinkOAuthAccount({
				userId,
				provider: providerId,
				providerAccountId,
			});

			return true;
		} catch (error) {
			console.error(`Error unlinking ${providerId} account:`, error);
			return false;
		}
	}
}

// OAuth utility functions
export const oauthUtils = {
	/**
	 * Validate OAuth state parameter
	 */
	validateState: (state: string, storedState: string): boolean => {
		return state === storedState;
	},

	/**
	 * Generate secure OAuth state parameter
	 */
	generateState: (): string => {
		return crypto.randomUUID();
	},

	/**
	 * Parse OAuth scopes from string
	 */
	parseScopes: (scopesString: string): string[] => {
		return scopesString.split(/[\s,]+/).filter(Boolean);
	},

	/**
	 * Format scopes for OAuth URL
	 */
	formatScopes: (scopes: string[]): string => {
		return scopes.join(' ');
	},

	/**
	 * Check if required scopes are granted
	 */
	hasRequiredScopes: (grantedScopes: string[], requiredScopes: string[]): boolean => {
		return requiredScopes.every((scope) => grantedScopes.includes(scope));
	},
};

// OAuth error types
export const OAuthError = {
	INVALID_PROVIDER: 'invalid_provider',
	MISSING_CONFIG: 'missing_config',
	INVALID_CODE: 'invalid_code',
	INVALID_STATE: 'invalid_state',
	ACCESS_DENIED: 'access_denied',
	RATE_LIMITED: 'rate_limited',
	SERVER_ERROR: 'server_error',
};
