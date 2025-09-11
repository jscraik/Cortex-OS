export function currentTimestamp(deterministic, offsetSeconds = 0) {
	const base = deterministic
		? new Date('2025-08-21T00:00:00.000Z').getTime()
		: Date.now();
	const offset = offsetSeconds * 1000;
	return new Date(base + offset).toISOString();
}
//# sourceMappingURL=time.js.map
