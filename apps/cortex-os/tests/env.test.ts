import { expect, test } from 'vitest';
import { z } from 'zod';

test('env schema validation', () => {
  const schema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    PORT: z.string().regex(/^\d+$/).transform(Number).optional(),
  });

  const env = {
    NODE_ENV: process.env.NODE_ENV ?? 'test',
    PORT: process.env.PORT,
  };

  const parsed = schema.parse(env);
  expect(parsed.NODE_ENV).toBeTruthy();
});
