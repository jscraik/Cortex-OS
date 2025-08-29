import { z } from 'zod';

const requestSchema = z.object({
  text: z.string().min(1),
});

const responseSchema = z.object({
  embeddings: z.array(z.array(z.number())),
});

const DEFAULT_SERVICE_URL = 'http://127.0.0.1:8765';

export async function generateEmbedding(text: string): Promise<Float32Array> {
  const { text: validText } = requestSchema.parse({ text });
  const baseUrl = process.env.MLX_SERVICE_URL || DEFAULT_SERVICE_URL;
  const res = await fetch(`${baseUrl}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: validText }),
  });

  if (!res.ok) {
    throw new Error(`MLX embedding failed: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  const data = responseSchema.parse(json);
  if (!data.embeddings.length) {
    throw new Error('MLX service returned no embeddings');
  }
  return Float32Array.from(data.embeddings[0]);
}
