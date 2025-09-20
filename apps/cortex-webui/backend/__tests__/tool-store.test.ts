import { afterEach, describe, expect, test, vi } from 'vitest';
import { addToolEvent, getToolEvents, redactArgs } from '../src/utils/tool-store.js';

describe('tool-store', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('adds tool events and redacts sensitive arguments', () => {
    const sessionId = `session-${Math.random()}`;
    const event = addToolEvent(sessionId, {
      name: 'fetch-secret',
      status: 'start',
      args: {
        apiKey: 'super-secret-value',
        nested: {
          token: 'another-secret',
          note: 'Bearer my-auth-token',
        },
        email: 'user@example.com',
        safe: 'value',
      },
    });

    expect(event.id).toBeTruthy();
    expect(event.createdAt).toBeTruthy();
    expect(event.args).toEqual({
      apiKey: '[REDACTED]',
      nested: {
        token: '[REDACTED]',
        note: 'Bearer [REDACTED]',
      },
      email: '[EMAIL]',
      safe: 'value',
    });

    const stored = getToolEvents(sessionId);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ name: 'fetch-secret', status: 'start' });
  });

  test('redactArgs handles circular references safely', () => {
    const parent: Record<string, unknown> = { secret: 'value', child: {} };
    (parent.child as Record<string, unknown>) = parent;

    const redacted = redactArgs(parent);
    expect(redacted.secret).toBe('[REDACTED]');
    expect(redacted.child).toBe('[Circular]');
  });
});
