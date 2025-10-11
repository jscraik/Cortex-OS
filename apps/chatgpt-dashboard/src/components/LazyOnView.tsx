import * as React from 'react';

import type { PreloadableComponent } from '../utils/preloadableLazy';

interface LazyOnViewProps<Props extends object> {
	id: string;
	title: string;
	LazyComp: PreloadableComponent<Props>;
	componentProps: Props;
	skeleton?: React.ReactNode;
	rootMargin?: string;
	className?: string;
}

export function LazyOnView<Props extends object>({
	id,
	title,
	LazyComp,
	componentProps,
	skeleton = null,
	rootMargin = '600px 0px',
	className,
}: LazyOnViewProps<Props>): React.ReactElement {
	const sectionRef = React.useRef<HTMLElement | null>(null);
	const [shouldLoad, setShouldLoad] = React.useState(false);
	const [isLoading, setIsLoading] = React.useState(false);

	React.useEffect(() => {
		if (shouldLoad) {
			return;
		}

		const element = sectionRef.current;
		if (!element) {
			return;
		}

		const onIntersect: IntersectionObserverCallback = (entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					setIsLoading(true);
					LazyComp.preload?.()
						.catch(() => {
							// swallow preload errors to allow suspense fallback to handle them
						})
						.finally(() => {
							setIsLoading(false);
							setShouldLoad(true);
						});
				}
			});
		};

		const observer = new IntersectionObserver(onIntersect, {
			root: null,
			rootMargin,
			threshold: 0.01,
		});

		observer.observe(element);
		return () => observer.disconnect();
	}, [LazyComp, rootMargin, shouldLoad]);

	React.useEffect(() => {
		if (shouldLoad) {
			return;
		}

		const hash = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '';
		if (hash === id) {
			setIsLoading(true);
			LazyComp.preload?.()
				.catch(() => {})
				.finally(() => {
					setIsLoading(false);
					setShouldLoad(true);
				});
		}
	}, [LazyComp, id, shouldLoad]);

	return (
		<section
			id={id}
			ref={sectionRef as React.MutableRefObject<HTMLElement>}
			className={className}
			style={{ scrollMarginTop: '80px' }}
			aria-busy={isLoading}
		>
			<h2 className="text-xl font-semibold text-neutral-900 mb-4" tabIndex={-1}>
				{title}
			</h2>
			<React.Suspense fallback={skeleton}>
			{shouldLoad
				? React.createElement(LazyComp as unknown as React.ComponentType<Props>, componentProps)
				: skeleton}
		</React.Suspense>
	</section>
);
}
