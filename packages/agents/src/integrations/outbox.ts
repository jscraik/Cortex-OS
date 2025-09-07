import { randomUUID } from 'node:crypto';
import type { EventBus, MemoryStore } from '../lib/types.js';
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
type OptionsResolver = (eventType: string, event: any) => OutboxOptions;

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
			? (optionsOrResolver as OptionsResolver)
			: () => base;

	for (const t of types) {
		bus.subscribe(t, async (evt: any) => {
			try {
				const opts = resolver(t, evt) || {};
				const namespace = opts.namespace || 'agents:outbox';
				const ttl = opts.ttl || 'PT1H';
				const maxItemBytes = opts.maxItemBytes ?? 256_000;
				const tagPrefix = opts.tagPrefix || 'evt';

				const now = new Date();
				const payload = { type: t, ...evt };
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

				const mem = {
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
						actor: evt?.data?.agentId || evt?.data?.serverId || 'unknown',
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
	private data = new Map<string, any>();

	async upsert(m: any): Promise<any> {
		this.data.set(m.id, m);
		return m;
	}

	async get(id: string): Promise<any | null> {
		return this.data.get(id) ?? null;
	}

	async delete(id: string): Promise<void> {
		this.data.delete(id);
	}

	async searchByText(): Promise<any[]> {
		// naive return-all for demo/testing
		return Array.from(this.data.values());
	}

	async searchByVector(): Promise<any[]> {
		return [];
	}

	async purgeExpired(): Promise<number> {
		// TTL not enforced in this minimal adapter
		return 0;
	}
}
