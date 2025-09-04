import { z } from "zod";
import { type Candidate, callRerankService } from "../lib/rerank-service.ts";

const candidateSchema = z.object({
        text: z.string(),
        score: z.number().optional(),
});

const requestSchema = z.object({
        candidates: z.array(candidateSchema),
        query: z.string().min(1),
});

const DEFAULT_MLX_URL = "https://127.0.0.1:8765";
const DEFAULT_OLLAMA_URL = "https://127.0.0.1:11434";

export async function rerank(
        candidates: Candidate[],
        query: string,
): Promise<Candidate[]> {
        const { candidates: validCandidates, query: validQuery } =
                requestSchema.parse({
                        candidates,
                        query,
                });

        const services = [
                process.env.MLX_SERVICE_URL || DEFAULT_MLX_URL,
                process.env.FRONTIER_API_URL,
                process.env.OLLAMA_API_URL || DEFAULT_OLLAMA_URL,
        ].filter(Boolean) as string[];

        for (const url of services) {
                try {
                        const scored = await callRerankService(url, validQuery, validCandidates);
                        return scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
                } catch (error) {
                        if (url === services[services.length - 1]) {
                                throw error;
                        }
                }
        }
        throw new Error("No rerank service available");
}

export type { Candidate } from "../lib/rerank-service.ts";
