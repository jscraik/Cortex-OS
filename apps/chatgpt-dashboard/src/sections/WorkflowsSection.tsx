import * as React from 'react';

const WORKFLOWS = [
	{
		name: 'data-ingestion',
		description: 'Collects and normalises raw telemetry events',
		schedule: 'Every 5 minutes',
		runsToday: 18,
		successRate: '98.3%',
		tags: ['core', 'ingestion'],
	},
	{
		name: 'compliance-audit',
		description: 'Validates retention and access policies across data stores',
		schedule: 'Hourly',
		runsToday: 6,
		successRate: '100%',
		tags: ['compliance'],
	},
	{
		name: 'weekly-report',
		description: 'Generates executive summary of agent performance',
		schedule: 'Every Friday 08:00 UTC',
		runsToday: 1,
		successRate: 'Pending',
		tags: ['reporting'],
	},
];

export default function WorkflowsSection(): React.ReactElement {
	return (
		<div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6">
			<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
				<div>
					<h3 className="text-xl font-semibold text-neutral-900">Workflows</h3>
					<p className="text-sm text-neutral-500">Automation pipelines monitored during this window</p>
				</div>
				<div className="flex items-center gap-3">
					<button className="text-xs text-neutral-600 px-3 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50" type="button">
						<i className="fa-solid fa-plus mr-2" aria-hidden="true" />
						New Workflow
					</button>
					<button className="text-xs text-neutral-600 px-3 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50" type="button">
						<i className="fa-solid fa-layer-group mr-2" aria-hidden="true" />
						Templates
					</button>
				</div>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
				{WORKFLOWS.map((workflow) => (
					<article key={workflow.name} className="border border-neutral-200 rounded-lg p-4 flex flex-col gap-3">
						<header>
							<h4 className="text-sm font-semibold text-neutral-900 capitalize">{workflow.name}</h4>
							<p className="text-xs text-neutral-500">{workflow.description}</p>
						</header>
						<div className="flex items-center justify-between text-xs text-neutral-600">
							<span className="inline-flex items-center gap-2">
								<i className="fa-solid fa-calendar" aria-hidden="true" />
								{workflow.schedule}
							</span>
							<span className="inline-flex items-center gap-2 font-mono">
								<i className="fa-solid fa-rotate-right" aria-hidden="true" />
								Runs: {workflow.runsToday}
							</span>
						</div>
						<div className="flex items-center justify-between text-xs">
							<span className="text-neutral-600">Success Rate</span>
							<span className={workflow.successRate === 'Pending' ? 'text-neutral-500' : 'text-status-green font-semibold'}>
								{workflow.successRate}
							</span>
						</div>
						<footer className="flex flex-wrap gap-2">
							{workflow.tags.map((tag) => (
								<span key={tag} className="bg-neutral-100 text-neutral-600 text-xs px-2 py-1 rounded-full">
									{tag}
								</span>
							))}
						</footer>
					</article>
				))}
			</div>
		</div>
	);
}
