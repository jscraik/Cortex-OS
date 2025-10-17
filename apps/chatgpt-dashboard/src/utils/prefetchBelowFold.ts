import { idlePrefetch } from './idlePrefetch';

export function prefetchBelowFold() {
	idlePrefetch(() => {
		void import(
			/* webpackPrefetch: true, webpackChunkName: "section-connectors" */ '../sections/ConnectorsSection'
		);
	});

	idlePrefetch(() => {
		void import(
			/* webpackPrefetch: true, webpackChunkName: "section-logs" */ '../sections/LogsSection'
		);
	});
}
