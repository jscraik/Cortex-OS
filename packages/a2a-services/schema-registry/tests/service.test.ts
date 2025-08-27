import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Express } from 'express';
import type { Server } from 'http';
import { createService } from '../src/service';
import { createEnvelope } from '@cortex-os/a2a-contracts/envelope';

let app: Express;
let server: Server;
let baseUrl: string;

beforeEach(() => {
  app = createService();
  server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  baseUrl = `http://localhost:${port}`;
});

afterEach(() => {
  server.close();
});

describe('Schema Registry Service', () => {
  it('registers a schema and creates an envelope', async () => {
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

    const response = await fetch(`${baseUrl}/schemas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schema),
    });

    expect(response.status).toBe(201);
    const { location } = (await response.json()) as { location: string };
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

  it('rejects invalid schemas', async () => {
    const invalid = { id: 'bad-schema' }; // missing required fields
    const res = await fetch(`${baseUrl}/schemas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalid),
    });
    expect(res.status).toBe(400);
  });

  it('prevents duplicate schema submissions', async () => {
    const schema = {
      id: 'dup',
      name: 'dup',
      version: '1.0.0',
      schema: {},
    };
    const first = await fetch(`${baseUrl}/schemas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schema),
    });
    expect(first.status).toBe(201);
    const second = await fetch(`${baseUrl}/schemas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schema),
    });
    expect(second.status).toBe(409);
  });

  it('returns the latest schema by semantic version', async () => {
    const v1 = { id: 'latest', name: 'latest', version: '1.9.0', schema: {} };
    const v2 = { id: 'latest', name: 'latest', version: '1.10.0', schema: {} };
    const r1 = await fetch(`${baseUrl}/schemas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(v1),
    });
    expect(r1.status).toBe(201);
    const r2 = await fetch(`${baseUrl}/schemas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(v2),
    });
    expect(r2.status).toBe(201);

    const res = await fetch(`${baseUrl}/schemas/latest/latest`);
    expect(res.status).toBe(200);
    const schema = (await res.json()) as { version: string };
    expect(schema.version).toBe('1.10.0');
  });
});
