import { Clip } from '@frost-beta/clip';
import { z } from 'zod';

const textArraySchema = z.array(z.string().min(1, 'text cannot be empty')).min(1, 'text array cannot be empty');

const rerankSchema = z.object({
  query: z.string().min(1, 'query is required'),
  docs: z.array(z.string().min(1, 'doc cannot be empty')).min(1, 'docs array cannot be empty'),
});

let clipInstance: Clip | null = null;
function getClip(): Clip {
  if (!clipInstance) {
    const modelDir = process.env.MLX_CLIP_PATH ?? 'models/clip';
    clipInstance = new Clip(modelDir);
  }
  return clipInstance;
}

export async function embed(text: string[]): Promise<number[][]> {
  const parsed = textArraySchema.safeParse(text);
  if (!parsed.success) {
    throw new Error(`Invalid embed input: ${parsed.error.message}`);
  }
  const clip = getClip();
  return clip.computeLabelEmbeddingsJs(parsed.data);
}

export async function rerank(query: string, docs: string[]): Promise<number[]> {
  const parsed = rerankSchema.safeParse({ query, docs });
  if (!parsed.success) {
    throw new Error(`Invalid rerank input: ${parsed.error.message}`);
  }
  const clip = getClip();
  const { query: q, docs: d } = parsed.data;
  const [queryEmbedding] = clip.computeLabelEmbeddingsJs([q]);
  const docEmbeddings = clip.computeLabelEmbeddingsJs(d);
  return docEmbeddings.map((embedding) => cosineSimilarity(queryEmbedding, embedding));
}

  const normB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / (normA * normB);
}

