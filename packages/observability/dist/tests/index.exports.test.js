import { describe, expect, expectTypeOf, it } from 'vitest';
import { observabilityMcpTools, } from '../src/index.js';
describe('observability public index', () => {
    it('re-exports MCP tool contract and input types', () => {
        expectTypeOf().toBeObject();
        expectTypeOf().toBeObject();
        expectTypeOf().toBeObject();
        expectTypeOf().toBeObject();
        expectTypeOf().toBeObject();
        expectTypeOf().toBeObject();
    });
    it('exposes observability MCP tools for runtime usage', () => {
        expect(Array.isArray(observabilityMcpTools)).toBe(true);
    });
});
//# sourceMappingURL=index.exports.test.js.map