export interface TokenInfo {
	accessToken: string;
	refreshToken?: string;
	expiresAt: number;
	tokenType: 'bearer' | 'api-key';
}

export interface AuthConfig {
	clientId?: string;
	clientSecret?: string;
	tokenUrl?: string;
	scopes?: string[];
	refreshBuffer?: number; // milliseconds before expiry to refresh
}

export class AuthManager {
	private token?: TokenInfo;
	private refreshPromise?: Promise<TokenInfo>;
	private refreshBuffer = 60000; // 1 minute
	private isRefreshing = false;

	constructor(private config?: AuthConfig) {
		// Validate config if provided
		if (config) {
			if (config.refreshBuffer && (config.refreshBuffer < 5000 || config.refreshBuffer > 300000)) {
				throw new Error('refreshBuffer must be between 5000 and 300000 milliseconds');
			}
			if (config.clientId && !config.clientSecret) {
				throw new Error('clientSecret is required when clientId is provided');
			}
			this.refreshBuffer = config.refreshBuffer || 60000;
		}
	}

	/**
	 * Set the current token
	 */
	setToken(token: TokenInfo): void {
		this.token = token;
	}

	/**
	 * Get the current access token, refreshing if necessary
	 */
	async getAccessToken(): Promise<string> {
		if (!this.token) {
			throw new Error('No token available');
		}

		// Check if token needs refresh
		if (this.shouldRefreshToken()) {
			return await this.refreshToken();
		}

		// Verify token hasn't expired
		if (Date.now() >= this.token.expiresAt) {
			throw new Error('Token has expired and cannot be refreshed');
		}

		return this.token.accessToken;
	}

	/**
	 * Check if token needs refreshing
	 */
	shouldRefreshToken(): boolean {
		if (!this.token || !this.token.refreshToken) {
			return false;
		}

		const now = Date.now();
		return now >= this.token.expiresAt - this.refreshBuffer;
	}

	/**
	 * Refresh the access token
	 */
	async refreshToken(): Promise<string> {
		// Use atomic flag to prevent race conditions
		if (this.isRefreshing) {
			// Wait for existing refresh to complete
			while (this.isRefreshing && this.refreshPromise) {
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			if (this.token && Date.now() < this.token.expiresAt) {
				return this.token.accessToken;
			}
		}

		if (!this.token?.refreshToken) {
			throw new Error('No refresh token available');
		}

		if (!this.config?.tokenUrl) {
			throw new Error('Token refresh URL not configured');
		}

		// Validate token URL to prevent SSRF
		try {
			new URL(this.config.tokenUrl);
		} catch {
			throw new Error('Invalid token URL');
		}

		this.isRefreshing = true;
		this.refreshPromise = this.performRefresh();

		try {
			const newToken = await this.refreshPromise;
			this.setToken(newToken);
			return newToken.accessToken;
		} catch (error) {
			// On refresh failure, clear the token to prevent stale state
			this.clearToken();
			throw error;
		} finally {
			this.refreshPromise = undefined;
			this.isRefreshing = false;
		}
	}

	/**
	 * Perform the actual token refresh
	 */
	private async performRefresh(): Promise<TokenInfo> {
		const response = await fetch(this.config!.tokenUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				grant_type: 'refresh_token',
				refresh_token: this.token?.refreshToken,
				client_id: this.config?.clientId,
				client_secret: this.config?.clientSecret,
				scope: this.config?.scopes?.join(' '),
			}),
			// Add timeout to prevent hanging
			signal: AbortSignal.timeout(30000),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Token refresh failed: ${response.status} ${error}`);
		}

		const data = await response.json();

		return {
			accessToken: data.access_token,
			refreshToken: data.refresh_token || this.token?.refreshToken,
			expiresAt: Date.now() + data.expires_in * 1000,
			tokenType: data.token_type === 'bearer' ? 'bearer' : 'api-key',
		};
	}

	/**
	 * Clear the current token
	 */
	clearToken(): void {
		this.token = undefined;
	}
}
