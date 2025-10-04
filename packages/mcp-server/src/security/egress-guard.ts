import type { Logger } from 'pino';

interface AllowlistResult {
	allowed: boolean;
	reason?: string;
}

const DEFAULT_ALLOWLIST = ['localhost', '127.0.0.1', '::1'];

const parseAllowlist = (): string[] => {
	const raw = process.env.MCP_EGRESS_ALLOWLIST;
	if (!raw) {
		return DEFAULT_ALLOWLIST;
	}

	return raw
		.split(',')
		.map((entry) => entry.trim().toLowerCase())
		.filter((entry) => entry.length > 0);
};

const resolveHostname = (endpoint: string): string | undefined => {
	try {
		return new URL(endpoint).hostname.toLowerCase();
	} catch {
		return undefined;
	}
};

export const isEndpointAllowed = (endpoint: string): AllowlistResult => {
	const hostname = resolveHostname(endpoint);

	if (!hostname) {
		return {
			allowed: false,
			reason: 'Invalid endpoint URL',
		};
	}

	const allowlist = parseAllowlist();

	if (allowlist.includes(hostname)) {
		return { allowed: true };
	}

	return {
		allowed: false,
		reason: `Hostname ${hostname} not in allowlist`,
	};
};

export const enforceEndpointAllowlist = (
	endpoint: string,
	logger: Logger,
	capability: string,
): boolean => {
	const result = isEndpointAllowed(endpoint);

	if (!result.allowed) {
		logger.warn(
			{
				branding: 'brAInwav',
				endpoint,
				capability,
				reason: result.reason,
			},
			'brAInwav MCP egress guard blocked endpoint',
		);
	}

	return result.allowed;
};
