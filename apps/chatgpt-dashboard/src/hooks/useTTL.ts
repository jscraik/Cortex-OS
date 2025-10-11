import * as React from 'react';

const clampSeconds = (value?: number): number => {
	if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
	return Math.max(0, Math.floor(value));
};

export function useTTL(initialSeconds?: number): { ttl: number; label: string; urgent: boolean } {
	const seed = clampSeconds(initialSeconds);
	const [ttl, setTtl] = React.useState(seed);

	React.useEffect(() => {
		setTtl(seed);
	}, [seed]);

	React.useEffect(() => {
		if (ttl <= 0) return undefined;
		const timer = window.setInterval(() => {
			setTtl((current) => (current <= 0 ? 0 : current - 1));
		}, 1000);
		return () => window.clearInterval(timer);
	}, [ttl > 0]);

	const minutes = String(Math.floor(ttl / 60)).padStart(2, '0');
	const seconds = String(ttl % 60).padStart(2, '0');
	const hasSeed = seed > 0;
	const label = ttl > 0 ? `TTL ${minutes}:${seconds}` : hasSeed ? 'TTL expired' : 'Waiting for manifest';

	return {
		ttl,
		label,
		urgent: ttl > 0 && ttl <= 10,
	};
}
