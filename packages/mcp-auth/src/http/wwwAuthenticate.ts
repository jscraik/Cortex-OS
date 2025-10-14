export type WwwAuthenticateParams = {
	realm?: string;
	authorizationUrl: string;
	resourceMetadataUrl: string;
	error?: string;
	errorDescription?: string;
	scope?: string | string[];
};

/**
 * Properly escape quotes in authentication header values
 * brAInwav: Fixed incomplete sanitization - now escapes backslashes first
 */
function quote(value: string): string {
	// Must escape backslashes FIRST, then quotes to prevent bypass
	const safe = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
	return `"${safe}"`;
}

function formatParam(name: string, value: string | undefined): string | null {
	if (!value) {
		return null;
	}
	return `${name}=${quote(value)}`;
}

function normalizeScope(scope: string | string[] | undefined): string | undefined {
	if (!scope) {
		return undefined;
	}
	return Array.isArray(scope) ? scope.join(' ') : scope;
}

export function buildWwwAuthenticateHeader(params: WwwAuthenticateParams): string {
	const pieces = ['Bearer'];
	const realm = formatParam('realm', params.realm ?? 'MCP');
	if (realm) {
		pieces.push(realm);
	}
	const authUrl = formatParam('authorization_uri', params.authorizationUrl);
	if (authUrl) {
		pieces.push(authUrl);
	}
	const metadata = formatParam('resource_metadata', params.resourceMetadataUrl);
	if (metadata) {
		pieces.push(metadata);
	}
	const scopeValue = normalizeScope(params.scope);
	const scope = formatParam('scope', scopeValue);
	if (scope) {
		pieces.push(scope);
	}
	const error = formatParam('error', params.error);
	if (error) {
		pieces.push(error);
	}
	const description = formatParam('error_description', params.errorDescription);
	if (description) {
		pieces.push(description);
	}
	return pieces.join(', ');
}
