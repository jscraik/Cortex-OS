export type OAuthProtectedResourceOptions = {
	authorizationServers: string[];
	resource: string;
	scopeMap: Record<string, string[]>;
	cacheControl?: string;
};

export type OAuthProtectedResourceMetadata = {
	authorizationServers: string[];
	resource: string;
	scopes: Record<string, string[]>;
};

export function buildProtectedResourceMetadata(
	options: OAuthProtectedResourceOptions,
): OAuthProtectedResourceMetadata {
	return {
		authorizationServers: options.authorizationServers,
		resource: options.resource,
		scopes: options.scopeMap,
	};
}

type ResponseLike = {
	setHeader(name: string, value: string): void;
	status(code: number): ResponseLike;
	json(body: unknown): void;
};

export function createOauthProtectedResourceHandler(options: OAuthProtectedResourceOptions) {
	const metadata = buildProtectedResourceMetadata(options);
	return (_req: unknown, res: ResponseLike) => {
		const cacheHeader = options.cacheControl ?? 'public, max-age=600';
		res.setHeader('Content-Type', 'application/json');
		res.setHeader('Cache-Control', cacheHeader);
		res.status(200).json({
			authorization_servers: metadata.authorizationServers,
			resource: metadata.resource,
			resource_server: metadata.resource,
			scopes: metadata.scopes,
		});
	};
}
