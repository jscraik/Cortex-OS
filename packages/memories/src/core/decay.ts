/**
 * Exponential decay factor in [0,1] based on age and half-life.
 * factor = exp(-ln(2) * ageMs / halfLifeMs)
 */
export function decayFactor(createdAtISO: string, nowISO: string, halfLifeMs: number): number {
	const created = new Date(createdAtISO).getTime();
	const now = new Date(nowISO).getTime();
	const age = Math.max(0, now - created);
	if (!halfLifeMs || halfLifeMs <= 0) return 1;
	const lambda = Math.log(2) / halfLifeMs;
	return Math.exp(-lambda * age);
}

export function decayEnabled(): boolean {
	return (process.env.MEMORIES_DECAY_ENABLED || 'false').toLowerCase() === 'true';
}

export function getHalfLifeMs(): number {
	const val = Number(process.env.MEMORIES_DECAY_HALFLIFE_MS || '0');
	return Number.isFinite(val) && val > 0 ? val : 0;
}
