import type { PromptCapture } from '@cortex-os/prompts';
import { RunBundleWriter } from './writer.js';

interface RunRecorderInit {
	runId: string;
	writer: RunBundleWriter;
	task: unknown;
	agents: unknown[];
	context: unknown;
	now?: () => Date;
}

export interface RunBundleMessage {
	role: string;
	type?: string;
	content?: unknown;
	createdAt?: string;
	metadata?: Record<string, unknown>;
}

export interface RunBundleEnergySample {
	eventId?: string;
	timestamp?: string;
	source?: string;
	eventType?: string;
	payload?: Record<string, unknown>;
}

export type RunBundleCitation = Record<string, unknown>;
export type RunBundlePolicyDecision = Record<string, unknown>;

export interface RunRecordPayload {
	id: string;
	status: 'running' | 'completed' | 'failed';
	startedAt?: string;
	finishedAt?: string;
	durationMs?: number;
	task: unknown;
	agents: unknown;
	context: unknown;
	bundleRoot: string;
	promptCount: number;
	messageCount?: number;
	energySampleCount?: number;
	output?: unknown;
	error?: { name: string; message: string; stack?: string };
}

export class RunBundleRecorder {
	private readonly runId: string;
	private readonly writer: RunBundleWriter;
	private readonly task: unknown;
	private readonly agents: unknown[];
	private readonly context: unknown;
	private readonly now: () => Date;
	private startedAt?: string;
	private promptCount = 0;
	private currentRecord: RunRecordPayload | undefined;

	constructor(init: RunRecorderInit) {
		this.runId = init.runId;
		this.writer = init.writer;
		this.task = init.task;
		this.agents = init.agents;
		this.context = init.context;
		this.now = init.now ?? (() => new Date());
	}

	async start(): Promise<void> {
		if (this.currentRecord) return;
		await this.writer.ensure();
		this.startedAt = this.now().toISOString();
		this.currentRecord = {
			id: this.runId,
			status: 'running',
			startedAt: this.startedAt,
			task: sanitize(this.task),
			agents: sanitize(this.agents),
			context: sanitize(this.context),
			bundleRoot: this.writer.root,
			promptCount: 0,
		};
		await this.writer.writeJSON('run.json', this.currentRecord);
	}

	async recordPrompts(captures?: PromptCapture[]): Promise<void> {
		const entries = Array.isArray(captures) ? captures : [];
		this.promptCount = entries.length;
		if (this.currentRecord) {
			this.currentRecord.promptCount = entries.length;
		}
		await this.writer.writePrompts(entries);
	}

	async complete(result: unknown): Promise<void> {
		await this.ensureStarted();

		const finishedAt = this.now().toISOString();
		const durationMs = this.startedAt ? Math.max(0, new Date(finishedAt).getTime() - new Date(this.startedAt).getTime()) : undefined;
		const ctx = extractContext(result);
		const messages = extractMessages(result);
		const citations = extractCitations(ctx);
		const policyDecisions = extractPolicyDecisions(ctx);
		const energySamples = extractEnergySamples(ctx);

		await Promise.all([
			this.writer.writeJSONLines('messages.jsonl', messages),
			this.writer.writeJSON('citations.json', citations),
			this.writer.writeJSON('policy_decisions.json', policyDecisions),
			this.writer.writeJSONLines('energy.jsonl', energySamples),
		]);

		this.currentRecord = {
			...(this.currentRecord ?? {
				id: this.runId,
				task: sanitize(this.task),
				agents: sanitize(this.agents),
				context: sanitize(this.context),
				bundleRoot: this.writer.root,
				promptCount: this.promptCount,
			}),
			status: 'completed',
			startedAt: this.startedAt,
			finishedAt,
			durationMs,
			promptCount: this.promptCount,
			messageCount: messages.length,
			energySampleCount: energySamples.length,
			output: extractOutputSummary(result),
		};

		await this.writer.writeJSON('run.json', this.currentRecord);
	}

	async fail(error: unknown): Promise<void> {
		await this.ensureStarted();

		await Promise.all([
			this.writer.writeJSONLines('messages.jsonl', []),
			this.writer.writeJSON('citations.json', []),
			this.writer.writeJSON('policy_decisions.json', []),
			this.writer.writeJSONLines('energy.jsonl', []),
			this.writer.writePrompts([]),
		]);

		const finishedAt = this.now().toISOString();
		const durationMs = this.startedAt ? Math.max(0, new Date(finishedAt).getTime() - new Date(this.startedAt).getTime()) : undefined;

		this.currentRecord = {
			...(this.currentRecord ?? {
				id: this.runId,
				task: sanitize(this.task),
				agents: sanitize(this.agents),
				context: sanitize(this.context),
				bundleRoot: this.writer.root,
				promptCount: 0,
			}),
			status: 'failed',
			startedAt: this.startedAt,
			finishedAt,
			durationMs,
			promptCount: this.promptCount,
			messageCount: 0,
			energySampleCount: 0,
			error: serializeError(error),
		};

		await this.writer.writeJSON('run.json', this.currentRecord);
	}

	private async ensureStarted(): Promise<void> {
		if (!this.currentRecord) {
			await this.start();
		}
	}
}

function extractContext(result: unknown): Record<string, unknown> {
	if (!result || typeof result !== 'object') return {};
	const ctx = (result as { ctx?: unknown }).ctx;
	if (!ctx || typeof ctx !== 'object' || Array.isArray(ctx)) return {};
	return ctx as Record<string, unknown>;
}

function extractMessages(result: unknown): RunBundleMessage[] {
	if (!result || typeof result !== 'object') {
		return [];
	}
	const candidate = (result as { messages?: unknown }).messages;
	if (Array.isArray(candidate)) {
		const serialized: RunBundleMessage[] = [];
		for (const entry of candidate) {
			const message = serializeMessage(entry);
			if (message) serialized.push(message);
		}
		if (serialized.length > 0) return serialized;
	}
	const output = (result as { output?: unknown }).output;
	if (output !== undefined) {
		return [
			{
				role: 'assistant',
				type: 'output',
				content: sanitize(output),
			},
		];
	}
	return [];
}

function extractCitations(ctx: Record<string, unknown>): RunBundleCitation[] {
	const candidate = ctx?.citations;
	if (!Array.isArray(candidate)) return [];
	return candidate
		.map((entry) => sanitize(entry))
		.filter((entry): entry is RunBundleCitation => Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry));
}

function extractPolicyDecisions(ctx: Record<string, unknown>): RunBundlePolicyDecision[] {
	const decisions: RunBundlePolicyDecision[] = [];
	const routing = ctx?.routing;
	if (routing && typeof routing === 'object' && !Array.isArray(routing)) {
		const record = routing as Record<string, unknown>;
		if (record.decision && typeof record.decision === 'object') {
			const sanitized = sanitize(record.decision);
			if (sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized)) {
				decisions.push(sanitized as RunBundlePolicyDecision);
			}
		}
		const history = record.history;
		if (Array.isArray(history)) {
			for (const item of history) {
				const sanitized = sanitize(item);
				if (sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized)) {
					decisions.push(sanitized as RunBundlePolicyDecision);
				}
			}
		}
	}
	return decisions;
}

function extractEnergySamples(ctx: Record<string, unknown>): RunBundleEnergySample[] {
	const telemetry = ctx?.telemetry;
	if (!Array.isArray(telemetry)) return [];
	const samples: RunBundleEnergySample[] = [];
	for (const entry of telemetry) {
		if (!entry || typeof entry !== 'object') continue;
		const record = entry as Record<string, unknown>;
		samples.push({
			eventId: typeof record.eventId === 'string' ? record.eventId : undefined,
			timestamp: typeof record.timestamp === 'string' ? record.timestamp : undefined,
			source: typeof record.source === 'string' ? record.source : undefined,
			eventType: typeof record.eventType === 'string' ? record.eventType : undefined,
			payload: (sanitize(record.payload) as Record<string, unknown>) ?? undefined,
		});
	}
	return samples;
}

function extractOutputSummary(result: unknown): unknown {
	if (!result || typeof result !== 'object') return sanitize(result);
	const record = result as Record<string, unknown>;
	if ('output' in record) {
		return sanitize(record.output);
	}
	return sanitize(record);
}

function serializeMessage(message: unknown): RunBundleMessage | undefined {
	if (!message || typeof message !== 'object') return undefined;
	const record = message as Record<string, unknown>;
	let role: string | undefined;
	let type: string | undefined;
	let content: unknown;
	let createdAt: string | undefined;

	if (typeof record.role === 'string') role = record.role;
	if (typeof record.type === 'string') type = record.type;
	if (typeof record.createdAt === 'string') createdAt = record.createdAt;

	if (!role && typeof record._getType === 'function') {
		try {
			role = String((record._getType as () => unknown)());
		} catch {
			role = undefined;
		}
	}
	if (!role && typeof record.lc_kwargs === 'object' && record.lc_kwargs) {
		const lc = record.lc_kwargs as Record<string, unknown>;
		if (typeof lc.type === 'string') role = lc.type;
		if (!content && lc.content !== undefined) content = lc.content;
	}
	if (!role && typeof record._type === 'string') role = record._type;
	if (!type && role) type = role;

	if (content === undefined && 'content' in record) {
		content = record.content;
	}

	const metadataSource = record.metadata ?? record.additional_kwargs;
	const metadata = sanitize(metadataSource);

	return {
		role: role ?? 'unknown',
		type,
		content: sanitize(content),
		createdAt,
		metadata: metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? (metadata as Record<string, unknown>) : undefined,
	};
}

function sanitize(value: unknown, depth = 5, seen: WeakSet<object> = new WeakSet()): unknown {
	if (value === null) return null;
	const valueType = typeof value;
	if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') return value;
	if (valueType === 'bigint') {
		const asNumber = Number(value);
		return Number.isSafeInteger(asNumber) ? asNumber : value.toString();
	}
	if (valueType === 'undefined' || valueType === 'symbol' || valueType === 'function') return undefined;
	if (value instanceof Date) return value.toISOString();
	if (Array.isArray(value)) {
		if (depth <= 0) return value.length;
		const result: unknown[] = [];
		for (const entry of value) {
			const sanitized = sanitize(entry, depth - 1, seen);
			if (sanitized !== undefined) result.push(sanitized);
		}
		return result;
	}
	if (valueType === 'object') {
		if (seen.has(value as object)) return '[Circular]';
		seen.add(value as object);
		if (depth <= 0) {
			seen.delete(value as object);
			return {};
		}
		const result: Record<string, unknown> = {};
		for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
			const sanitized = sanitize(entry, depth - 1, seen);
			if (sanitized !== undefined) {
				result[key] = sanitized;
			}
		}
		seen.delete(value as object);
		return result;
	}
	return value;
}

function serializeError(error: unknown): { name: string; message: string; stack?: string } {
	if (error instanceof Error) {
		return {
			name: error.name,
			message: error.message,
			stack: error.stack,
		};
	}
	if (typeof error === 'object' && error) {
		return {
			name: error.constructor?.name ?? 'Error',
			message: JSON.stringify(sanitize(error)),
		};
	}
	return {
		name: 'Error',
		message: typeof error === 'string' ? error : String(error ?? 'Unknown error'),
	};
}
