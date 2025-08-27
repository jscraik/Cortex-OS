import { z } from 'zod';

const GrantSchema = z.object({
  actions: z.array(z.string()),
  rate: z.object({ perMinute: z.number() }),
  rules: z.object({
    allow_embeddings: z.boolean(),
    allow_rerank: z.boolean(),
    allow_chat: z.boolean(),
    allow_frontier: z.boolean().optional(),
    require_hitl_for_frontier: z.boolean().optional(),
    allowed_frontier_vendors: z.array(z.string()).optional(),
  }),
});

export type Grant = z.infer<typeof GrantSchema>;

const GRANTS: Record<string, Grant> = {
  'model-gateway': {
    actions: ['embeddings', 'rerank', 'chat', 'frontier'],
    rate: { perMinute: 60 },
    rules: {
      allow_embeddings: true,
      allow_rerank: true,
      allow_chat: true,
      allow_frontier: false,
      require_hitl_for_frontier: true,
      allowed_frontier_vendors: ['openai', 'anthropic'],
    },
  },
};

export async function loadGrant(service: string): Promise<Grant> {
  const grant = GRANTS[service];
  if (!grant) throw new Error(`No grant found for service ${service}`);
  return GrantSchema.parse(grant);
}

export function enforce(grant: Grant, operation: string, _data: any): void {
  if (!(grant.rules as any)[`allow_${operation}`]) {
    throw new Error(`Operation ${operation} not allowed by policy`);
  }
}
