import * as React from 'react';

import { Sparkline } from '../components/Sparkline';

const METRICS = [
	{
		icon: 'fa-robot text-brand-accent',
		label: 'Active Agents',
		value: '42',
		delta: '+3 from yesterday',
		deltaClass: 'text-status-green',
		color: '#4F46E5',
		data: [35, 38, 40, 42, 41, 39, 40, 42, 44, 43, 41, 42],
	},
	{
		icon: 'fa-diagram-project text-purple-500',
		label: 'Running Workflows',
		value: '18',
		delta: '-2 from yesterday',
		deltaClass: 'text-status-red',
		color: '#8B5CF6',
		data: [12, 15, 16, 18, 17, 16, 17, 18, 19, 18, 17, 18],
	},
	{
		icon: 'fa-exclamation-triangle text-status-red',
		label: 'Error Count (1h)',
		value: '3',
		delta: 'No change',
		deltaClass: 'text-neutral-500',
		color: '#EF4444',
		data: [0, 0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 3],
	},
	{
		icon: 'fa-clock text-status-yellow',
		label: 'Avg Latency',
		value: '128ms',
		delta: '+12ms from avg',
		deltaClass: 'text-status-yellow',
		color: '#F59E0B',
		data: [120, 125, 118, 130, 128, 126, 124, 132, 129, 127, 125, 128],
	},
];

export default function HomeSection(): React.ReactElement {
	return (
		<div>
			<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
				<div>
					<h1 className="text-3xl font-bold text-neutral-900">System Overview</h1>
					<p className="text-neutral-600 mt-1">Monitor and manage your Cortex-OS deployment</p>
				</div>
				<div className="flex items-center gap-3">
					<ActionButton icon="fa-download" label="Export Report" />
					<ActionButton icon="fa-edit" label="Edit Layout" />
					<ActionButton icon="fa-table" label="Comfortable" />
				</div>
			</div>

			<div className="bg-gradient-to-r from-status-green to-emerald-500 text-white p-4 rounded-lg mb-8">
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
					<div className="flex items-center gap-3">
						<i className="fa-solid fa-check-circle text-xl" aria-hidden="true" />
						<div>
							<h3 className="font-semibold">All Systems Operational</h3>
							<p className="text-sm opacity-90">Last updated: 2 minutes ago</p>
						</div>
					</div>
					<div className="flex items-center gap-6 text-sm">
						<Summary label="Uptime" value="99.97%" />
						<Summary label="Avg Response" value="1.2s" />
						<Summary label="Active Agents" value="42" />
					</div>
				</div>
			</div>

			<div id="metric-strip" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
				{METRICS.map((metric, index) => (
					<div key={metric.label} className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
						<div className="flex justify-between items-start mb-4">
							<div>
								<div className="flex items-center gap-2 mb-2 text-neutral-600 text-sm font-medium">
									<i className={`fa-solid ${metric.icon}`} aria-hidden="true" />
									<span>{metric.label}</span>
								</div>
								<p className="text-3xl font-bold text-neutral-900">{metric.value}</p>
								<p className={`text-xs font-medium mt-1 ${metric.deltaClass}`}>{metric.delta}</p>
							</div>
							<Sparkline
								data={metric.data}
								color={metric.color}
								delay={(index + 1) * 120}
								className="w-24"
								ariaLabel={`${metric.label} trend`}
							/>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

interface ActionButtonProps {
	icon: string;
	label: string;
}

function ActionButton({ icon, label }: ActionButtonProps): React.ReactElement {
	return (
		<button className="text-sm text-neutral-600 px-4 py-2 rounded-lg border border-neutral-300 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent flex items-center gap-2" type="button">
			<i className={`fa-solid ${icon}`} aria-hidden="true" />
			{label}
		</button>
	);
}

interface SummaryProps {
	label: string;
	value: string;
}

function Summary({ label, value }: SummaryProps): React.ReactElement {
	return (
		<div className="text-center">
			<div className="font-semibold text-base">{value}</div>
			<div className="text-xs opacity-80">{label}</div>
		</div>
	);
}
