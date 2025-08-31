import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z, ZodType } from 'zod';

const CommonQuery = z.object({ json: z.coerce.boolean().optional() });

export function createAgentRoute<T extends ZodType<any, any>>(
  app: FastifyInstance,
  path: string,
  schema: T,
  handler: (input: z.infer<T>) => Promise<unknown>,
) {
  app.post(path, async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body ?? {}) as unknown;
    const query = CommonQuery.safeParse(req.query);
    const json = query.success ? query.data.json : false;
    const parsed = schema.safeParse({ ...(body as object), json });
    const out = await handler(parsed.success ? parsed.data : body);
    reply.header('content-type', json ? 'application/json' : 'text/plain');
    return out;
  });
}
