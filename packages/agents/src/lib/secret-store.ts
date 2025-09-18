/**
 * Secret management utilities
 */

/**
 * Redact secrets from text
 */
export const redactSecrets = (str: string): string => {
	const patterns = [
		/api[_-]?key[s]?\s*[:=]\s*["']?([a-zA-Z0-9_-]{32,})["']?/gi,
		/password[s]?\s*[:=]\s*["']?([a-zA-Z0-9_-]{8,})["']?/gi,
		/token[s]?\s*[:=]\s*["']?([a-zA-Z0-9_-]{32,})["']?/gi,
		/bearer\s+([a-zA-Z0-9_-]{32,})/gi,
	];

	let redacted = str;
	for (const pattern of patterns) {
		redacted = redacted.replace(pattern, '[REDACTED]');
	}

	return redacted;
};
