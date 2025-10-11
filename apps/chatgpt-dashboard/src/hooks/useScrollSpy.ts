import * as React from 'react';

export function useScrollSpy(ids: string[], rootMargin = '-72px 0px -70% 0px'): string {
	const [active, setActive] = React.useState(ids[0] ?? '');

	React.useEffect(() => {
		const elements = ids
			.map((id) => document.getElementById(id))
			.filter((element): element is HTMLElement => Boolean(element));

		if (elements.length === 0) {
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				const visible = entries
					.filter((entry) => entry.isIntersecting)
					.sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
				if (visible?.target?.id) {
					setActive(visible.target.id);
				}
			},
			{ rootMargin, threshold: [0.2, 0.6, 1] },
		);

		elements.forEach((element) => observer.observe(element));
		return () => observer.disconnect();
	}, [ids, rootMargin]);

	return active;
}
