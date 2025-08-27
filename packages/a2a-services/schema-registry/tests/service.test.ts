import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createService } from '../src/service';
import { createEnvelope } from '@cortex-os/a2a-contracts/envelope';
import type { Server } from 'http';
import fetch from 'node-fetch';

describe('Schema Registry Service', () => {
  let app: Express.Application;
  let server: Server;

  beforeAll(() => {
    app = createService();
    server = app.listen(3001);
  });

  afterAll(() => {
    server.close();
  });

  it('should register a schema and create an envelope with it', async () => {
    const schema = {
      id: 'test-schema',
      name: 'test-schema',
      version: '1.0.0',
      schema: {
        type: 'object',
        properties: {
          foo: { type: 'string' },
        },
      },
    };

    const response = await fetch('http://localhost:3001/schemas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schema),
    });

    expect(response.status).toBe(201);
    const { location } = await response.json();
    expect(location).toBe('/schemas/test-schema/1.0.0');

    const envelope = createEnvelope({
      type: 'test-event',
      source: 'http://example.com/test',
      data: { foo: 'bar' },
      schemaName: 'test-schema',
      schemaVersion: '1.0.0',
    });

    expect(envelope.dataschema).toBe('http://example.com/schemas/test-schema/1.0.0');
  });
});
