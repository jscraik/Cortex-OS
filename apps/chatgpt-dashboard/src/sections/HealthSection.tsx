import * as React from 'react';

const METRICS = ['CPU Usage', 'Memory', 'Disk I/O', 'Network'] as const;
const VALUES = ['23%', '67%', '12%', '8%'];

export default function HealthSection(): React.ReactElement {
	return (
		<div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
			<div className="xl:col-span-2 bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
				<div className="flex items-center justify-between mb-6">
					<h3 className="text-xl font-semibold text-neutral-900">System Health</h3>
					<div className="flex items-center gap-2 text-sm font-medium text-status-green">
						<span className="w-2 h-2 bg-status-green rounded-full" aria-hidden="true" />
						All Systems Operational
					</div>
				</div>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					{METRICS.map((metric, index) => (
						<div key={metric} className="text-center p-4 bg-neutral-50 rounded-lg">
							<div className="mx-auto mb-2 h-20 w-20 bg-neutral-200 rounded-full animate-pulse" aria-hidden="true" />
							<p className="text-sm font-medium text-neutral-800">{metric}</p>
							<p className="text-xs text-neutral-500">{VALUES[index]}</p>
						</div>
					))}
				</div>
			</div>
			<div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
				<h4 className="text-lg font-semibold text-neutral-900 mb-4">Recent Alerts</h4>
				<div className="space-y-3">
					<Alert
						icon="fa-exclamation-triangle"
						color="status-yellow"
						title="High Memory Usage"
						description='Agent analyzer-03 at 89%'
						timestamp="5 minutes ago"
					/>
					<Alert
						icon="fa-info-circle"
						color="status-blue"
						title="Deployment Complete"
						description="Version 2.1.3 deployed"
						timestamp="12 minutes ago"
					/>
					<Alert
						icon="fa-check-circle"
						color="status-green"
						title="Backup Completed"
						description="Database backup successful"
						timestamp="1 hour ago"
					/>
				</div>
			</div>
		</div>
	);
}

interface AlertProps {
	icon: string;
	color: 'status-yellow' | 'status-blue' | 'status-green';
	title: string;
	description: string;
	timestamp: string;
}

function Alert({ icon, color, title, description, timestamp }: AlertProps): React.ReactElement {
	const background = {
		'status-yellow': 'bg-status-yellow-bg',
		'status-blue': 'bg-status-blue-bg',
		'status-green': 'bg-status-green-bg',
	}[color];
	const iconColor = {
		'status-yellow': 'text-status-yellow',
		'status-blue': 'text-status-blue',
		'status-green': 'text-status-green',
	}[color];

	return (
		<div className={`flex items-start gap-3 p-3 rounded-lg ${background}`}>
			<i className={`fa-solid ${icon} ${iconColor} mt-1`} aria-hidden="true" />
			<div className="flex-1">
				<p className="text-sm font-medium text-neutral-900">{title}</p>
				<p className="text-xs text-neutral-600">{description}</p>
				<p className="text-xs text-neutral-500 mt-1">{timestamp}</p>
			</div>
		</div>
	);
}
