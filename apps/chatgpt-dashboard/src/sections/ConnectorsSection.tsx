import * as React from 'react';

const CORE = [
	{ name: 'Database Connector', version: 'v2.1.0', endpoint: 'postgresql://prod-db:5432', ttl: '02:15', tag: 'core', status: 'Connected' },
	{ name: 'Message Queue', version: 'v1.8.2', endpoint: 'rabbitmq://mq-cluster:5672', ttl: '01:45', tag: 'core', status: 'Connected' },
	{ name: 'Redis Cache', version: 'v6.2.1', endpoint: 'redis://cache-cluster:6379', ttl: '04:22', tag: 'core', status: 'Connected' },
];

const EXTERNAL = [
	{ name: 'Slack Integration', version: 'v3.2.1', endpoint: 'slack://workspace-cortex', status: 'Disconnected', chips: ['alerts'] },
	{ name: 'AWS S3 Storage', version: 'v4.1.3', endpoint: 's3://cortex-data-bucket', ttl: '03:22', tag: 'storage', status: 'Connected' },
	{ name: 'GitHub Integration', version: 'v2.5.0', endpoint: 'github://cortex-org', ttl: '05:12', tag: 'ci/cd', status: 'Connected' },
];

export default function ConnectorsSection(): React.ReactElement {
	return (
		<div className="space-y-8">
			<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
				<h3 className="text-xl font-semibold text-neutral-900">Connector Status</h3>
				<button className="text-sm text-brand-accent font-medium flex items-center gap-2" type="button">
					Manage Connectors
					<i className="fa-solid fa-arrow-right" aria-hidden="true" />
				</button>
			</div>
			<ConnectorGroup title="Core Services" icon="fa-microchip text-brand-accent" connectors={CORE} />
			<ConnectorGroup title="Third-party Integrations" icon="fa-puzzle-piece text-purple-500" connectors={EXTERNAL} />
		</div>
	);
}

interface ConnectorItem {
	name: string;
	version: string;
	endpoint: string;
	status: 'Connected' | 'Disconnected';
	ttl?: string;
	tag?: string;
	chips?: string[];
}

interface ConnectorGroupProps {
	title: string;
	icon: string;
	connectors: ConnectorItem[];
}

function ConnectorGroup({ title, icon, connectors }: ConnectorGroupProps): React.ReactElement {
	return (
		<section aria-label={title}>
			<h4 className="text-lg font-medium text-neutral-800 mb-4 flex items-center gap-2">
				<i className={`fa-solid ${icon}`} aria-hidden="true" />
				{title}
			</h4>
			<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
				{connectors.map((connector) => (
					<article key={connector.name} className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
						<header className="flex items-start justify-between mb-4">
							<div className="flex-1">
								<h5 className="font-semibold text-neutral-900">{connector.name}</h5>
								<p className="text-sm text-neutral-600">{connector.version}</p>
								<p className="text-xs text-neutral-500 font-mono mt-1 bg-neutral-50 px-2 py-1 rounded">{connector.endpoint}</p>
							</div>
							<i className="fa-solid fa-chevron-right text-neutral-300" aria-hidden="true" />
						</header>
						<div className="flex items-center justify-between">
							<span className={`inline-flex items-center gap-2 text-sm font-medium ${connector.status === 'Connected' ? 'text-status-green' : 'text-status-red'}`}>
								<span className={`w-2 h-2 rounded-full ${connector.status === 'Connected' ? 'bg-status-green' : 'bg-status-red'}`} aria-hidden="true" />
								{connector.status}
							</span>
							<div className="flex items-center gap-2 text-xs text-neutral-500">
								{connector.ttl && (
									<span className="bg-neutral-100 px-2 py-1 rounded">TTL {connector.ttl}</span>
								)}
								{connector.tag && (
									<span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{connector.tag}</span>
								)}
								{connector.chips?.map((chip) => (
									<span key={chip} className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
										{chip}
									</span>
								))}
							</div>
						</div>
					</article>
				))}
			</div>
		</section>
	);
}
