import { z } from 'zod';
import { AgentConfigSchema, RAGQuerySchema } from '@cortex-os/contracts';
import { createStdOutput, createJsonOutput, StructuredError } from '@cortex-os/lib';
import { Qwen3Presets } from './embed/qwen3';
import { memoryStore } from './store/memory';
import { createMultiModelGenerator, ModelPresets } from './generation/multi-model';

const InputSchema = z.object({
  config: AgentConfigSchema,
  query: RAGQuerySchema,
  json: z.boolean().optional(),
});
export type RAGInput = z.infer<typeof InputSchema>;

export async function handleRAG(input: unknown): Promise<string> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    const err = new StructuredError('INVALID_INPUT', 'Invalid RAG input', { issues: parsed.error.issues });
    return createJsonOutput({ error: err.toJSON() });
  }
  const { config, query, json } = parsed.data;

  const store = memoryStore();
  const embedder = Qwen3Presets.development();
  const generator = createMultiModelGenerator({
    model: ModelPresets.chat,
    defaultConfig: { maxTokens: config.maxTokens },
    timeout: config.timeoutMs,
  });

  const [embedding] = await embedder.embed([query.query]);
  const results = await store.query(embedding, query.topK);
  const context = results.map((r) => r.text).join('\n');
  const prompt = context ? `${context}\n\n${query.query}` : query.query;
  const answer = await generator.generate(prompt, { maxTokens: config.maxTokens });

  const payload = { answer: answer.content, sources: results, provider: answer.provider };
  return json ? createJsonOutput(payload) : createStdOutput(answer.content);
}
