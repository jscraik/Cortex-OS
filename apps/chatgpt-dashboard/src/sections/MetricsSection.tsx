import * as React from 'react';

const METRICS = [
	{ label: 'CPU Utilisation', value: '32%', trend: 'Stable', state: 'green' },
	{ label: 'Memory', value: '68%', trend: '+5%', state: 'yellow' },
	{ label: 'Latency (p95)', value: '182ms', trend: '+12ms', state: 'yellow' },
	{ label: 'Error Rate', value: '0.4%', trend: '-0.1%', state: 'green' },
];

export default function MetricsSection(): React.ReactElement {
	return (
		<div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
				<div>
					<h3 className="text-xl font-semibold text-neutral-900">Performance Metrics</h3>
					<p className="text-sm text-neutral-500">Real-time metrics aggregated across all connectors</p>
				</div>
				<div className="flex items-center gap-3">
					<button className="text-xs text-neutral-600 px-3 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50" type="button">
						<i className="fa-solid fa-sliders mr-2" aria-hidden="true" />
						Configure
					</button>
					<button className="text-xs text-brand-accent font-medium" type="button">
						View in Grafana
						<i className="fa-solid fa-arrow-right ml-1" aria-hidden="true" />
					</button>
				</div>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
				{METRICS.map((metric) => (
					<div key={metric.label} className="p-4 border border-neutral-200 rounded-lg">
						<div className="flex items-center justify-between mb-3">
							<p className="text-sm text-neutral-600 font-medium">{metric.label}</p>
							<span className={`inline-flex items-center gap-2 text-xs font-medium ${metric.state === 'green' ? 'text-status-green' : 'text-status-yellow'}`}>
								<i className={`fa-solid ${metric.state === 'green' ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`} aria-hidden="true" />
								{metric.trend}
							</span>
						</div>
						<p className="text-2xl font-semibold text-neutral-900">{metric.value}</p>
						<div className="h-2 bg-neutral-100 rounded-full mt-3 overflow-hidden" aria-hidden="true">
							<div className={`${metric.state === 'green' ? 'bg-status-green' : 'bg-status-yellow'} h-full transition-all duration-500`} style={{ width: metric.value }} />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
