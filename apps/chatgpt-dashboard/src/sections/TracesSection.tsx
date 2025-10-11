import * as React from 'react';

const TRACES = [
	{
		id: 'trace-98231',
		type: 'Workflow',
		title: 'data-ingestion pipeline',
		duration: '2.3s',
		status: 'Completed',
		timestamp: '07:12:31',
		tags: ['ingestion', 'prod'],
	},
	{
		id: 'trace-98230',
		type: 'Agent',
		title: 'validator-02 run',
		duration: '1.8s',
		status: 'Completed',
		timestamp: '07:10:02',
		tags: ['validation'],
	},
	{
		id: 'trace-98229',
		type: 'Workflow',
		title: 'data-validation',
		duration: '1.2s',
		status: 'Error',
		timestamp: '07:08:55',
		tags: ['validation', 'retry'],
	},
];

export default function TracesSection(): React.ReactElement {
	return (
		<div className="bg-white rounded-xl border border-neutral-200 shadow-sm">
			<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-6 border-b">
				<div>
					<h3 className="text-xl font-semibold text-neutral-900">Traces</h3>
					<p className="text-sm text-neutral-500">Recent agent and workflow executions</p>
				</div>
				<div className="flex items-center gap-3">
					<select className="text-sm border border-neutral-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">
						<option>Last hour</option>
						<option>Last 6 hours</option>
						<option>Last day</option>
					</select>
					<button className="text-sm text-neutral-600 px-3 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50" type="button">
						Download JSON
					</button>
				</div>
			</div>
			<ul className="divide-y">
				{TRACES.map((trace) => (
					<li key={trace.id} className="p-6 hover:bg-neutral-50">
						<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
							<div className="flex items-start gap-4">
								<div className="w-10 h-10 bg-brand-accent/10 text-brand-accent rounded-lg grid place-items-center flex-shrink-0">
									<i className={`fa-solid ${trace.type === 'Workflow' ? 'fa-diagram-project' : 'fa-robot'}`} aria-hidden="true" />
								</div>
								<div>
									<p className="text-sm font-medium text-neutral-900">{trace.title}</p>
									<p className="text-xs text-neutral-500 font-mono">{trace.id}</p>
									<div className="flex flex-wrap gap-2 mt-2">
										<span className="inline-flex items-center gap-2 text-xs text-neutral-500">
											<i className="fa-solid fa-clock" aria-hidden="true" />
											{trace.duration}
										</span>
										<span className="inline-flex items-center gap-2 text-xs text-neutral-500">
											<i className="fa-solid fa-stopwatch" aria-hidden="true" />
											{trace.timestamp}
										</span>
									</div>
									<div className="flex flex-wrap gap-2 mt-2">
										{trace.tags.map((tag) => (
											<span key={tag} className="bg-neutral-100 text-neutral-600 text-xs px-2 py-1 rounded-full">
												{tag}
											</span>
										))}
									</div>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<span className={`text-xs font-medium px-3 py-1.5 rounded-full ${trace.status === 'Completed' ? 'bg-status-green-bg text-status-green' : 'bg-status-red-bg text-status-red'}`}>
									{trace.status}
								</span>
								<button className="text-xs text-brand-accent font-medium" type="button">
									Open Trace
								</button>
							</div>
						</div>
					</li>
				))}
			</ul>
		</div>
	);
}
