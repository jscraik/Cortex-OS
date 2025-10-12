export interface SampleActionDefinition {
	readonly id: string;
	readonly connectorId: string;
	readonly label: string;
	readonly description: string;
	readonly action: string;
	readonly payload: Record<string, unknown>;
}

const SAMPLE_ACTIONS: SampleActionDefinition[] = [
	{
		id: 'perplexity-sample-query',
		connectorId: 'perplexity-search',
		label: 'Run discovery search',
		description: 'Queries Perplexity for the latest Cortex-OS status update.',
		action: 'query',
		payload: {
			query: 'brAInwav Cortex-OS connectors manifest status',
		},
	},
	{
		id: 'github-actions-dispatch',
		connectorId: 'github-actions',
		label: 'Simulate workflow dispatch',
		description: 'Dispatches a dry-run workflow for release pipelines.',
		action: 'dispatch',
		payload: {
			repository: 'brainwav/cortex-os',
			workflow: 'release.yml',
			ref: 'refs/heads/main',
			dryRun: true,
		},
	},
	{
		id: 'wikidata-entity-lookup',
		connectorId: 'wikidata',
		label: 'Lookup entity: Q42',
		description: 'Retrieves entity metadata for Douglas Adams via semantic search.',
		action: 'entityLookup',
		payload: {
			query: 'Q42',
			mode: 'semantic',
		},
	},
];

export function getSampleActions(connectorId: string): SampleActionDefinition[] {
	return SAMPLE_ACTIONS.filter((action) => action.connectorId === connectorId);
}

export function allSampleActions(): SampleActionDefinition[] {
	return SAMPLE_ACTIONS.slice();
}
