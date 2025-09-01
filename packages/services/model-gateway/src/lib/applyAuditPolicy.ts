import type { FastifyRequest } from 'fastify';
import { auditEvent, record } from '../audit';
import { enforce, loadGrant } from '../policy';

export async function applyAuditPolicy(
  req: FastifyRequest,
  operation: 'embeddings' | 'rerank' | 'chat',
  body: unknown,
  service = 'model-gateway',
): Promise<void> {
  const grant = await loadGrant(service);
  enforce(grant, operation, body as any);
  await record(
    auditEvent(
      service,
      operation,
      {
        runId: (req.headers['x-run-id'] as string) || 'unknown',
        traceId: req.headers['x-trace-id'] as string,
      },
      body,
    ),
  );
}
