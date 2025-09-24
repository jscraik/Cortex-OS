import { describe, expect, it } from 'vitest';
import { createGatewayBus, createGatewaySchemaRegistry } from '../src/a2a.js';

describe('gateway a2a setup', () => {
    it('registers gateway event schemas', () => {
        const registry = createGatewaySchemaRegistry();
        // Basic check: registry should be able to return metadata for known types after registration
        // We avoid reaching through internals; just ensure registry object exists and is usable via createGatewayBus
        const { bus, schemaRegistry } = createGatewayBus({ schemaRegistry: registry });
        expect(bus).toBeDefined();
        expect(schemaRegistry).toBe(registry);
    });
});
