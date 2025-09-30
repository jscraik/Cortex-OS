export interface AuthOptions {
	clientId: string;
	redirectUri: string;
	scope?: string;
	state?: string;
}

export interface TokenResponse {
	access_token: string;
	token_type: string;
	expires_in?: number;
	refresh_token?: string;
	scope?: string;
}

export interface PKCETokens {
	codeVerifier: string;
	codeChallenge: string;
	codeChallengeMethod: 'S256';
}
