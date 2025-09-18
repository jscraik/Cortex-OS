import { z } from 'zod';
import { createTool } from './mocks/voltagent-core.js';

export const FileOperationTool = createTool({
	id: 'file-operation',
	name: 'file_operation',
	description: 'Perform file operations safely',

	parameters: z.object({
		operation: z.enum(['read', 'write', 'list', 'delete']),
		path: z.string(),
		content: z.string().optional(),
		encoding: z.enum(['utf8', 'base64']).optional().default('utf8'),
	}),

	async execute(
		params: {
			operation: 'read' | 'write' | 'list' | 'delete';
			path: string;
			content?: string;
			encoding?: 'utf8' | 'base64';
		},
		_context: unknown,
	) {
		// Mock implementation
		return {
			success: true,
			operation: params.operation,
			path: params.path,
			timestamp: new Date().toISOString(),
		};
	},
});
