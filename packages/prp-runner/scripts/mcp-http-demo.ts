/**
 * @file scripts/mcp-http-demo.ts
 * @description Starts the ASBR AI MCP HTTP server and prints ready-to-curl examples, including ai_search_knowledge.
 * Run with: pnpm nx run @cortex-os/prp-runner:demo:mcp -- --port 8081
 */

import chalk from 'chalk';
import { glob } from 'glob';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getDocsSemsearchConfig } from '../../../.cortex/library/mcp/semsearch';
import { ASBRAIMcpIntegration } from '../src/asbr-ai-mcp-integration.js';

type Args = { port: number };
function parse(argv: string[]): Args {
	let port = 8081;
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--port' || a === '-p') {
			const p = Number(argv[i + 1]);
			if (!Number.isNaN(p)) port = p;
		}
	}
	return { port };
}

async function main() {
	const { port } = parse(process.argv.slice(2));
	const integration = new ASBRAIMcpIntegration();
	await integration.startHTTPServer(port);

	const base = `http://127.0.0.1:${port}`;
	console.log(chalk.cyan('\nMCP HTTP demo running:'));
	console.log(`- ${chalk.green('Tools list')}: GET ${base}/mcp/tools/list`);
	console.log(`- ${chalk.green('Capabilities')}: GET ${base}/mcp/capabilities`);
	console.log(`- ${chalk.green('Health')}: GET ${base}/health`);
	console.log(`- ${chalk.green('Tool call')}: POST ${base}/mcp/tools/call`);

	// Ready-to-curl example for ai_search_knowledge
	const examplePayload = {
		method: 'tools/call',
		params: {
			name: 'ai_search_knowledge',
			arguments: { query: 'project overview', topK: 3, minSimilarity: 0.2 },
		},
	};
	console.log(chalk.magenta('\nCurl example (ai_search_knowledge):'));
	console.log(
		`curl -s ${base}/mcp/tools/call -H 'Content-Type: application/json' -d '${JSON.stringify(examplePayload)}' | jq .`,
	);

	// Optional docs ingestion if toggle is enabled
	const cfg = getDocsSemsearchConfig();
	if (cfg.enabled) {
		console.log(
			chalk.cyan('\n📖 Docs semantic search is enabled. Ingesting docs…'),
		);
		const docsRoot = path.resolve(process.cwd(), cfg.dir);
		const files = await glob(cfg.glob, {
			cwd: docsRoot,
			absolute: true,
			ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
		});
		const uniques = Array.from(new Set(files));
		const contents: string[] = [];
		const metadata: Record<string, unknown>[] = [];
		for (const f of uniques) {
			try {
				const content = await readFile(f, 'utf8');
				if (!content.trim()) continue;
				contents.push(content);
				metadata.push({ path: f });
				// id derived from relative path; not required by tool call interface
			} catch {
				// Ignore unreadable files during best-effort ingestion
			}
		}
		if (contents.length > 0) {
			const server = integration.getMcpServer();
			await server.callTool({
				method: 'tools/call',
				params: {
					name: 'ai_add_knowledge',
					arguments: { documents: contents, metadata },
				},
			});
			console.log(
				chalk.green(`Ingested ${contents.length} docs for semantic search.`),
			);
		} else {
			console.log(chalk.yellow('No docs found to ingest.'));
		}
	} else {
		console.log(
			chalk.gray(
				'\nTip: export CORTEX_DOCS_SEMSEARCH=1 to enable docs ingestion before running this demo.',
			),
		);
	}
}

main().catch((e) => {
	console.error('mcp-http-demo error:', e);
	process.exit(1);
});
