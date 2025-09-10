import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createASBRServer, type ASBRServer } from '../../src/api/server.js';

let server: ASBRServer;

beforeAll(async () => {
  server = createASBRServer({ port: 0, host: '127.0.0.1' });
  await server.start();
});

afterAll(async () => {
  await server.stop();
});

describe('structured errors', () => {
  it('includes code on auth failure', async () => {
    const res = await request(server.app).post('/v1/tasks').send({});
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: expect.any(String), code: expect.any(String) });
  });
});
