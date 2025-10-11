import * as React from 'react';

export type PreloadableComponent<Props> = React.LazyExoticComponent<React.ComponentType<Props>> & {
	preload?: () => Promise<unknown>;
};

export function preloadableLazy<Props>(
	importer: () => Promise<{ default: React.ComponentType<Props> }>,
): PreloadableComponent<Props> {
	const Lazy = React.lazy(importer) as PreloadableComponent<Props>;
	Lazy.preload = importer;
	return Lazy;
}
