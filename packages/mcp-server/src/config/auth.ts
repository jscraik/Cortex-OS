import { parseBooleanEnv } from '../utils/config.js';

export type AuthMode = 'api-key' | 'anonymous' | 'oauth2' | 'optional';

export type Auth0Settings = {
	domain: string;
	issuer: string;
	audience: string;
	resource: string;
	requiredScopes: string[];
};

export type AuthConfig = {
	mode: AuthMode;
	apiKey?: string;
	auth0?: Auth0Settings;
	enforceScopes: boolean;
};

const AUTH_MODE_VALUES: AuthMode[] = ['api-key', 'anonymous', 'oauth2', 'optional'];

function normalizeDomain(value: string): string {
	const trimmed = value.trim();
	if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
		return new URL(trimmed).hostname;
	}
	return trimmed;
}

function buildIssuer(domain: string): string {
	const host = normalizeDomain(domain);
	return `https://${host}/`;
}

function ensureAbsoluteResource(value: string | undefined): string {
	if (!value) {
		throw new Error(
			'[brAInwav] MCP_RESOURCE_URL must be set when OAuth2 authentication is enabled.',
		);
	}
	const normalized = value.trim();
	const parsed = new URL(normalized);
	if (!parsed.origin || parsed.origin === 'null') {
		throw new Error(
			`[brAInwav] MCP_RESOURCE_URL must be an absolute URL, received: ${normalized}`,
		);
	}
	return parsed.toString().replace(/\/$/, '');
}

function splitScopes(value: string | undefined): string[] {
	if (!value) {
		return [];
	}
	return value
		.split(/[,\s]+/)
		.map((item) => item.trim())
		.filter(Boolean);
}

function parseMode(value: string | undefined, hasApiKey: boolean): AuthMode {
	if (!value) {
		return hasApiKey ? 'api-key' : 'anonymous';
	}
	const normalized = value.trim().toLowerCase();
	if (AUTH_MODE_VALUES.includes(normalized as AuthMode)) {
		return normalized as AuthMode;
	}
	return hasApiKey ? 'api-key' : 'anonymous';
}

export function loadAuthConfig(): AuthConfig {
	const apiKey = process.env.MCP_API_KEY?.trim();
	const mode = parseMode(process.env.AUTH_MODE, Boolean(apiKey));
	const scopes = splitScopes(process.env.REQUIRED_SCOPES);
	const enforceScopes = parseBooleanEnv(process.env.REQUIRED_SCOPES_ENFORCE, true);

	if (mode === 'oauth2' || mode === 'optional') {
		const domain = process.env.AUTH0_DOMAIN?.trim();
		const audience = process.env.AUTH0_AUDIENCE?.trim();
		if (!domain || !audience) {
			throw new Error(
				'[brAInwav] AUTH0_DOMAIN and AUTH0_AUDIENCE must be configured for OAuth2 mode.',
			);
		}
		const resource = ensureAbsoluteResource(process.env.MCP_RESOURCE_URL);
		const issuer = buildIssuer(domain);
		const auth0: Auth0Settings = {
			domain: normalizeDomain(domain),
			issuer,
			audience,
			resource,
			requiredScopes: scopes,
		};
		return { mode, apiKey, auth0, enforceScopes };
	}

	return { mode, apiKey, auth0: undefined, enforceScopes };
}
