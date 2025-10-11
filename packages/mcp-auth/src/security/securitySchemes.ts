export type ToolSecurityScheme =
	| { type: 'noauth'; description?: string }
	| { type: 'oauth2'; scopes: string[]; description?: string };

export function noAuthScheme(description?: string): ToolSecurityScheme {
	return { type: 'noauth', description };
}

export function oauth2Scheme(scopes: string[], description?: string): ToolSecurityScheme {
	const uniqueScopes = Array.from(new Set(scopes.filter(Boolean)));
	return { type: 'oauth2', scopes: uniqueScopes, description };
}

export function combineSecuritySchemes(
	...entries: Array<ToolSecurityScheme | ToolSecurityScheme[] | undefined>
): ToolSecurityScheme[] {
	const flattened: ToolSecurityScheme[] = [];
	for (const entry of entries) {
		if (!entry) continue;
		if (Array.isArray(entry)) {
			flattened.push(...entry);
		} else {
			flattened.push(entry);
		}
	}

	const deduped = new Map<string, ToolSecurityScheme>();
	for (const scheme of flattened) {
		if (scheme.type === 'oauth2') {
			const key = `${scheme.type}:${scheme.scopes.sort().join(',')}:${scheme.description ?? ''}`;
			if (!deduped.has(key)) {
				deduped.set(key, scheme);
			}
			continue;
		}
		const key = `${scheme.type}:${scheme.description ?? ''}`;
		if (!deduped.has(key)) {
			deduped.set(key, scheme);
		}
	}
	return [...deduped.values()];
}
