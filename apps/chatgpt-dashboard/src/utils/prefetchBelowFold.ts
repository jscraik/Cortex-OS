import { idlePrefetch } from './idlePrefetch';

export function prefetchBelowFold() {
	idlePrefetch(() => {
		void import(
			/* webpackPrefetch: true, webpackChunkName: "section-connectors" */ '../sections/ConnectorOverviewSection'
		);
	});

	idlePrefetch(() => {
		void import(
			/* webpackPrefetch: true, webpackChunkName: "section-activity-log" */ '../sections/ActivityLogSection'
		);
	});
}
