/**
 * brAInwav Cortex-OS — Ollama warm-up & heartbeat scaffolding
 *
 * Named exports only. Functions ≤40 LOC. Fetch-based.
 */

const BRAND = '[brAInwav]';
const DEFAULT_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434';

/** Parse duration like "4m30s", "10m", "1h", or milliseconds number. */
export function durationToMs(v: string | number): number {
	if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, v);
	if (typeof v !== 'string') return 0;
	const rx = /(\d+)\s*(ms|s|m|h|d)/gi;
	let ms = 0;
	let match: RegExpExecArray | null;
	while ((match = rx.exec(v))) {
		const value = Number(match[1]);
		const unit = match[2].toLowerCase();
		const factor =
			unit === 'ms'
				? 1
				: unit === 's'
					? 1_000
					: unit === 'm'
						? 60_000
						: unit === 'h'
							? 3_600_000
							: 86_400_000;
		ms += value * factor;
	}
	return ms || Number(v) || 0;
}

type WarmupOptions = {
	baseUrl?: string;
	keepAlive: string | number;
	signal?: AbortSignal;
};

type HeartbeatOptions = {
	baseUrl?: string;
	keepAlive: string | number;
};

async function warmOnce(model: string, options: WarmupOptions): Promise<void> {
	const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
	const body = JSON.stringify({
		model,
		messages: [{ role: 'system', content: `${BRAND} warmup` }],
		stream: false,
		keep_alive: options.keepAlive,
		options: { num_predict: 0 },
	});
	const res = await fetch(`${baseUrl}/api/chat`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body,
		signal: options.signal,
	});
	if (!res.ok) throw new Error(`${BRAND} warmup failed for ${model}: ${res.status}`);
}

/** Preload one or more models into memory by issuing a zero-token chat call. */
export async function prewarm(
	models: string[],
	keepAlive: string | number,
	options: { baseUrl?: string; signal?: AbortSignal } = {},
): Promise<void> {
	const tasks = models.map((model) =>
		warmOnce(model, { baseUrl: options.baseUrl, keepAlive, signal: options.signal }).catch(
			(error) => {
				console.warn(BRAND, 'prewarm error', model, String(error));
			},
		),
	);
	await Promise.all(tasks);
}

/** Schedule periodic keep-alive refresh calls. Returns a stop() disposer. */
export function scheduleHeartbeat(
	models: string[],
	interval: string | number,
	keepAlive: string | number,
	options: HeartbeatOptions = {},
): () => void {
	const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
	const ms = durationToMs(interval) || 300_000;
	const timers: Array<NodeJS.Timeout> = [];
	const jitter = Math.max(50, Math.floor(ms / Math.max(2, models.length + 1)));
	options.keepAlive = keepAlive; // Ensure keepAlive is in options

	const ping = async (model: string) => {
		try {
			await warmOnce(model, { baseUrl, keepAlive });
		} catch (error) {
			console.warn(BRAND, 'heartbeat error', model, String(error));
		}
	};

	models.forEach((model, index) => {
		const delay = index * jitter;
		const start = setTimeout(() => {
			void ping(model);
		}, delay);
		const cadence = setInterval(() => {
			void ping(model);
		}, ms);
		timers.push(cadence);
		// store timeout separately to clear later
		timers.push(start as unknown as NodeJS.Timeout);
	});

	return () => {
		for (const timer of timers) {
			clearTimeout(timer);
		}
	};
}
