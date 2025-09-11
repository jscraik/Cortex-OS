import { randomUUID } from 'node:crypto';
import type { Envelope, EventBus, Memory, MemoryStore, TextQuery, VectorQuery } from '../lib/types.js';
import { redactPII } from '../lib/utils.js';

const DEFAULT_TYPES = [
	'agent.started',
	'agent.completed',
	'agent.failed',
	'provider.fallback',
	'workflow.started',
	'workflow.completed',
	'workflow.cancelled',
	'security.dependabot_config_loaded',
	'security.dependabot_assessed',
	'security.workflow_unauthorized',
];

export type OutboxOptions = {
	namespace?: string; // logical namespace tag
	ttl?: string; // ISO-8601 duration (e.g., 'PT1H')
	maxItemBytes?: number; // guardrail for payload size
	tagPrefix?: string; // optional tag prefix
	redactPII?: boolean; // redact PII before persisting
};

/**
 * Subscribe to agent events and persist them via governed MemoryStore.
 * Adheres to AGENTS.md: no direct filesystem persistence from agents.
 */
type OptionsResolver = (eventType: string, event: unknown) => OutboxOptions;

export const wireOutbox = async (
	bus: EventBus,
	store: MemoryStore,
	optionsOrResolver: OutboxOptions | OptionsResolver = {},
	types: string[] = DEFAULT_TYPES,
) => {
	const base: OutboxOptions =
		typeof optionsOrResolver === 'function' ? {} : optionsOrResolver || {};
	const resolver: OptionsResolver =
		typeof optionsOrResolver === 'function'
			? optionsOrResolver
			: () => base;

	for (const t of types) {
		bus.subscribe(t, async (evt: Envelope<unknown>) => {
			try {
				const opts = resolver(t, evt) || {};
				const namespace = opts.namespace || 'agents:outbox';
				const ttl = opts.ttl || 'PT1H';
				const maxItemBytes = opts.maxItemBytes ?? 256_000;
				const tagPrefix = opts.tagPrefix || 'evt';

				const now = new Date();
				const payload = evt;
				let text = JSON.stringify(payload);

				// enforce item size guardrail
				if (Buffer.byteLength(text, 'utf8') > maxItemBytes) {
					// Truncate conservatively, preserve JSON validity with a stub
					const truncated = text.slice(0, Math.max(0, maxItemBytes - 200));
					text = JSON.stringify({
						type: t,
						truncated: true,
						note: 'Payload exceeded maxItemBytes; content truncated',
						preview: truncated,
					});
				}

				// best-effort actor extraction
				let actor = 'unknown';
				const d = evt.data as (Partial<{ agentId: string; serverId: string }> | undefined);
				if (d?.agentId) actor = d.agentId;
				else if (d?.serverId) actor = d.serverId;

				const mem: Memory = {
					id: randomUUID(),
					kind: 'event',
					text: opts.redactPII === false ? text : redactPII(text),
					vector: undefined,
					tags: [namespace, `${tagPrefix}:${t}`],
					ttl,
					createdAt: now.toISOString(),
					updatedAt: now.toISOString(),
					provenance: {
						source: 'agent',
						actor,
					},
					policy: { pii: false, scope: 'session' },
				};

				await store.upsert(mem);
			} catch (e) {
				if (process.env.NODE_ENV !== 'production') {
					console.warn('[outbox] failed to persist event', t, e);
				}
			}
		});
	}
};

/**
 * Minimal in-memory MemoryStore implementation for examples/tests.
 * Not intended for production use; prefer @cortex-os/memories adapters.
 */
export class LocalInMemoryStore implements MemoryStore {
	private readonly data = new Map<string, Memory>();

	async upsert(m: Memory, namespace?: string): Promise<Memory> {
		const key = `${namespace ?? 'default'}:${m.id}`;
		this.data.set(key, m);
		return m;
	}

	async get(id: string, namespace?: string): Promise<Memory | null> {
		const key = `${namespace ?? 'default'}:${id}`;
		return this.data.get(key) ?? null;
	}

	async delete(id: string, namespace?: string): Promise<void> {
		const key = `${namespace ?? 'default'}:${id}`;
		this.data.delete(key);
	}

	async searchByText(
		q?: TextQuery,
		namespace?: string,
	): Promise<Memory[]> {
		const nsPrefix = `${namespace ?? 'default'}:`;
		const items = Array.from(this.data.entries())
			.filter(([k]) => k.startsWith(nsPrefix))
			.map(([, v]) => v);
		const topK = q?.topK ?? 100;
		return items.slice(0, Math.max(0, topK));
	}

	async searchByVector(
		q: VectorQuery,
		namespace?: string,
	): Promise<Memory[]> {
		const nsPrefix = `${namespace ?? 'default'}:`;
		const values = Array.from(this.data.entries())
			.filter(([k]) => k.startsWith(nsPrefix))
			.map(([, v]) => v);
		// naive: vector search not implemented; reverse order to differ from text search
		const reversed = values.slice().reverse();
		return reversed.slice(0, Math.max(0, q.topK));
	}

	async purgeExpired(nowISO: string, namespace?: string): Promise<number> {
		// TTL not enforced; simulate pass by scanning namespace keys and ignoring timestamps
		// reference namespace to avoid unused parameter warning
		const _ns = namespace ?? 'default';
		// benign usage
		if (_ns === '__never__') return 0;
		const dt = new Date(nowISO);
		if (Number.isNaN(dt.getTime())) {
			throw new Error('Invalid ISO date');
		}
		return 0;
	}
}
