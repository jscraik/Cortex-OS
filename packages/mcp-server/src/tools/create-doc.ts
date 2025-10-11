import { oauth2Scheme } from '@cortex-os/mcp-auth';
import type { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { createBrandedLog } from '../utils/brand.js';

export function registerCreateDocTool(server: FastMCP, logger: any) {
	server.addTool({
		name: 'docs.create',
		description: 'Generate a Markdown document from title, body, and optional summary.',
		parameters: z.object({
			title: z.string().min(3).max(120),
			body: z.string().min(10),
			summary: z.string().optional(),
		}),
		annotations: {
			readOnlyHint: false,
			title: 'brAInwav Create Document',
			idempotentHint: false,
		},
		securitySchemes: [oauth2Scheme(['docs.write'])],
		async execute(args) {
			logger.info(
				createBrandedLog('docs_create_execute', { title: args.title }),
				'Composing document payload',
			);
			const summaryBlock = args.summary ? `\n\n> Summary: ${args.summary}` : '';
			const content = `# ${args.title}\n\n${args.body}${summaryBlock}`;
			return JSON.stringify(
				{
					title: args.title,
					content,
					length: content.length,
				},
				null,
				2,
			);
		},
	});
}
