import { z } from 'zod';

export interface RetrieverResult {
  id: string;
  text: string;
  score: number;
}

export const DocSchema = z.object({ id: z.string(), text: z.string() });
export type RetrieverDoc = z.infer<typeof DocSchema>;
