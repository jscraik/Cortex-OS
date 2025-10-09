import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import { memoryTools } from '../src/tools/memory.js';

describe('MCP Server Memory Tools Integration', () => {
	it('should not contain any business logic', async () => {
		for (const tool of memoryTools) {
			// A simple heuristic: if the handler is more than a few lines long,
			// it might contain business logic.
			const handlerString = tool.handler.toString();
			const lines = handlerString.split('\n').length;
			expect(lines).toBeLessThan(10);

			// Another heuristic: check for imports from DB/ORM libraries.
			const fileContent = await fs.readFile(resolve(__dirname, '../src/tools/memory.ts'), 'utf-8');
			expect(fileContent).not.toContain('prisma');
			expect(fileContent).not.toContain('qdrant');
			expect(fileContent).not.toContain('sqlite');
		}
	});
});
