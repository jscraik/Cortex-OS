import { z } from 'zod';

export interface Candidate {
  text: string;
  score?: number;
}

const candidateSchema = z.object({
  text: z.string(),
  score: z.number().optional(),
});

const requestSchema = z.object({
  candidates: z.array(candidateSchema),
  query: z.string().min(1),
});

const responseSchema = z.object({
  scores: z.array(z.number()),
});

const DEFAULT_SERVICE_URL = 'http://127.0.0.1:8765';

export async function rerank(candidates: Candidate[], query: string): Promise<Candidate[]> {
  const { candidates: validCandidates, query: validQuery } = requestSchema.parse({
    candidates,
    query,
  });

  const baseUrl = process.env.MLX_SERVICE_URL || DEFAULT_SERVICE_URL;
  try {
    const res = await fetch(`${baseUrl}/rerank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: validQuery, candidates: validCandidates }),
    });

    if (!res.ok) {
      throw new Error(`MLX rerank failed: ${res.status} ${res.statusText}`);
    }
    const json = await res.json();
    const data = responseSchema.parse(json);
    if (data.scores.length !== validCandidates.length) {
      throw new Error('MLX service returned mismatched scores');
    }
    const scored = validCandidates.map((c, i) => ({ ...c, score: data.scores[i] }));
    return scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  } catch (primaryError) {
    const frontierUrl = process.env.FRONTIER_API_URL;
    if (!frontierUrl) {
      throw primaryError;
    }
    const res = await fetch(`${frontierUrl}/rerank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: validQuery, candidates: validCandidates }),
    });
    if (!res.ok) {
      throw new Error(`Frontier rerank failed: ${res.status} ${res.statusText}`);
    }
    const json = await res.json();
    const data = responseSchema.parse(json);
    if (data.scores.length !== validCandidates.length) {
      throw new Error('Frontier service returned mismatched scores');
    }
    const scored = validCandidates.map((c, i) => ({ ...c, score: data.scores[i] }));
    return scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }
}
