import { z } from 'zod';
import { AgentConfigSchema, RAGQuerySchema } from '@cortex-os/contracts';
import { createInMemoryStore, createStdOutput, createJsonOutput } from '@cortex-os/lib';
import { StructuredError } from '@cortex-os/lib';

const InputSchema = z.object({ config: AgentConfigSchema, query: RAGQuerySchema, json: z.boolean().optional() });
export type RAGInput = z.infer<typeof InputSchema>;

export async function handleRAG(input: unknown): Promise<string> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    const err = new StructuredError('INVALID_INPUT', 'Invalid RAG input', { issues: parsed.error.issues });
    return createJsonOutput({ error: err.toJSON() });
  }
  const { config, query, json } = parsed.data;
  const memory = createInMemoryStore({ maxItems: config.memory.maxItems, maxBytes: config.memory.maxBytes });
  // Placeholder retrieval result (actual MLX integration in Python package)
  const results = Array.from({ length: query.topK }).map((_, i) => ({ id: i + 1, score: 1 - i * 0.1 }));
  memory.set('lastQuery', query);
  if (json) return createJsonOutput({ results });
  return createStdOutput(`RAG results count=${results.length}`);
}

export default { handleRAG };
