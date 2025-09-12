/**
 * Contract Test: RegistryIndexSchema
 * Ensures stability and validation guarantees for registry index contract.
 * - Valid sample passes and preserves expected fields.
 * - Missing required field (servers) fails.
 * - Invalid server entry shape fails.
 */

import { RegistryIndexSchema } from '@cortex-os/mcp-registry';
import { describe, expect, it } from 'vitest';

function expectParseFailure(value: unknown) {
    expect(() => RegistryIndexSchema.parse(value)).toThrow();
}

// Sample valid registry index (minimal viable)
const validRegistry = {
    updatedAt: '2025-09-12T00:00:00.000Z',
    servers: [
        {
            id: 'example-server',
            name: 'Example Server',
            description: 'Demo server',
            transports: {
                stdio: { command: 'example', args: ['--flag'] },
            },
            tags: ['demo'],
        },
    ],
};

describe('contract: RegistryIndexSchema', () => {
    it('accepts a valid registry index (round-trip)', () => {
        const parsed = RegistryIndexSchema.parse(validRegistry);
        expect(parsed.updatedAt).toBe(validRegistry.updatedAt);
        expect(parsed.servers.length).toBe(1);
        expect(parsed.servers[0].id).toBe('example-server');
    });

    it('rejects missing required field (servers)', () => {
        const bad: unknown = { updatedAt: '2025-09-12T00:00:00.000Z' };
        expectParseFailure(bad);
    });

    it('rejects invalid server entry shape', () => {
        const bad: unknown = {
            updatedAt: '2025-09-12T00:00:00.000Z',
            servers: [
                {
                    id: 123, // invalid type
                    name: 'Broken',
                    transports: {},
                },
            ],
        };
        expectParseFailure(bad);
    });
});
