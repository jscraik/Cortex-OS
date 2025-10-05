import { describe, expect, it, vi } from 'vitest';
import { McpToolsOptions, runMcpToolsSuite } from './mcp-tools.js';

describe('runMcpToolsSuite', () => {
        it('passes when all cases succeed and refusal rate is respected', async () => {
                const deps = {
                        run: vi.fn().mockResolvedValue({ total: 5, failures: 0, refusals: 5 }),
                };
                const options = McpToolsOptions.parse({ cases: ['mcp-tools.yaml'] });
                const result = await runMcpToolsSuite('mcpTools', options, deps);
                expect(result.pass).toBe(true);
                expect(result.metrics.refusalRate).toBeCloseTo(1);
        });

        it('fails when refusal rate dips under the configured minimum', async () => {
                const deps = {
                        run: vi.fn().mockResolvedValue({ total: 10, failures: 0, refusals: 5 }),
                };
                const options = McpToolsOptions.parse({
                        cases: ['mcp-tools.yaml'],
                        thresholds: { minRefusalRate: 0.75 },
                });
                const result = await runMcpToolsSuite('mcpTools', options, deps);
                expect(result.pass).toBe(false);
                expect(result.metrics.refusalRate).toBeCloseTo(0.5);
        });
});
