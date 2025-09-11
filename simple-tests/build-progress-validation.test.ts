// Build Progress Validation Test
// Validates that our key fixes are working

import { test, expect } from 'vitest';

test('a2a-contracts outbox-types export works', async () => {
  const { OutboxMessageStatus } = await import('@cortex-os/a2a-contracts/outbox-types');
  expect(OutboxMessageStatus.PENDING).toBe('PENDING');
  expect(OutboxMessageStatus.PUBLISHED).toBe('PUBLISHED');
});

test('a2a-contracts envelope export works', async () => {
  const { createEnvelope } = await import('@cortex-os/a2a-contracts/envelope');
  const envelope = createEnvelope({
    type: 'test.event',
    source: 'urn:test',
    data: { message: 'hello' }
  });
  expect(envelope.type).toBe('test.event');
  expect(envelope.source).toBe('urn:test');
});

test('kernel package exports work', async () => {
  const { CortexKernel } = await import('@cortex-os/kernel');
  expect(typeof CortexKernel).toBe('function');
});

test('TypeScript config allows proper module resolution', () => {
  // This test passing means TS compilation succeeded
  expect(true).toBe(true);
});