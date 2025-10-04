import { isPrivateHostname, safeFetchJson } from '@cortex-os/utils';
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
	const parsed = new URL(baseUrl);

	try {
		const json = await safeFetchJson<unknown>(`${baseUrl}/rerank`, {
			allowedHosts: [parsed.hostname.toLowerCase()],
			allowedProtocols: [parsed.protocol],
			allowLocalhost: isPrivateHostname(parsed.hostname),
			fetchOptions: {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query, candidates }),
			},
		});
		const data = responseSchema.parse(json);
		if (data.scores.length !== candidates.length) {
			throw new Error('Service returned mismatched scores');
		}
		return candidates.map((c, i) => ({ ...c, score: data.scores[i] }));
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`Rerank failed: ${message}`);
	}
}
