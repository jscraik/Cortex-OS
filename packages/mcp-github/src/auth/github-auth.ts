import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import type { AuthConfig } from "../config/schema.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("github-auth");

// GitHub authentication types
export interface GitHubAuthContext {
	octokit: Octokit;
	authType: "token" | "app" | "oauth";
	user?: {
		id: number;
		login: string;
		name: string | null;
		email: string | null;
	};
	rateLimit?: {
		limit: number;
		remaining: number;
		reset: Date;
		used: number;
	};
}

// Authentication errors
export class GitHubAuthError extends Error {
	constructor(
		message: string,
		public code: string,
		public statusCode?: number,
	) {
		super(message);
		this.name = "GitHubAuthError";
	}
}

// GitHub authentication manager
export class GitHubAuth {
	private config: AuthConfig;
	private authContext: GitHubAuthContext | null = null;
	private tokenExpiresAt: Date | null = null;
	private refreshTimer: NodeJS.Timeout | null = null;

	constructor(config: AuthConfig) {
		this.config = config;
	}

	async initialize(): Promise<void> {
		logger.info("Initializing GitHub authentication", {
			method: this.config.method,
		});

		try {
			switch (this.config.method) {
				case "token":
					await this.initializeTokenAuth();
					break;
				case "app":
					await this.initializeAppAuth();
					break;
				case "oauth":
					await this.initializeOAuthAuth();
					break;
				default:
					throw new GitHubAuthError(
						`Unsupported authentication method: ${this.config.method}`,
						"UNSUPPORTED_AUTH_METHOD",
					);
			}

			// Verify authentication by getting user info
			await this.verifyAuthentication();

			// Set up token refresh if needed
			this.setupTokenRefresh();

			logger.info("GitHub authentication initialized successfully", {
				method: this.config.method,
				user: this.authContext?.user?.login,
				rateLimit: this.authContext?.rateLimit,
			});
		} catch (error) {
			logger.error("Failed to initialize GitHub authentication:", error);
			throw error;
		}
	}

	private async initializeTokenAuth(): Promise<void> {
		if (!this.config.token) {
			throw new GitHubAuthError(
				"GitHub token is required for token authentication",
				"MISSING_TOKEN",
			);
		}

		const octokit = new Octokit({
			auth: this.config.token,
			userAgent: "cortex-mcp-github/1.0.0",
			timeZone: "UTC",
		});

		this.authContext = {
			octokit,
			authType: "token",
		};
	}

	private async initializeAppAuth(): Promise<void> {
		const { appId, privateKey, installationId } = this.config;

		if (!appId || !privateKey || !installationId) {
			throw new GitHubAuthError(
				"App ID, private key, and installation ID are required for app authentication",
				"MISSING_APP_CREDENTIALS",
			);
		}

		try {
			const auth = createAppAuth({
				appId: parseInt(appId, 10),
				privateKey: privateKey.replace(/\\n/g, "\n"), // Handle escaped newlines
				installationId: parseInt(installationId, 10),
			});

			const octokit = new Octokit({
				authStrategy: createAppAuth,
				auth: {
					appId: parseInt(appId, 10),
					privateKey: privateKey.replace(/\\n/g, "\n"),
					installationId: parseInt(installationId, 10),
				},
				userAgent: "cortex-mcp-github/1.0.0",
				timeZone: "UTC",
			});

			// Get installation token info
			const { data: installation } = await octokit.rest.apps.getAuthenticated();
			const installationAuth = await auth({ type: "installation" });

			this.tokenExpiresAt = installationAuth.expiresAt
				? new Date(installationAuth.expiresAt)
				: null;

			this.authContext = {
				octokit,
				authType: "app",
			};
		} catch (error: any) {
			throw new GitHubAuthError(
				`Failed to initialize GitHub App authentication: ${error.message}`,
				"APP_AUTH_FAILED",
				error.status,
			);
		}
	}

	private async initializeOAuthAuth(): Promise<void> {
		const { clientId, clientSecret, token } = this.config;

		if (!clientId || !clientSecret) {
			throw new GitHubAuthError(
				"Client ID and client secret are required for OAuth authentication",
				"MISSING_OAUTH_CREDENTIALS",
			);
		}

		// For OAuth, we expect the access token to be provided
		// In a full implementation, this would handle the OAuth flow
		if (!token) {
			throw new GitHubAuthError(
				"Access token is required for OAuth authentication",
				"MISSING_OAUTH_TOKEN",
			);
		}

		const octokit = new Octokit({
			auth: token,
			userAgent: "cortex-mcp-github/1.0.0",
			timeZone: "UTC",
		});

		this.authContext = {
			octokit,
			authType: "oauth",
		};
	}

	private async verifyAuthentication(): Promise<void> {
		if (!this.authContext) {
			throw new GitHubAuthError(
				"Authentication not initialized",
				"NOT_INITIALIZED",
			);
		}

		try {
			// Get authenticated user info
			const { data: user } =
				await this.authContext.octokit.rest.users.getAuthenticated();

			// Get rate limit info
			const { data: rateLimit } =
				await this.authContext.octokit.rest.rateLimit.get();

			this.authContext.user = {
				id: user.id,
				login: user.login,
				name: user.name,
				email: user.email,
			};

			this.authContext.rateLimit = {
				limit: rateLimit.rate.limit,
				remaining: rateLimit.rate.remaining,
				reset: new Date(rateLimit.rate.reset * 1000),
				used: rateLimit.rate.used,
			};
		} catch (error: any) {
			throw new GitHubAuthError(
				`Authentication verification failed: ${error.message}`,
				"VERIFICATION_FAILED",
				error.status,
			);
		}
	}

	private setupTokenRefresh(): void {
		// Only set up refresh for App authentication with expiring tokens
		if (this.config.method === "app" && this.tokenExpiresAt) {
			const refreshTime =
				this.tokenExpiresAt.getTime() - Date.now() - 5 * 60 * 1000; // Refresh 5 min before expiry

			if (refreshTime > 0) {
				this.refreshTimer = setTimeout(() => {
					this.refreshAppToken().catch((error) => {
						logger.error("Failed to refresh GitHub App token:", error);
					});
				}, refreshTime);
			}
		}
	}

	private async refreshAppToken(): Promise<void> {
		logger.info("Refreshing GitHub App token");

		try {
			await this.initializeAppAuth();
			await this.verifyAuthentication();
			this.setupTokenRefresh(); // Schedule next refresh

			logger.info("GitHub App token refreshed successfully");
		} catch (error) {
			logger.error("Failed to refresh GitHub App token:", error);
			throw error;
		}
	}

	// Public methods
	getOctokit(): Octokit {
		if (!this.authContext) {
			throw new GitHubAuthError(
				"Authentication not initialized",
				"NOT_INITIALIZED",
			);
		}
		return this.authContext.octokit;
	}

	getAuthContext(): GitHubAuthContext {
		if (!this.authContext) {
			throw new GitHubAuthError(
				"Authentication not initialized",
				"NOT_INITIALIZED",
			);
		}
		return { ...this.authContext };
	}

	async getRateLimit(): Promise<GitHubAuthContext["rateLimit"]> {
		if (!this.authContext) {
			throw new GitHubAuthError(
				"Authentication not initialized",
				"NOT_INITIALIZED",
			);
		}

		try {
			const { data: rateLimit } =
				await this.authContext.octokit.rest.rateLimit.get();

			const rateLimitInfo = {
				limit: rateLimit.rate.limit,
				remaining: rateLimit.rate.remaining,
				reset: new Date(rateLimit.rate.reset * 1000),
				used: rateLimit.rate.used,
			};

			this.authContext.rateLimit = rateLimitInfo;
			return rateLimitInfo;
		} catch (error: any) {
			logger.error("Failed to get rate limit info:", error);
			throw new GitHubAuthError(
				`Failed to get rate limit: ${error.message}`,
				"RATE_LIMIT_ERROR",
				error.status,
			);
		}
	}

	async refreshAuthentication(): Promise<void> {
		logger.info("Refreshing GitHub authentication");

		try {
			await this.initialize();
		} catch (error) {
			logger.error("Failed to refresh authentication:", error);
			throw error;
		}
	}

	isTokenExpiringSoon(minutesThreshold: number = 10): boolean {
		if (!this.tokenExpiresAt) {
			return false;
		}

		const thresholdTime = Date.now() + minutesThreshold * 60 * 1000;
		return this.tokenExpiresAt.getTime() <= thresholdTime;
	}

	getTokenExpirationInfo(): {
		expiresAt: Date | null;
		isExpiring: boolean;
		minutesUntilExpiry: number | null;
	} {
		if (!this.tokenExpiresAt) {
			return {
				expiresAt: null,
				isExpiring: false,
				minutesUntilExpiry: null,
			};
		}

		const minutesUntilExpiry = Math.floor(
			(this.tokenExpiresAt.getTime() - Date.now()) / (1000 * 60),
		);

		return {
			expiresAt: this.tokenExpiresAt,
			isExpiring: minutesUntilExpiry <= 10,
			minutesUntilExpiry,
		};
	}

	// Validation helpers
	static validateTokenFormat(token: string): boolean {
		// GitHub personal access tokens start with 'ghp_', 'gho_', 'ghu_', 'ghs_', or 'github_pat_'
		// GitHub App tokens start with 'ghs_'
		const tokenPatterns = [
			/^ghp_[A-Za-z0-9]{36}$/, // Personal access token (new format)
			/^gho_[A-Za-z0-9]{36}$/, // OAuth token
			/^ghu_[A-Za-z0-9]{36}$/, // User-to-server token
			/^ghs_[A-Za-z0-9]{36}$/, // Server-to-server token
			/^github_pat_[A-Za-z0-9]{22}_[A-Za-z0-9]{59}$/, // Fine-grained personal access token
			/^[a-f0-9]{40}$/, // Legacy personal access token
		];

		return tokenPatterns.some((pattern) => pattern.test(token));
	}

	static validateAppId(appId: string): boolean {
		return /^\d+$/.test(appId) && parseInt(appId, 10) > 0;
	}

	static validateInstallationId(installationId: string): boolean {
		return /^\d+$/.test(installationId) && parseInt(installationId, 10) > 0;
	}

	static validatePrivateKey(privateKey: string): boolean {
		const keyHeader = "-----BEGIN";
		const keyFooter = "-----END";

		return privateKey.includes(keyHeader) && privateKey.includes(keyFooter);
	}

	// Cleanup
	async cleanup(): Promise<void> {
		logger.info("Cleaning up GitHub authentication");

		if (this.refreshTimer) {
			clearTimeout(this.refreshTimer);
			this.refreshTimer = null;
		}

		this.authContext = null;
		this.tokenExpiresAt = null;
	}

	// Health check
	async healthCheck(): Promise<{
		status: "healthy" | "unhealthy";
		details: any;
	}> {
		try {
			if (!this.authContext) {
				return {
					status: "unhealthy",
					details: { error: "Authentication not initialized" },
				};
			}

			// Check token expiration
			const tokenInfo = this.getTokenExpirationInfo();
			if (
				tokenInfo.expiresAt &&
				tokenInfo.minutesUntilExpiry !== null &&
				tokenInfo.minutesUntilExpiry <= 0
			) {
				return {
					status: "unhealthy",
					details: { error: "Token expired", expirationInfo: tokenInfo },
				};
			}

			// Test API call
			const rateLimit = await this.getRateLimit();

			return {
				status: "healthy",
				details: {
					authType: this.authContext.authType,
					user: this.authContext.user?.login,
					rateLimit,
					tokenExpiration: tokenInfo,
				},
			};
		} catch (error) {
			return {
				status: "unhealthy",
				details: {
					error: error instanceof Error ? error.message : "Unknown error",
				},
			};
		}
	}
}
