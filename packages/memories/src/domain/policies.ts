import type { Memory } from "./types.js";

export function isExpired(
	m: Memory,
	nowISO = new Date().toISOString(),
): boolean {
	if (!m.ttl) return false;
	try {
		const now = new Date(nowISO).getTime();
		const created = new Date(m.createdAt).getTime();
		const ms = isoDurationToMs(m.ttl);
		return Number.isFinite(ms) ? created + ms <= now : false;
	} catch {
		return false;
	}
}

export function isoDurationToMs(iso: string): number {
	const m = iso.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
	if (!m) return Number.NaN;
	const days = Number(m[1] || 0);
	const hours = Number(m[2] || 0);
	const mins = Number(m[3] || 0);
	const secs = Number(m[4] || 0);
	return (((days * 24 + hours) * 60 + mins) * 60 + secs) * 1000;
}
