import type { ConnectorEntry } from '@cortex-os/protocol';

export interface NormalizedTool {
	originalName: string;
	normalizedName: string;
	tags: string[];
	scopes: string[];
}

const WIKIDATA_TOOL_MAPPINGS: Record<string, string> = {
	vector_search_items: 'vector_search_items',
	vector_search_properties: 'vector_search_properties',
	get_entity_claims: 'get_claims',
	get_claims: 'get_claims',
	execute_sparql: 'sparql',
	sparql: 'sparql',
};

export function normalizeWikidataToolName(
	toolName: string,
	connectorId: string,
	entry: ConnectorEntry,
): NormalizedTool {
	if (connectorId !== 'wikidata') {
		return {
			originalName: toolName,
			normalizedName: `${connectorId}.${toolName}`,
			tags: [],
			scopes: entry.scopes,
		};
	}

	const canonical = WIKIDATA_TOOL_MAPPINGS[toolName] ?? toolName;
	const normalizedName = `wikidata.${canonical}`;

	const metadataTools = Array.isArray((entry.metadata as { tools?: unknown })?.tools)
		? ((entry.metadata as { tools?: Array<{ name: string; tags?: string[]; scopes?: string[] }> })
			.tools ?? [])
		: [];

	const remoteTool = metadataTools.find((tool) => tool.name === canonical);

	return {
		originalName: toolName,
		normalizedName,
		tags: remoteTool?.tags ?? [],
		scopes: remoteTool?.scopes ?? entry.scopes,
	};
}
