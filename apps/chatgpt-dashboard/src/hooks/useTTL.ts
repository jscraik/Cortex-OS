import * as React from 'react';

export function useTTL(initialSeconds: number): { ttl: number; label: string; urgent: boolean } {
	const [ttl, setTtl] = React.useState(initialSeconds);

	React.useEffect(() => {
		if (ttl <= 0) {
			return;
		}

		const timer = window.setInterval(() => {
			setTtl((current) => Math.max(0, current - 1));
		}, 1000);

		return () => window.clearInterval(timer);
	}, [ttl]);

	const minutes = String(Math.floor(ttl / 60)).padStart(2, '0');
	const seconds = String(ttl % 60).padStart(2, '0');

	return {
		ttl,
		label: `TTL ${minutes}:${seconds}`,
		urgent: ttl > 0 && ttl <= 10,
	};
}
