import { z } from 'zod';

const GrantSchema = z.object({
  actions: z.array(z.string()),
  rate: z.object({ perMinute: z.number() }),
  rules: z.object({
    allow_embeddings: z.boolean(),
    allow_rerank: z.boolean(),
    allow_chat: z.boolean(),
  }),
});

export type Grant = z.infer<typeof GrantSchema>;

const GRANTS: Record<string, Grant> = {
  'model-gateway': {
    actions: ['embeddings', 'rerank', 'chat'],
    rate: { perMinute: 60 },
    rules: {
      allow_embeddings: true,
      allow_rerank: true,
      allow_chat: true,
    },
  },
};

export async function loadGrant(service: string): Promise<Grant> {
  const grant = GRANTS[service];
  if (!grant) throw new Error(`No grant found for service ${service}`);
  return GrantSchema.parse(grant);
}

export function enforce(
  grant: Grant,
  operation: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _data: unknown,
): void {
  if (!(grant.rules as Record<string, boolean>)[`allow_${operation}`]) {
    throw new Error(`Operation ${operation} not allowed by policy`);
  }
}
