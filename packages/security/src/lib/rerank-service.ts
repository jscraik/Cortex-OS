import { z } from 'zod';

export interface Candidate {
  text: string;
  score?: number;
}

const responseSchema = z.object({
  scores: z.array(z.number()),
});

export async function callRerankService(
  baseUrl: string,
  query: string,
  candidates: Candidate[],
): Promise<Candidate[]> {
  const res = await fetch(`${baseUrl}/rerank`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, candidates }),
  });

  if (!res.ok) {
    throw new Error(`Rerank failed: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  const data = responseSchema.parse(json);
  if (data.scores.length !== candidates.length) {
    throw new Error('Service returned mismatched scores');
  }
  return candidates.map((c, i) => ({ ...c, score: data.scores[i] }));
}
