import { expect, test } from 'vitest';
import { OAuthSchema, TransportsSchema } from './types.js';

test('OAuthSchema requires fields for oauth2', () => {
  const result = OAuthSchema.safeParse({ authType: 'oauth2' });
  expect(result.success).toBe(false);
});

test('TransportsSchema enforces at least one transport and https', () => {
  expect(TransportsSchema.safeParse({}).success).toBe(false);
  expect(
    TransportsSchema.safeParse({ sse: { url: 'https://example.com' } }).success
  ).toBe(true);
});
