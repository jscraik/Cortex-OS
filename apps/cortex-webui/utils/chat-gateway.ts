import { env } from 'node:process';

export type ChatRole = 'system' | 'user' | 'assistant';
export type ChatMessage = { role: ChatRole; content: string };

export type StreamParams = {
	model: string;
	messages: ChatMessage[];
	signal?: AbortSignal;
};

export type Usage =
	| {
			prompt_tokens?: number;
			completion_tokens?: number;
			total_tokens?: number;
	  }
	| undefined;

export async function streamChat(
	params: StreamParams,
	onToken: (token: string) => void,
): Promise<{ text: string; usage?: Usage }> {
	const provider = (env.MODEL_API_PROVIDER || '').toLowerCase();
	if (provider !== 'openai' && provider !== 'compatible') {
		throw new Error(
			'MODEL_API_PROVIDER must be set to "openai" or "compatible"',
		);
	}
	return await streamOpenAI(params, onToken);
}

async function streamOpenAI(
	params: StreamParams,
	onToken: (t: string) => void,
) {
	const base = env.MODEL_API_BASE || 'http://localhost:11434';
	const apiKey = env.MODEL_API_KEY; // optional for local providers

	const url = `${base.replace(/\/$/, '')}/v1/chat/completions`;
	const body = JSON.stringify({
		model: params.model,
		messages: params.messages,
		stream: true,
	});

	const res = await fetch(url, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
		},
		body,
		signal: params.signal,
	});
	if (!res.ok || !res.body) {
		throw new Error(`Upstream chat request failed with status ${res.status}`);
	}

	return await readSSEStream(res, onToken);
}

async function readSSEStream(res: Response, onToken: (t: string) => void) {
	const body = res.body;
	if (!body) return { text: '', usage: undefined };
	const reader = body.getReader();
	const dec = new TextDecoder();
	let buffer = '';
	let finalText = '';
	let usage: Usage;

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += dec.decode(value, { stream: true });

		let idx = buffer.indexOf('\n');
		while (idx !== -1) {
			const line = buffer.slice(0, idx).trim();
			buffer = buffer.slice(idx + 1);
			idx = buffer.indexOf('\n');
			if (!line?.startsWith('data:')) {
				continue;
			}
			const payload = line.slice(5).trim();
			if (payload === '[DONE]') {
				break;
			}
			const { content, newUsage } = parseOpenAIStreamChunk(payload);
			if (content) {
				finalText += content;
				onToken(content);
			}
			usage = newUsage ?? usage;
		}
	}

	return { text: finalText, usage };
}

function parseOpenAIStreamChunk(payload: string): {
	content?: string;
	newUsage?: Usage;
} {
	try {
		const json = JSON.parse(payload);
		const delta = json.choices?.[0]?.delta;
		const content: string | undefined = delta?.content;
		return { content, newUsage: json.usage };
	} catch {
		return {};
	}
}
