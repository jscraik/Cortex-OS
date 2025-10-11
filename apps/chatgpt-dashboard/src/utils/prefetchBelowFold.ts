import { idlePrefetch } from './idlePrefetch.js';

export function prefetchBelowFold() {
	idlePrefetch(() => {
		void import(
			/* webpackPrefetch: true, webpackChunkName: "section-connectors" */ '../sections/ConnectorOverviewSection.js'
		);
	});

	idlePrefetch(() => {
		void import(
			/* webpackPrefetch: true, webpackChunkName: "section-activity-log" */ '../sections/ActivityLogSection.js'
		);
	});
}
