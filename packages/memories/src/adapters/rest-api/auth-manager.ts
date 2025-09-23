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

	constructor(private config?: AuthConfig) {
		if (config?.refreshBuffer) {
			this.refreshBuffer = config.refreshBuffer;
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
		// If already refreshing, return the existing promise
		if (this.refreshPromise) {
			return await this.refreshPromise.then((t) => t.accessToken);
		}

		if (!this.token?.refreshToken) {
			throw new Error('No refresh token available');
		}

		if (!this.config?.tokenUrl) {
			throw new Error('Token refresh URL not configured');
		}

		this.refreshPromise = this.performRefresh();

		try {
			const newToken = await this.refreshPromise;
			this.setToken(newToken);
			return newToken.accessToken;
		} finally {
			this.refreshPromise = undefined;
		}
	}

	/**
	 * Perform the actual token refresh
	 */
	private async performRefresh(): Promise<TokenInfo> {
		const response = await fetch(this.config.tokenUrl!, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				grant_type: 'refresh_token',
				refresh_token: this.token?.refreshToken,
				client_id: this.config.clientId,
				client_secret: this.config.clientSecret,
				scope: this.config.scopes?.join(' '),
			}),
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
