// Optional semantic search bootstrap for MCP docs. Enabled via env CORTEX_DOCS_SEMSEARCH=1.
// Consumers can import { isDocsSemsearchEnabled } to guard ingestion.

export function isDocsSemsearchEnabled(
	env: Record<string, string | undefined> = process.env,
): boolean {
	return env.CORTEX_DOCS_SEMSEARCH === '1' || env.CORTEX_DOCS_SEMSEARCH === 'true';
}

export type DocsIngestConfig = {
	enabled: boolean;
	dir: string; // default docs/
	glob: string; // default **/*.md
};

export function getDocsSemsearchConfig(
	env: Record<string, string | undefined> = process.env,
): DocsIngestConfig {
	const enabled = isDocsSemsearchEnabled(env);
	const dir = env.CORTEX_DOCS_DIR || 'docs';
	const glob = env.CORTEX_DOCS_GLOB || '**/*.md';
	return { enabled, dir, glob };
}
