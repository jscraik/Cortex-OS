import { z } from 'zod';

export const ModelInfo = z.object({
  id: z.string(),
  created: z.string(),
  owner: z.string()
});

export type ModelInfo = z.infer<typeof ModelInfo>;

export const ChatCompletionRequest = z.object({
  model: z.string(),
  messages: z.array(z.object({ role: z.string(), content: z.string() })),
  max_tokens: z.number().optional()
});

export type ChatCompletionRequest = z.infer<typeof ChatCompletionRequest>;
