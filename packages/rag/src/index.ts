import { z } from 'zod';
import { AgentConfigSchema, RAGQuerySchema } from '@cortex-os/contracts';
import { createInMemoryStore, createStdOutput, createJsonOutput, StructuredError } from '@cortex-os/lib';
import { createModelRouter } from '@cortex-os/model-gateway';

const InputSchema = z.object({ config: AgentConfigSchema, query: RAGQuerySchema, json: z.boolean().optional() });
export type RAGInput = z.infer<typeof InputSchema>;

const router = createModelRouter();
let routerReady = false;
async function ensureRouter() {
  if (!routerReady) {
    await router.initialize();
    routerReady = true;
  }
}

export async function handleRAG(input: unknown): Promise<string> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    const err = new StructuredError('INVALID_INPUT', 'Invalid RAG input', { issues: parsed.error.issues });
    return createJsonOutput({ error: err.toJSON() });
  }
  const { config, query, json } = parsed.data;
  await ensureRouter();
  const memory = createInMemoryStore({ maxItems: config.memory.maxItems, maxBytes: config.memory.maxBytes });
  const { embedding, model } = await router.generateEmbedding({ text: query.query });
  const results = embedding
    .slice(0, query.topK)
    .map((score, i) => ({ id: i + 1, score }));
  memory.set('lastQuery', query);
  const payload = { results, model };
  return json ? createJsonOutput(payload) : createStdOutput(`RAG results count=${results.length}`);
}

export default { handleRAG };
