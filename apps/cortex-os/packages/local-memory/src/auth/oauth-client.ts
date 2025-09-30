import { createHash, randomBytes } from 'node:crypto';
import type { PKCETokens, TokenResponse } from './types.js';

/**
 * brAInwav Local Memory - OAuth 2.1 + PKCE Client
 * Handles secure authentication flow with local authorization agent
 */
export class LocalMemoryOAuthClient {
	private readonly clientId: string;
	private readonly redirectUri: string;
	private readonly tokenCache: Map<string, { token: TokenResponse; expires: number }> = new Map();

	constructor(clientId: string, redirectUri: string) {
		this.clientId = clientId;
		this.redirectUri = redirectUri;
		console.log(`brAInwav OAuth client initialized for ${clientId}`);
	}

	/**
	 * Generate PKCE challenge tokens for OAuth flow
	 */
	async generatePKCETokens(): Promise<PKCETokens> {
		const codeVerifier = this.generateCodeVerifier();
		const codeChallenge = this.generateCodeChallenge(codeVerifier);

		console.log('brAInwav OAuth PKCE tokens generated successfully');
		return {
			codeVerifier,
			codeChallenge,
			codeChallengeMethod: 'S256',
		};
	}

	/**
	 * Generate cryptographically secure code verifier
	 */
	private generateCodeVerifier(): string {
		return randomBytes(32)
			.toString('base64url')
			.replace(/[+/]/g, (match: string) => (match === '+' ? '-' : '_'))
			.replace(/=/g, '');
	}

	/**
	 * Generate SHA256 code challenge from verifier
	 */
	private generateCodeChallenge(verifier: string): string {
		return createHash('sha256')
			.update(verifier)
			.digest('base64url')
			.replace(/[+/]/g, (match: string) => (match === '+' ? '-' : '_'))
			.replace(/=/g, '');
	}

	/**
	 * Exchange authorization code for access token
	 */
	async exchangeCodeForToken(code: string, codeVerifier: string): Promise<TokenResponse> {
		const tokenEndpoint = this.getTokenEndpoint();

		const payload = {
			grant_type: 'authorization_code',
			client_id: this.clientId,
			code,
			code_verifier: codeVerifier,
			redirect_uri: this.redirectUri,
		};

		try {
			const response = await fetch(tokenEndpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'User-Agent': 'brAInwav-LocalMemory/1.0',
				},
				body: new URLSearchParams(payload),
			});

			if (!response.ok) {
				throw new Error(`brAInwav OAuth token exchange failed: ${response.status}`);
			}

			const tokenResponse: TokenResponse = await response.json();

			// Cache the token with expiration
			if (tokenResponse.expires_in) {
				const expires = Date.now() + tokenResponse.expires_in * 1000;
				this.tokenCache.set(code, { token: tokenResponse, expires });
			}

			console.log('brAInwav OAuth token exchange successful');
			return tokenResponse;
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			throw new Error(`brAInwav OAuth token exchange failed: ${message}`);
		}
	}

	/**
	 * Validate and cache access token
	 */
	async validateToken(token: string): Promise<boolean> {
		try {
			// Basic JWT structure validation
			const parts = token.split('.');
			if (parts.length !== 3) {
				console.warn('brAInwav OAuth token validation failed: invalid JWT structure');
				return false;
			}

			// Decode JWT payload to check expiration
			const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
			const now = Math.floor(Date.now() / 1000);

			if (payload.exp && payload.exp < now) {
				console.warn('brAInwav OAuth token validation failed: token expired');
				return false;
			}

			console.log('brAInwav OAuth token validation successful');
			return true;
		} catch (error) {
			console.error('brAInwav OAuth token validation error:', error);
			return false;
		}
	}

	/**
	 * Get token endpoint (default to localhost for local auth service)
	 */
	private getTokenEndpoint(): string {
		return process.env.BRAINWAV_AUTH_TOKEN_ENDPOINT || 'http://127.0.0.1:3000/oauth/token';
	}

	/**
	 * Clear token cache
	 */
	clearCache(): void {
		this.tokenCache.clear();
		console.log('brAInwav OAuth token cache cleared');
	}
}
