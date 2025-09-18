const ttlRegex = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;

/**
 * Convert ISO-8601 duration to milliseconds. Returns null if format invalid.
 */
export function ttlToMs(ttl: string): number | null {
	const match = ttlRegex.exec(ttl);
	if (!match) return null;
	const days = Number(match[1] || 0);
	const hours = Number(match[2] || 0);
	const minutes = Number(match[3] || 0);
	const seconds = Number(match[4] || 0);
	return (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000;
}

/**
 * Determine if a memory is expired given its creation time and TTL.
 */
export function isExpired(createdAtISO: string, ttl: string, nowISO: string): boolean {
	const ttlMs = ttlToMs(ttl);
	if (ttlMs === null) return false;
	const created = new Date(createdAtISO).getTime();
	const now = new Date(nowISO).getTime();
	return created + ttlMs <= now;
}
