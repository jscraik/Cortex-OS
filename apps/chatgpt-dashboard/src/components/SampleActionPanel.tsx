import * as React from 'react';

import {
	allSampleActions,
	getSampleActions,
	type SampleActionDefinition,
} from '../config/sampleActions';
import type { ConnectorCard } from '../hooks/useConnectorState';
import { useSampleConnectorAction } from '../hooks/useSampleConnectorAction';

interface SampleActionPanelProps {
	readonly connectors: ConnectorCard[];
}

const buildFallbackAction = (connector: ConnectorCard): SampleActionDefinition => ({
	id: `${connector.id}-status`,
	connectorId: connector.id,
	label: `Inspect ${connector.displayName}`,
	description: 'Fetches a branded status preview using the connectors manifest.',
	action: 'status',
	payload: {
		endpoint: connector.endpoint,
		scopes: connector.scopes,
		tags: connector.tags,
	},
});

const findActionById = (
	definitions: SampleActionDefinition[],
	actionId: string | null,
): SampleActionDefinition | undefined =>
	definitions.find((definition) => definition.id === actionId);

export function SampleActionPanel({
	connectors,
}: SampleActionPanelProps): React.ReactElement | null {
	const availability = React.useMemo<SampleActionDefinition[]>(() => {
		if (connectors.length === 0) {
			return [];
		}

		const defined = new Map<string, SampleActionDefinition>();
		for (const connector of connectors) {
			const actions = getSampleActions(connector.id);
			if (actions.length === 0) {
				const fallback = buildFallbackAction(connector);
				defined.set(fallback.id, fallback);
				continue;
			}
			for (const action of actions) {
				defined.set(action.id, action);
			}
		}
		return Array.from(defined.values());
	}, [connectors]);

	const { loading, result, error, runSample, reset, lastAction } = useSampleConnectorAction();
	const headingId = React.useId();
	const [selectedActionId, setSelectedActionId] = React.useState<string | null>(null);

	React.useEffect(() => {
		if (availability.length === 0) {
			setSelectedActionId(null);
			return;
		}
		if (!selectedActionId || !findActionById(availability, selectedActionId)) {
			setSelectedActionId(availability[0].id);
		}
	}, [availability, selectedActionId]);

	if (connectors.length === 0) {
		return null;
	}

	const selectedAction = selectedActionId
		? findActionById(availability, selectedActionId)
		: undefined;
	const canRun = Boolean(selectedAction) && !loading;

	const handleRun = async () => {
		if (!selectedAction) return;
		await runSample({
			connectorId: selectedAction.connectorId,
			action: selectedAction.action,
			payload: selectedAction.payload,
		});
	};

	const inspectorLink = selectedAction
		? allSampleActions().find((action) => action.id === selectedAction.id)?.payload
		: undefined;

	return (
		<section
			className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6 space-y-4"
			aria-labelledby={headingId}
		>
			<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
				<div>
					<h3 id={headingId} className="text-xl font-semibold text-neutral-900">
						Sample Tool Invocations
					</h3>
					<p className="text-sm text-neutral-600">
						Trigger representative calls against available connectors without leaving ChatGPT.
					</p>
				</div>
				<div className="flex flex-col sm:flex-row sm:items-center gap-3">
					<label className="flex flex-col text-sm text-neutral-600">
						<span className="font-medium text-neutral-700 mb-1">Choose a sample action</span>
						<select
							className="border border-neutral-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
							value={selectedActionId ?? ''}
							onChange={(event) => setSelectedActionId(event.target.value)}
						>
							{availability.map((action) => (
								<option key={action.id} value={action.id}>
									{action.label}
								</option>
							))}
						</select>
					</label>
					<button
						type="button"
						onClick={handleRun}
						disabled={!canRun}
						className={`px-4 py-2 rounded-lg text-sm font-medium transition ${canRun ? 'bg-brand-accent text-white hover:bg-brand-accent/90' : 'bg-neutral-200 text-neutral-500 cursor-not-allowed'}`}
					>
						{loading ? 'Running…' : 'Run Sample'}
					</button>
					<button
						type="button"
						onClick={reset}
						disabled={loading && !result && !error}
						className="px-4 py-2 rounded-lg border border-neutral-300 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
					>
						Reset
					</button>
				</div>
			</div>

			{selectedAction && (
				<p className="text-sm text-neutral-600" role="note">
					{selectedAction.description}
				</p>
			)}

			{error && (
				<div
					className="bg-status-red-bg border border-status-red text-status-red rounded-lg px-4 py-3"
					role="alert"
				>
					<p className="font-medium">Sample invocation failed</p>
					<p className="text-sm">{error}</p>
				</div>
			)}

			{result && (
				<div
					className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 space-y-3"
					aria-live="polite"
				>
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
						<p className="text-sm text-neutral-600">
							<strong className="text-neutral-900">Connector:</strong> {result.connectorId} ·{' '}
							<strong className="text-neutral-900">Action:</strong> {result.action}
						</p>
						<p className="text-xs text-neutral-500 font-mono">{result.timestamp}</p>
					</div>
					<p className="text-sm text-neutral-700">{result.summary}</p>
					{result.sample && (
						<pre className="bg-white border border-neutral-200 rounded-lg p-4 text-xs text-neutral-700 overflow-x-auto">
							{JSON.stringify(result.sample, null, 2)}
						</pre>
					)}
					{result.metadata && (
						<details className="bg-white/60 border border-dashed border-neutral-200 rounded-lg p-3 text-xs text-neutral-600">
							<summary className="cursor-pointer text-sm text-neutral-700 font-medium">
								Response metadata
							</summary>
							<pre className="mt-2 whitespace-pre-wrap break-all text-xs text-neutral-600">
								{JSON.stringify(result.metadata, null, 2)}
							</pre>
						</details>
					)}
					{lastAction && (
						<p className="text-xs text-neutral-500">
							Last input payload: <code>{JSON.stringify(lastAction.payload)}</code>
						</p>
					)}
				</div>
			)}

			{!result && !error && (
				<p className="text-xs text-neutral-500" aria-live="polite">
					Outputs appear here after you run a sample action.
				</p>
			)}

			{inspectorLink && (
				<p className="text-xs text-neutral-400">
					Tip: Use the MCP Inspector with payload <code>{JSON.stringify(inspectorLink)}</code> for
					deeper debugging.
				</p>
			)}
		</section>
	);
}
