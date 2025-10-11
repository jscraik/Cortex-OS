import * as React from 'react';

const ROWS = [
	{
		name: 'data-processor-01',
		type: 'Processing Agent',
		status: 'Running',
		tags: ['core', 'ingestion'],
		started: '2025-10-11 06:15:22',
		metrics: ['CPU: 23%', 'Mem: 45%'],
		kind: 'Agent',
	},
	{
		name: 'data-validation-wf',
		type: 'Validation Workflow',
		status: 'Error',
		tags: ['core', 'validation'],
		started: '2025-10-11 05:45:10',
		metrics: ['Failed: Step 3', 'Runtime: 1.2s'],
		kind: 'Workflow',
	},
	{
		name: 'monitor-agent-02',
		type: 'Monitoring Agent',
		status: 'Idle',
		tags: ['monitoring', 'system'],
		started: '2025-10-10 23:30:00',
		metrics: ['CPU: 2%', 'Mem: 12%'],
		kind: 'Agent',
	},
];

const STATUS_STYLES: Record<string, string> = {
	Running: 'bg-status-green-bg text-status-green',
	Error: 'bg-status-red-bg text-status-red',
	Idle: 'bg-status-yellow-bg text-status-yellow',
};

export default function AgentsSection(): React.ReactElement {
	return (
		<div className="bg-white rounded-xl border border-neutral-200 shadow-sm">
			<div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 p-6 border-b">
				<h3 className="text-xl font-semibold text-neutral-900">Active Agents & Workflows</h3>
				<div className="flex flex-col sm:flex-row sm:items-center gap-4">
					<div className="relative">
						<i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm" aria-hidden="true" />
						<input
							type="search"
							placeholder="Search by name, tag, or status"
							className="pl-9 pr-3 py-2 border border-neutral-300 rounded-lg text-sm w-72 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
						/>
					</div>
					<label className="flex items-center gap-2 text-sm text-neutral-600">
						<span className="font-medium">Group by:</span>
						<select className="border border-neutral-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">
							<option>Tag</option>
							<option>Status</option>
							<option>Type</option>
						</select>
					</label>
				</div>
			</div>
			<div className="overflow-x-auto">
				<table className="w-full text-sm text-left">
					<thead className="text-xs text-neutral-500 uppercase bg-neutral-50 border-b">
						<tr>
							<th className="px-6 py-4">Name</th>
							<th className="px-6 py-4">Type</th>
							<th className="px-6 py-4">Status</th>
							<th className="px-6 py-4">Tags</th>
							<th className="px-6 py-4">Started</th>
							<th className="px-6 py-4">Performance</th>
							<th className="px-6 py-4">Actions</th>
						</tr>
					</thead>
					<tbody className="divide-y">
						{ROWS.map((row) => (
							<tr key={row.name} className="hover:bg-neutral-50">
								<td className="px-6 py-4 font-medium text-neutral-900">
									<div className="flex items-center gap-3">
										<i className={`fa-solid ${row.kind === 'Workflow' ? 'fa-diagram-project text-purple-500' : 'fa-robot text-brand-accent'}`} aria-hidden="true" />
										<div>
											<p className="font-medium">{row.name}</p>
											<p className="text-xs text-neutral-500">{row.kind}</p>
										</div>
									</div>
								</td>
								<td className="px-6 py-4">
									<span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">{row.type}</span>
								</td>
								<td className="px-6 py-4">
									<span className={`inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full ${STATUS_STYLES[row.status]}`}>
										{row.status}
									</span>
								</td>
								<td className="px-6 py-4">
									<div className="flex flex-wrap gap-1">
										{row.tags.map((tag) => (
											<span key={tag} className="bg-neutral-100 text-neutral-600 text-xs px-2 py-0.5 rounded">
												{tag}
											</span>
										))}
									</div>
							</td>
							<td className="px-6 py-4 font-mono text-neutral-500 text-xs">{row.started}</td>
							<td className="px-6 py-4 text-xs text-neutral-600">
								{row.metrics.map((metric) => (
									<div key={metric}>{metric}</div>
								))}
							</td>
							<td className="px-6 py-4">
								<div className="flex items-center gap-2">
									<button className="text-xs font-medium text-brand-accent px-2 py-1 rounded hover:bg-brand-accent/10" type="button">
										{row.status === 'Running' ? 'Pause' : row.status === 'Error' ? 'Retry' : 'Resume'}
									</button>
									<span className="text-neutral-300">|</span>
									<button className="text-xs font-medium text-neutral-600 px-2 py-1 rounded hover:bg-neutral-100" type="button">
										{row.kind === 'Workflow' ? 'Debug' : 'Drain'}
									</button>
								</div>
							</td>
						</tr>
						))}
					</tbody>
				</table>
			</div>
			<div className="p-4 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-neutral-600">
				<p>Showing 3 of 60 total agents and workflows</p>
				<div className="flex items-center gap-2">
					<button className="px-3 py-1 border border-neutral-300 rounded-lg" type="button" disabled>
						Previous
					</button>
					<button className="px-3 py-1 border border-neutral-300 rounded-lg bg-brand-accent text-white" type="button">
						1
					</button>
					<button className="px-3 py-1 border border-neutral-300 rounded-lg" type="button">
						2
					</button>
					<button className="px-3 py-1 border border-neutral-300 rounded-lg" type="button">
						3
					</button>
					<span className="text-neutral-400">…</span>
					<button className="px-3 py-1 border border-neutral-300 rounded-lg" type="button">
						20
					</button>
					<button className="px-3 py-1 border border-neutral-300 rounded-lg" type="button">
						Next
					</button>
				</div>
			</div>
		</div>
	);
}
