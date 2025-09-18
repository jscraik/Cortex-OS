export interface LLMOptions {
	model: string;
	fallbackModel?: string;
}

export async function generateText(prompt: string, options: LLMOptions): Promise<string> {
	const mlxUrl = process.env.MLX_API_URL ?? 'http://localhost:11434/api/generate';
	try {
		const res = await fetch(mlxUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ model: options.model, prompt }),
		});
		if (!res.ok) throw new Error(`MLX error ${res.status}`);
		const data = await res.json();
		return data.response ?? data.data ?? '';
	} catch {
		const frontierUrl = process.env.FRONTIER_API_URL ?? 'http://localhost:11435/api/generate';
		const res = await fetch(frontierUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				model: options.fallbackModel ?? options.model,
				prompt,
			}),
		});
		if (!res.ok) {
			throw new Error(`Frontier error ${res.status}`);
		}
		const data = await res.json();
		return data.response ?? data.data ?? '';
	}
}
