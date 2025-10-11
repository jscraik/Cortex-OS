import * as React from 'react';

const LOG_ITEMS = [
	{
		level: 'ERROR',
		icon: 'fa-exclamation-triangle text-status-red',
		time: '2025-10-11 07:12:34',
		tag: 'core',
		text: 'Failed to process message in workflow "data-ingestion"',
		meta: ['runId: wf-12345', 'agent: processor-01', 'duration: 2.3s'],
	},
	{
		level: 'WARN',
		icon: 'fa-exclamation-triangle text-status-yellow',
		time: '2025-10-11 07:11:22',
		tag: 'monitoring',
		text: 'High memory usage detected on agent "analyzer-03"',
		meta: ['runId: wf-12344', 'agent: analyzer-03', 'memory: 89%'],
	},
	{
		level: 'INFO',
		icon: 'fa-info-circle text-status-blue',
		time: '2025-10-11 07:10:15',
		tag: 'validation',
		text: 'Workflow "data-validation" completed successfully',
		meta: ['runId: wf-12343', 'agent: validator-02', 'duration: 1.8s'],
	},
];

export default function LogsSection(): React.ReactElement {
	return (
		<div className="bg-white rounded-xl border border-neutral-200 shadow-sm">
			<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-6 border-b border-neutral-200">
				<h3 className="text-xl font-semibold text-neutral-900">Recent Logs</h3>
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
					<div className="relative">
						<i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm" aria-hidden="true" />
						<input
							type="search"
							placeholder="Search logs…"
							className="pl-9 pr-3 py-2 border border-neutral-300 rounded-lg text-sm w-64 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
						/>
					</div>
					<select className="text-sm border border-neutral-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">
						<option>All Severity</option>
						<option>Critical</option>
						<option>Error</option>
						<option>Warn</option>
						<option>Info</option>
					</select>
				</div>
			</div>
			<div className="divide-y">
				{LOG_ITEMS.map((item) => (
					<article key={item.time} className="p-6 hover:bg-neutral-50">
						<div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
							<div className="flex-1">
								<div className="flex items-center gap-3 mb-2 text-sm">
									<i className={`fa-solid ${item.icon}`} aria-hidden="true" />
									<span className="font-medium">{item.level}</span>
									<span className="text-xs text-neutral-500 font-mono bg-neutral-100 px-2 py-1 rounded">{item.time}</span>
									<span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">{item.tag}</span>
								</div>
								<p className="text-sm text-neutral-800 mb-2">{item.text}</p>
								<ul className="flex flex-wrap items-center gap-4 text-xs text-neutral-500">
									{item.meta.map((meta) => (
										<li key={meta}>{meta}</li>
									))}
								</ul>
							</div>
							<div className="flex items-center gap-2">
								<button type="button" className="text-xs text-neutral-600 px-3 py-1.5 border border-neutral-300 rounded-lg hover:bg-neutral-50">
									<i className="fa-solid fa-copy mr-1" aria-hidden="true" />
									Copy
								</button>
								<button type="button" className="text-xs text-neutral-600 px-3 py-1.5 border border-neutral-300 rounded-lg hover:bg-neutral-50">
									<i className="fa-solid fa-external-link mr-1" aria-hidden="true" />
									Trace
								</button>
								<button type="button" className="text-xs text-neutral-600 px-3 py-1.5 border border-neutral-300 rounded-lg hover:bg-neutral-50">
									<i className="fa-solid fa-filter mr-1" aria-hidden="true" />
									Filter
								</button>
							</div>
						</div>
					</article>
				))}
			</div>
			<div className="p-4 border-t text-center">
				<button type="button" className="text-sm text-brand-accent font-medium">
					View All Activity
					<i className="fa-solid fa-arrow-right ml-1" aria-hidden="true" />
				</button>
			</div>
		</div>
	);
}
