import { describe, expect, it } from 'vitest';
import { SchemaRegistry } from '../src/index.js';

describe('SchemaRegistry Unit Tests', () => {
  it('should create registry instance with default options', () => {
    const registry = new SchemaRegistry();
    expect(registry).toBeDefined();
  });

  it('should start and stop server', () => {
    const registry = new SchemaRegistry({ port: 0 });
    const server = registry.start();
    expect(server).toBeDefined();
    server.close();
  });

  it('validateEvent should return false without $id', () => {
    const registry = new SchemaRegistry();
    const result = (registry as any).validateEvent({}, {});
    expect(result).toBe(false);
  });

  it('validateEvent should return false on compilation failure', () => {
    const registry = new SchemaRegistry();
    const badSchema = { $id: 'bad', type: 'object', required: 'oops' } as any;
    const result = (registry as any).validateEvent({}, badSchema);
    expect(result).toBe(false);
  });

  it('getAvailableSchemas handles missing contracts path', async () => {
    const registry = new SchemaRegistry({ contractsPath: '/no/such/path' });
    const result = await (registry as any).getAvailableSchemas();
    expect(result).toEqual([]);
  });

  it('getSchemaById returns null for missing contracts path', async () => {
    const registry = new SchemaRegistry({ contractsPath: '/no/such/path' });
    const result = await (registry as any).getSchemaById('missing');
    expect(result).toBeNull();
  });

  it('should create registry with custom options', () => {
    const registry = new SchemaRegistry({
      port: 4000,
      contractsPath: '/custom/path',
    });
    expect(registry).toBeDefined();
  });
});
