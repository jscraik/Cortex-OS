/**
 * Codebase Tools Module
 *
 * Codebase search and file listing tools extracted from
 * the main index file for better modularity.
 */

import { withSpan } from '@cortex-os/mcp-bridge/runtime/telemetry/tracing';
import { noAuthScheme, oauth2Scheme } from '@cortex-os/mcp-auth';
import { execa } from 'execa';
import type { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { createBrandedLog } from '../utils/brand.js';
import { loadServerConfig } from '../utils/config.js';

/**
 * Register all codebase tools with the server
 */
export function registerCodebaseTools(server: FastMCP, logger: any) {
	const config = loadServerConfig();
	const CODEBASE_ROOT = process.env.CODEBASE_ROOT || process.cwd();

	const runTool = async <T>(toolName: string, execute: () => Promise<T>) => {
		return withSpan(`mcp.tool.${toolName}`, { 'mcp.tool': toolName }, execute);
	};

	if (!config.codebaseSearchEnabled) {
		logger.info(createBrandedLog('codebase_tools_disabled'), 'Codebase tools disabled');
		return;
	}

	// Codebase Search Tool
	server.addTool({
		name: 'codebase.search',
		description: 'Search codebase using ripgrep for patterns or snippets',
		parameters: z.object({
			pattern: z.string().describe('Search pattern or regex'),
			path: z.string().optional().describe('Optional path within repo'),
			fileType: z.string().optional().describe('Optional file extension filter'),
			ignoreCase: z.boolean().optional().default(false).describe('Case-insensitive search'),
			maxResults: z.number().optional().default(50).describe('Maximum number of results'),
		}),
		annotations: {
			readOnlyHint: true,
			idempotentHint: true,
			title: 'brAInwav Codebase Search',
		},
		securitySchemes: [noAuthScheme(), oauth2Scheme(['search.read'])],
		async execute(args) {
			return runTool('codebase.search', async () => {
				logger.info(createBrandedLog('codebase.search', { args }), 'Searching codebase');
				const searchPath = args.path ? `${CODEBASE_ROOT}/${args.path}` : CODEBASE_ROOT;
				const rgArgs = ['--json', '--max-count', String(args.maxResults)];
				if (args.ignoreCase) rgArgs.push('--ignore-case');
				if (args.fileType) rgArgs.push('--type', args.fileType);
				rgArgs.push(args.pattern, searchPath);
				try {
					const { stdout } = await execa('rg', rgArgs, { timeout: 30_000, reject: false });
					const results = stdout
						.split('\n')
						.filter((line) => line.trim())
						.map((line) => {
							try {
								return JSON.parse(line);
							} catch {
								return null;
							}
						})
						.filter((entry) => entry?.type === 'match')
						.map((entry) => ({
							file: entry.data.path.text,
							line: entry.data.line_number,
							content: entry.data.lines.text.trim(),
						}));
					return JSON.stringify(
						{
							pattern: args.pattern,
							matches: results.length,
							results: results.slice(0, args.maxResults),
						},
						null,
						2,
					);
				} catch (error) {
					const msg = error instanceof Error ? error.message : String(error);
					logger.error(
						createBrandedLog('codebase_search_failed', { error: msg }),
						'Codebase search failed',
					);
					return JSON.stringify(
						{ error: 'Search failed', message: msg, pattern: args.pattern },
						null,
						2,
					);
				}
			});
		},
	});

	// Codebase Files Tool
	server.addTool({
		name: 'codebase.files',
		description: 'List files in the codebase matching a pattern',
		parameters: z.object({
			pattern: z.string().optional().describe('Optional filename regex'),
			path: z.string().optional().describe('Optional path within repo'),
			fileType: z.string().optional().describe('Optional file extension filter'),
			maxResults: z.number().optional().default(100).describe('Maximum number of results'),
		}),
		annotations: {
			readOnlyHint: true,
			idempotentHint: true,
			title: 'brAInwav List Files',
		},
		async execute(args) {
			return runTool('codebase.files', async () => {
				logger.info(createBrandedLog('codebase.files', { args }), 'Listing files');
				const searchPath = args.path ? `${CODEBASE_ROOT}/${args.path}` : CODEBASE_ROOT;
				const rgArgs = ['--files'];
				if (args.fileType) rgArgs.push('--type', args.fileType);
				rgArgs.push(searchPath);
				try {
					const { stdout } = await execa('rg', rgArgs, { timeout: 10_000, reject: false });
					let files = stdout.split('\n').filter((file) => file.trim());
					if (args.pattern) {
						const regex = new RegExp(args.pattern, 'i');
						files = files.filter((file) => regex.test(file));
					}
					return JSON.stringify(
						{
							path: searchPath,
							count: files.length,
							files: files.slice(0, args.maxResults),
						},
						null,
						2,
					);
				} catch (error) {
					const msg = error instanceof Error ? error.message : String(error);
					logger.error(
						createBrandedLog('file_listing_failed', { error: msg }),
						'File listing failed',
					);
					return JSON.stringify({ error: 'File listing failed', message: msg }, null, 2);
				}
			});
		},
	});

	logger.info(
		createBrandedLog('codebase_tools_enabled', { root: CODEBASE_ROOT }),
		'Codebase tools enabled',
	);
}
