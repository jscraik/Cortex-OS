import type { TopicACL } from '@cortex-os/a2a-contracts/topic-acl';
import { createTraceContext, injectTraceContext } from '@cortex-os/a2a-contracts/trace-context';
import type { A2AEventEnvelope } from '@cortex-os/a2a-events';
import type { Authenticator } from './auth/authenticator.js';
import type { LoadManager } from './backpressure/load-manager.js';
import { busMetrics } from './metrics.js';
import type { SchemaRegistry } from './schema-registry.js';
import { getCurrentTraceContext } from './trace-context-manager.js';
import type { Transport } from './transport.js';
import type { InputValidator, ValidationRule } from './validation/input-validator.js';

export type Handler = {
	type: string;
	handle: (msg: A2AEventEnvelope) => Promise<void>;
};

export interface BusOptions {
	/** Idempotency cache TTL in ms (default 5 min). Set 0 to disable eviction */
	idempotencyTtlMs?: number;
	/** Enable idempotency (dedupe by envelope id) */
	enableIdempotency?: boolean;
	/** Auto-generate correlationId if missing */
	autoCorrelation?: boolean;
	/** Authentication provider */
	authenticator?: Authenticator;
	/** Require authentication for all messages */
	requireAuth?: boolean;
	/** Input validator for message sanitization */
	inputValidator?: InputValidator;
	/** Validation rules */
	validationRules?: ValidationRule;
	/** Load manager for backpressure control */
	loadManager?: LoadManager;
}

export const createBus = (
	transport: Transport,
	validate: (e: A2AEventEnvelope) => A2AEventEnvelope = (e) => e,
	schemaRegistry?: SchemaRegistry,
	acl: TopicACL = {},
	options: BusOptions = {},
) => {
	const enableIdempotency = options.enableIdempotency !== false;
	const idempotencyTtlMs = options.idempotencyTtlMs ?? 5 * 60 * 1000;
	const autoCorrelation = options.autoCorrelation !== false;
	const { authenticator, requireAuth = false, inputValidator, loadManager } = options;

	// Simple in-memory idempotency store
	const seen = new Map<string, number>();

	const sweepExpired = (): void => {
		if (idempotencyTtlMs <= 0) return;
		const now = Date.now();
		for (const [k, exp] of seen.entries()) {
			if (exp <= now) seen.delete(k);
		}
	};

	const markSeen = (id: string): void => {
		if (!enableIdempotency) return;
		const expiry = idempotencyTtlMs > 0 ? Date.now() + idempotencyTtlMs : Number.MAX_SAFE_INTEGER;
		seen.set(id, expiry);
	};

	const hasSeen = (id: string): boolean => {
		if (!enableIdempotency) return false;
		sweepExpired();
		return seen.has(id);
	};

	const assertPublishAllowed = (type: string): void => {
		if (acl[type]?.publish !== true) {
			throw new Error(`Publish not allowed for topic ${type}`);
		}
	};

	const assertSubscribeAllowed = (type: string): void => {
		if (acl[type]?.subscribe !== true) {
			throw new Error(`Subscribe not allowed for topic ${type}`);
		}
	};

	const validateAgainstSchema = (msg: A2AEventEnvelope): void => {
		if (!schemaRegistry) return;
		// OLD (BROKEN): msg.event.event_type
		// NEW (FIXED): Use msg.type
		// Validate the envelope data against the registered schema for this type
		const result = schemaRegistry.validate(msg.type, msg.data);
		if (!result.valid) {
			const errs = (result.errors || []).map((e: unknown) => {
				if (typeof e === 'object' && e && 'message' in e) {
					return String((e as { message: unknown }).message);
				}
				return String(e);
			});
			throw new Error(
				`Schema validation failed: ${errs.length ? errs.join(', ') : 'unknown error'}`,
			);
		}
	};

	const checkBackpressure = async (msg: A2AEventEnvelope): Promise<void> => {
		if (!loadManager) return;

		// Check if message should be dropped
		if (loadManager.shouldDropMessage(msg)) {
			throw new Error('Message dropped due to load shedding');
		}

		// Check backpressure (might throw or throttle)
		await loadManager.checkBackpressure(0); // Queue depth would come from transport
	};

	const validateInput = (_msg: A2AEventEnvelope): void => {
		if (inputValidator) {
			inputValidator.validateEnvelope(_msg);
		}
	};

	const authenticateMessage = async (msg: A2AEventEnvelope): Promise<void> => {
		if (requireAuth && authenticator) {
			const authContext = await authenticator.authenticate(msg);

			// OLD (BROKEN): msg.event.event_type
			// NEW (FIXED): Use msg.type
			if (!authenticator.authorize(authContext, msg.type)) {
				throw new Error(`Insufficient permissions for ${msg.type}`);
			}

			// OLD (BROKEN): msg.metadata.labels
			// NEW (FIXED): Use msg.headers
			msg.headers = {
				...msg.headers,
				'x-auth-subject': authContext.subject,
				'x-auth-scopes': authContext.scopes.join(','),
			};
		}
	};

	const addTraceContext = (msg: A2AEventEnvelope): void => {
		const currentContext = getCurrentTraceContext();
		if (currentContext) {
			injectTraceContext(msg, currentContext);
		} else {
			const newContext = createTraceContext();
			injectTraceContext(msg, newContext);
		}
	};

	const ensureCorrelationId = (msg: A2AEventEnvelope): void => {
		// OLD (BROKEN): msg.correlation.correlation_id
		// NEW (FIXED): Use msg.correlationId
		if (autoCorrelation && !msg.correlationId) {
			// OLD (BROKEN): msg.envelope_id
			// NEW (FIXED): Use msg.id
			msg.correlationId = msg.id;
		}
	};

	const publish = async (msg: A2AEventEnvelope): Promise<void> => {
		// OLD (BROKEN): msg.routing.topic
		// NEW (FIXED): Use msg.type as routing key
		assertPublishAllowed(msg.type);
		const validatedMsg = validate(msg);

		await checkBackpressure(validatedMsg);
		validateInput(validatedMsg);
		await authenticateMessage(validatedMsg);

		if (schemaRegistry) {
			validateAgainstSchema(validatedMsg);
		}

		ensureCorrelationId(validatedMsg);
		addTraceContext(validatedMsg);

		await transport.publish(validatedMsg);
		busMetrics().incEvents();
		// OLD (BROKEN): validatedMsg.envelope_id
		// NEW (FIXED): Use validatedMsg.id
		if (validatedMsg.id) markSeen(validatedMsg.id);
	};

	const bind = async (handlers: Handler[]) => {
		for (const h of handlers) {
			assertSubscribeAllowed(h.type);
		}
		const map = new Map(handlers.map((h) => [h.type, h.handle] as const));
		return transport.subscribe([...map.keys()], async (m: A2AEventEnvelope) => {
			try {
				validate(m);

				// Input validation
				validateInput(m);

				// Idempotency check
				// OLD (BROKEN): m.envelope_id
				// NEW (FIXED): Use m.id
				if (m.id && hasSeen(m.id)) {
					busMetrics().incDuplicates();
					return;
				}

				await authenticateMessage(m);

				// OLD (BROKEN): m.routing.topic
				// NEW (FIXED): Use m.type
				const handler = map.get(m.type);
				if (handler) {
					addTraceContext(m);
					ensureCorrelationId(m);
					await handler(m);
					// OLD (BROKEN): m.envelope_id
					// NEW (FIXED): Use m.id
					if (m.id) markSeen(m.id);
				}
			} catch (error) {
				// OLD (BROKEN): m.routing.topic
				// NEW (FIXED): Use m.type
				console.error(`[A2A Bus] Error handling message type ${m.type}:`, error);
			}
		});
	};

	return { publish, bind };
};
