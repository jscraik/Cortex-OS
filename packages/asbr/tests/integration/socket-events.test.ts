// @vitest-environment node
import { io as Client } from 'socket.io-client';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { ASBRServer } from '../../src/api/server.js';
import { initializeXDG } from '../../src/xdg/index.js';
import { getEventManager } from '../../src/core/events.js';
import { v4 as uuidv4 } from 'uuid';
import type { Event } from '../../src/types/index.js';

describe('Socket.io event transport', () => {
  let server: ASBRServer;
  let client: ReturnType<typeof Client>;
  let port: number;

  beforeAll(async () => {
    await initializeXDG();
    server = new ASBRServer({ port: 0, host: '127.0.0.1' });
    await server.start();
    const address = (server as any).server.address();
    port = typeof address === 'object' ? address.port : 0;
    client = Client(`http://127.0.0.1:${port}`, { transports: ['websocket'] });
  });

  afterAll(async () => {
    client.close();
    await server.stop();
  });

  it('broadcasts task events to subscribed clients', async () => {
    const taskId = uuidv4();
    const subscribed = new Promise<void>((resolve) => {
      client.on('connect', () => {
        client.emit('subscribe', { taskId }, () => resolve());
      });
    });

    const eventPromise = new Promise<Event>((resolve) => {
      client.on('PlanStarted', (event: Event) => resolve(event));
    });

    await subscribed;
    const manager = await getEventManager();
    await manager.emitEvent({
      id: uuidv4(),
      type: 'PlanStarted',
      taskId,
      timestamp: new Date().toISOString(),
    });

    const event = await eventPromise;
    expect(event.taskId).toBe(taskId);
  });
});
