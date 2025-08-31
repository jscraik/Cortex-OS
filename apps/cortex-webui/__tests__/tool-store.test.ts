import { describe, expect, it } from 'vitest';

describe('tool-store redaction', () => {
  it('redacts sensitive keys and patterns', async () => {
    const { addToolEvent, getToolEvents } = await import('../utils/tool-store');
    const sessionId = 's1';
    addToolEvent(sessionId, {
      name: 'test/tool',
      status: 'start',
      args: {
        token: 'xyz',
        password: 'secret',
        info: 'email: user@example.com',
        auth: 'Bearer abc.def',
        nested: { apiKey: '123', value: 'ok' },
        list: ['a', 'bearer xyz', 'b'],
      },
    });
    const events = getToolEvents(sessionId);
    expect(events).toHaveLength(1);
    const e = events[0] as any;
    expect(e.args.token).toBe('[REDACTED]');
    expect(e.args.password).toBe('[REDACTED]');
    expect(String(e.args.info)).not.toContain('user@example.com');
    expect(String(e.args.auth)).toContain('Bearer [REDACTED]');
    expect(e.args.nested.apiKey).toBe('[REDACTED]');
    expect(e.args.nested.value).toBe('ok');
    expect(e.args.list[1]).toContain('[REDACTED]');
  });
});
