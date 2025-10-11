import type { ReactElement } from 'react';

import { useConnectorState } from '../hooks/useConnectorState';
import type { ConnectorServiceEntry } from '../sdk/types';

function formatTimestamp(timestamp?: string): string {
	if (!timestamp) {
		return 'unknown';
	}
	try {
		const date = new Date(timestamp);
		return date.toLocaleString(undefined, { hour12: false });
	} catch {
		return timestamp;
	}
}

function formatTtl(ttlSeconds?: number): string {
	if (!ttlSeconds) {
		return 'unknown';
	}
	const minutes = Math.max(ttlSeconds / 60, 0);
	if (minutes >= 1) {
		return `${minutes.toFixed(1)} minutes`;
	}
	return `${ttlSeconds}s`;
}

function ConnectorStatusBadge({ enabled }: { enabled: boolean }): ReactElement {
	const label = enabled ? 'Enabled' : 'Disabled';
	const tone = enabled ? 'status-enabled' : 'status-disabled';
	return (
		<span role="status" aria-live="polite" className={`connector-status ${tone}`}>
			{label}
		</span>
	);
}

function MetadataList({ metadata }: { metadata?: Record<string, unknown> }): ReactElement | null {
	if (!metadata) {
		return null;
	}
	const entries = Object.entries(metadata).filter(([key]) => key !== 'brand');
	if (entries.length === 0) {
		return null;
	}

	return (
		<div className="connector-section">
			<h3>Metadata</h3>
			<dl>
				{entries.map(([key, value]) => (
					<div key={key} className="connector-meta">
						<dt>{key}</dt>
						<dd>{String(value)}</dd>
					</div>
				))}
			</dl>
		</div>
	);
}

function ScopeList({ scopes }: { scopes: string[] }): ReactElement | null {
	if (scopes.length === 0) {
		return null;
	}
	return (
		<div className="connector-section">
			<h3>Scopes</h3>
			<ul>
				{scopes.map((scope) => (
					<li key={scope}>
						<code>{scope}</code>
					</li>
				))}
			</ul>
		</div>
	);
}

function TagList({ tags }: { tags?: string[] }): ReactElement | null {
	if (!tags || tags.length === 0) {
		return null;
	}
	return (
		<div className="connector-section">
			<h3>Tags</h3>
			<ul>
				{tags.map((tag) => (
					<li key={tag}>
						<code>{tag}</code>
					</li>
				))}
			</ul>
		</div>
	);
}

function ConnectorCard({ connector }: { connector: ConnectorServiceEntry & { status: string } }): ReactElement {
	const { auth, quotas, headers, description } = connector;
	return (
		<article aria-labelledby={`connector-${connector.id}`} className="connector-card">
			<header>
				<h2 id={`connector-${connector.id}`}>{connector.displayName}</h2>
				<ConnectorStatusBadge enabled={connector.enabled} />
			</header>
			{description && <p>{description}</p>}
			<dl className="connector-details">
				<div>
					<dt>Version</dt>
					<dd>{connector.version}</dd>
				</div>
				<div>
					<dt>Endpoint</dt>
					<dd>
						<code>{connector.endpoint}</code>
					</dd>
				</div>
				<div>
					<dt>Auth</dt>
					<dd>
						{auth.type}
						{auth.headerName ? ` (${auth.headerName})` : ''}
					</dd>
				</div>
				<div>
					<dt>TTL</dt>
					<dd>{connector.ttlSeconds}s</dd>
				</div>
			</dl>

			{quotas && (
				<div className="connector-section">
					<h3>Quotas</h3>
					<ul>
						{Object.entries(quotas).map(([key, value]) => (
							<li key={key}>
								<code>{key}</code>: {value}
							</li>
						))}
					</ul>
				</div>
			)}

			{headers && Object.keys(headers).length > 0 && (
				<div className="connector-section">
					<h3>Headers</h3>
					<ul>
						{Object.entries(headers).map(([key, value]) => (
							<li key={key}>
								<code>{key}</code>: <span aria-label={`${key} header value`}>{value}</span>
							</li>
						))}
					</ul>
				</div>
			)}

			<ScopeList scopes={connector.scopes} />
			<TagList tags={connector.tags} />
			<MetadataList metadata={connector.metadata} />
		</article>
	);
}

export function ConnectorDashboard(): ReactElement {
	const { connectors, loading, error, refresh, serviceMap } = useConnectorState();

	if (loading) {
		return <p aria-live="polite">Loading connectors…</p>;
	}

	if (error) {
		return (
			<div role="alert" className="connector-error">
				<h2>Unable to load connectors</h2>
				<p>{error.message}</p>
				<button type="button" onClick={refresh}>
					Retry
				</button>
			</div>
		);
	}

	return (
		<section aria-live="polite" className="connector-dashboard">
			<header>
				<h1>{serviceMap?.brand ?? 'brAInwav'} Connectors</h1>
				<p>
					Generated at: <time dateTime={serviceMap?.generatedAt}>{formatTimestamp(serviceMap?.generatedAt)}</time>
				</p>
				{serviceMap?.ttlSeconds !== undefined && (
					<p>Refresh TTL: {formatTtl(serviceMap.ttlSeconds)}</p>
				)}
				{serviceMap?.signature && (
					<p>
						Signature:{' '}
						<code title={serviceMap.signature}>
							{serviceMap.signature.slice(0, 12)}
							…
						</code>
					</p>
				)}
				<button type="button" onClick={refresh}>
					Refresh
				</button>
			</header>

			{connectors.length === 0 ? (
				<p>No connectors available in the current manifest.</p>
			) : (
				<ul className="connector-list">
					{connectors.map((connector) => (
						<li key={connector.id}>
							<ConnectorCard connector={connector} />
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

