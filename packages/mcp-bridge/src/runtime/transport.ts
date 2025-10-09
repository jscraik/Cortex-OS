export type TransportWarning = 'preferAll' | 'unknownOverride';

export type TransportSelection = {
	selected: 'http' | 'stdio';
	warnings: TransportWarning[];
};

export const resolveTransport = (override: string | undefined | null): TransportSelection => {
	if (!override) {
		return { selected: 'http', warnings: [] };
	}

	const value = override.trim().toLowerCase();
	if (!value) {
		return { selected: 'http', warnings: [] };
	}

	if (value === 'stdio') {
		return { selected: 'stdio', warnings: [] };
	}

	if (value === 'http' || value === 'sse') {
		return { selected: 'http', warnings: [] };
	}

	if (value === 'all') {
		return { selected: 'http', warnings: ['preferAll'] };
	}

	return { selected: 'http', warnings: ['unknownOverride'] };
};
