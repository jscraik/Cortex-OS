export function currentTimestamp(deterministic: boolean, offsetSeconds = 0): string {
	const base = deterministic ? new Date('2025-08-21T00:00:00.000Z').getTime() : Date.now();
	const offset = offsetSeconds * 1000;
	return new Date(base + offset).toISOString();
}
