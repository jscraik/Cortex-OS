export const generateId = (): string => {
	if (globalThis.crypto?.randomUUID) {
		return globalThis.crypto.randomUUID();
	}
	// Fallback using crypto.getRandomValues
	const randomBytes = crypto.getRandomValues(new Uint8Array(16));
	return Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, '0'))
		.join('')
		.slice(0, 11);
};
