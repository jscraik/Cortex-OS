export function getSecret(key: string): string | undefined {
	// Get secret from environment variables
	return process.env[key];
}

export function redactSecrets(text: string): string {
	// Basic redaction for common secret patterns
	const patterns = [
		// API keys
		/([a-zA-Z0-9]+-)?[a-zA-Z0-9]{32,}/g,
		// JWT tokens
		/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
		// Environment variables that might contain secrets
		/(?:password|secret|key|token)=\S+/gi,
	];

	let redacted = text;
	for (const pattern of patterns) {
		redacted = redacted.replace(pattern, '[REDACTED]');
	}

	return redacted;
}
