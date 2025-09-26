import { describe, expect, it } from 'vitest';

import { createCodeAnalysisAgent } from '../../src/agents/CodeAnalysisAgent.js';

const agent = createCodeAnalysisAgent();

describe('CodeAnalysisAgent speed analysis', () => {
    it('flags nested loops and blocking calls', async () => {
        const result = await agent.analyze({
            code: `
				for (let i = 0; i < items.length; i++) {
					for (let j = 0; j < items[i].length; j++) {
						fs.readFileSync('/tmp/data.json');
					}
				}
			`,
            analysisType: 'speed',
            strictness: 'medium',
        });

        expect(result.issues.some((issue) => issue.type === 'nested-loop')).toBe(true);
        expect(result.issues.some((issue) => issue.type === 'performance')).toBe(true);
        expect(result.metrics.speedScore).toBeLessThan(10);
        expect(result.summary).toContain('Speed analysis');
    });

    it('returns full score for simple operations', async () => {
        const result = await agent.analyze({
            code: `
				const values = items.map((item) => item.id);
				console.log(values);
			`,
            analysisType: 'speed',
            strictness: 'medium',
        });

        expect(result.issues).toHaveLength(0);
        expect(result.metrics.speedScore).toBe(10);
    });
});
