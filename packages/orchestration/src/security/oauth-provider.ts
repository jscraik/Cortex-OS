/**
 * nO Master Agent Loop - OAuth 2.0/OIDC Authentication Provider
 *
 * Provides OAuth 2.0 and OpenID Connect authentication integration
 * with support for multiple identity providers and token validation.
 *
 * Co-authored-by: brAInwav Development Team
 */

import { isPrivateHostname, safeFetch } from '@cortex-os/utils';
import { type JwtPayload, sign, verify } from 'jsonwebtoken';
import { securityMetrics } from '../monitoring/prometheus-metrics.js';

export interface OAuthConfig {
	issuer: string;
	clientId: string;
	clientSecret: string;
	redirectUri: string;
	scope: string[];
	jwksUri?: string;
	userInfoEndpoint?: string;
	tokenEndpoint?: string;
	authorizationEndpoint?: string;
}

export interface UserClaims {
	sub: string;
	email?: string;
	name?: string;
	groups?: string[];
	roles?: string[];
	permissions?: string[];
	iat: number;
	exp: number;
	iss: string;
	aud: string;
}

export interface AuthenticationResult {
	success: boolean;
	user?: UserClaims;
	token?: string;
	refreshToken?: string;
	error?: string;
	errorCode?: string;
}

/**
 * OAuth 2.0/OIDC Authentication Provider
 */
export class OAuthProvider {
	private config: OAuthConfig;
	private jwtSecret: string;

	constructor(config: OAuthConfig, jwtSecret: string) {
		this.config = config;
		this.jwtSecret = jwtSecret;
	}

	private buildSafeOptions(url: string, init: RequestInit, timeout = 15000) {
		const parsed = new URL(url);
		return {
			allowedHosts: [parsed.hostname.toLowerCase()],
			allowedProtocols: [parsed.protocol],
			allowLocalhost: isPrivateHostname(parsed.hostname),
			timeout,
			fetchOptions: init,
		};
	}

	/**
	 * Generate authorization URL for OAuth flow
	 */
	getAuthorizationUrl(state?: string, nonce?: string): string {
		const params = new URLSearchParams({
			response_type: 'code',
			client_id: this.config.clientId,
			redirect_uri: this.config.redirectUri,
			scope: this.config.scope.join(' '),
			...(state && { state }),
			...(nonce && { nonce }),
		});

		const authEndpoint =
			this.config.authorizationEndpoint || `${this.config.issuer}/oauth2/authorize`;

		return `${authEndpoint}?${params.toString()}`;
	}

	/**
	 * Exchange authorization code for tokens
	 */
	async exchangeCodeForTokens(code: string, _state?: string): Promise<AuthenticationResult> {
		try {
			const tokenEndpoint = this.config.tokenEndpoint || `${this.config.issuer}/oauth2/token`;

			const response = await safeFetch(
				tokenEndpoint,
				this.buildSafeOptions(tokenEndpoint, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						Authorization: `Basic ${Buffer.from(
							`${this.config.clientId}:${this.config.clientSecret}`,
						).toString('base64')}`,
					},
					body: new URLSearchParams({
						grant_type: 'authorization_code',
						code,
						redirect_uri: this.config.redirectUri,
						client_id: this.config.clientId,
					}),
				}),
			);

			if (!response.ok) {
				const error = await response.text();
				securityMetrics.authAttempts.labels('oauth', 'failure').inc();
				return {
					success: false,
					error: `Token exchange failed: ${error}`,
					errorCode: 'TOKEN_EXCHANGE_FAILED',
				};
			}

			const tokens = await response.json();
			const userInfo = await this.getUserInfo(tokens.access_token);

			if (!userInfo.success) {
				return userInfo;
			}

			// Generate internal JWT token
			const internalToken = this.generateInternalToken(userInfo.user!);

			securityMetrics.authAttempts.labels('oauth', 'success').inc();

			return {
				success: true,
				user: userInfo.user,
				token: internalToken,
				refreshToken: tokens.refresh_token,
			};
		} catch (error) {
			securityMetrics.authAttempts.labels('oauth', 'error').inc();
			return {
				success: false,
				error: `Authentication failed: ${error}`,
				errorCode: 'OAUTH_ERROR',
			};
		}
	}

	/**
	 * Validate and decode JWT token
	 */
	async validateToken(token: string): Promise<AuthenticationResult> {
		try {
			const decoded = verify(token, this.jwtSecret) as JwtPayload & UserClaims;

			// Check token expiration
			if (decoded.exp && decoded.exp < Date.now() / 1000) {
				return {
					success: false,
					error: 'Token expired',
					errorCode: 'TOKEN_EXPIRED',
				};
			}

			// Check issuer
			if (decoded.iss !== this.config.issuer) {
				return {
					success: false,
					error: 'Invalid token issuer',
					errorCode: 'INVALID_ISSUER',
				};
			}

			return {
				success: true,
				user: decoded,
				token,
			};
		} catch (error) {
			securityMetrics.authAttempts.labels('jwt', 'failure').inc();
			return {
				success: false,
				error: `Token validation failed: ${error}`,
				errorCode: 'INVALID_TOKEN',
			};
		}
	}

	/**
	 * Refresh expired token
	 */
	async refreshToken(refreshToken: string): Promise<AuthenticationResult> {
		try {
			const tokenEndpoint = this.config.tokenEndpoint || `${this.config.issuer}/oauth2/token`;

			const response = await safeFetch(
				tokenEndpoint,
				this.buildSafeOptions(tokenEndpoint, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						Authorization: `Basic ${Buffer.from(
							`${this.config.clientId}:${this.config.clientSecret}`,
						).toString('base64')}`,
					},
					body: new URLSearchParams({
						grant_type: 'refresh_token',
						refresh_token: refreshToken,
					}),
				}),
			);

			if (!response.ok) {
				const error = await response.text();
				return {
					success: false,
					error: `Token refresh failed: ${error}`,
					errorCode: 'REFRESH_FAILED',
				};
			}

			const tokens = await response.json();
			const userInfo = await this.getUserInfo(tokens.access_token);

			if (!userInfo.success) {
				return userInfo;
			}

			const internalToken = this.generateInternalToken(userInfo.user!);

			return {
				success: true,
				user: userInfo.user,
				token: internalToken,
				refreshToken: tokens.refresh_token,
			};
		} catch (error) {
			return {
				success: false,
				error: `Token refresh failed: ${error}`,
				errorCode: 'REFRESH_ERROR',
			};
		}
	}

	/**
	 * Get user information from access token
	 */
	private async getUserInfo(accessToken: string): Promise<AuthenticationResult> {
		try {
			const userInfoEndpoint = this.config.userInfoEndpoint || `${this.config.issuer}/userinfo`;

			const response = await safeFetch(
				userInfoEndpoint,
				this.buildSafeOptions(userInfoEndpoint, {
					headers: {
						Authorization: `Bearer ${accessToken}`,
					},
				}),
			);

			if (!response.ok) {
				const error = await response.text();
				return {
					success: false,
					error: `User info request failed: ${error}`,
					errorCode: 'USERINFO_FAILED',
				};
			}

			const userInfo = await response.json();

			const user: UserClaims = {
				sub: userInfo.sub,
				email: userInfo.email,
				name: userInfo.name || userInfo.preferred_username,
				groups: userInfo.groups || [],
				roles: userInfo.roles || [],
				permissions: userInfo.permissions || [],
				iat: Math.floor(Date.now() / 1000),
				exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
				iss: this.config.issuer,
				aud: this.config.clientId,
			};

			return {
				success: true,
				user,
			};
		} catch (error) {
			return {
				success: false,
				error: `Failed to get user info: ${error}`,
				errorCode: 'USERINFO_ERROR',
			};
		}
	}

	/**
	 * Generate internal JWT token
	 */
	private generateInternalToken(user: UserClaims): string {
		return sign(
			{
				sub: user.sub,
				email: user.email,
				name: user.name,
				groups: user.groups,
				roles: user.roles,
				permissions: user.permissions,
				iss: this.config.issuer,
				aud: this.config.clientId,
			},
			this.jwtSecret,
			{
				expiresIn: '1h',
				algorithm: 'HS256',
			},
		);
	}

	/**
	 * Logout user and revoke tokens
	 */
	async logout(_token: string, refreshToken?: string): Promise<boolean> {
		try {
			// Revoke refresh token if provided
			if (refreshToken) {
				const revokeEndpoint = `${this.config.issuer}/oauth2/revoke`;

				await safeFetch(
					revokeEndpoint,
					this.buildSafeOptions(revokeEndpoint, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/x-www-form-urlencoded',
							Authorization: `Basic ${Buffer.from(
								`${this.config.clientId}:${this.config.clientSecret}`,
							).toString('base64')}`,
						},
						body: new URLSearchParams({
							token: refreshToken,
							token_type_hint: 'refresh_token',
						}),
					}),
				);
			}

			// In a real implementation, you would add the token to a blacklist
			// For now, we'll just return success
			return true;
		} catch (error) {
			console.error('Logout error:', error);
			return false;
		}
	}
}

/**
 * Default OAuth configuration for common providers
 */
export const OAuthProviders = {
	// Auth0 configuration
	auth0: (domain: string, clientId: string, clientSecret: string): OAuthConfig => ({
		issuer: `https://${domain}`,
		clientId,
		clientSecret,
		redirectUri: `${process.env.BASE_URL || 'http://localhost:3000'}/auth/callback`,
		scope: ['openid', 'profile', 'email'],
		jwksUri: `https://${domain}/.well-known/jwks.json`,
		userInfoEndpoint: `https://${domain}/userinfo`,
		tokenEndpoint: `https://${domain}/oauth/token`,
		authorizationEndpoint: `https://${domain}/authorize`,
	}),

	// Keycloak configuration
	keycloak: (
		realm: string,
		baseUrl: string,
		clientId: string,
		clientSecret: string,
	): OAuthConfig => ({
		issuer: `${baseUrl}/realms/${realm}`,
		clientId,
		clientSecret,
		redirectUri: `${process.env.BASE_URL || 'http://localhost:3000'}/auth/callback`,
		scope: ['openid', 'profile', 'email'],
		jwksUri: `${baseUrl}/realms/${realm}/protocol/openid-connect/certs`,
		userInfoEndpoint: `${baseUrl}/realms/${realm}/protocol/openid-connect/userinfo`,
		tokenEndpoint: `${baseUrl}/realms/${realm}/protocol/openid-connect/token`,
		authorizationEndpoint: `${baseUrl}/realms/${realm}/protocol/openid-connect/auth`,
	}),

	// Okta configuration
	okta: (domain: string, clientId: string, clientSecret: string): OAuthConfig => ({
		issuer: `https://${domain}`,
		clientId,
		clientSecret,
		redirectUri: `${process.env.BASE_URL || 'http://localhost:3000'}/auth/callback`,
		scope: ['openid', 'profile', 'email'],
		jwksUri: `https://${domain}/.well-known/oauth_authorization_server/keys`,
		userInfoEndpoint: `https://${domain}/v1/userinfo`,
		tokenEndpoint: `https://${domain}/v1/token`,
		authorizationEndpoint: `https://${domain}/v1/authorize`,
	}),
};
