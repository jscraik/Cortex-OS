import { Envelope } from '../../a2a-contracts/src/envelope.js';
import { createTraceContext, injectTraceContext, } from '../../a2a-contracts/src/trace-context.js';
import { busMetrics } from './metrics.js';
import { getCurrentTraceContext } from './trace-context-manager';
export function createBus(transport, validate = Envelope.parse, schemaRegistry, acl = {}, options = {}) {
    const enableIdempotency = options.enableIdempotency !== false; // default on
    const idempotencyTtlMs = options.idempotencyTtlMs ?? 5 * 60 * 1000;
    const autoCorrelation = options.autoCorrelation !== false; // default on
    // Simple in-memory idempotency store; map id -> expiry timestamp
    const seen = new Map();
    function sweepExpired() {
        if (idempotencyTtlMs <= 0)
            return;
        const now = Date.now();
        for (const [k, exp] of seen.entries()) {
            if (exp <= now)
                seen.delete(k);
        }
    }
    function markSeen(id) {
        if (!enableIdempotency)
            return;
        const expiry = idempotencyTtlMs > 0
            ? Date.now() + idempotencyTtlMs
            : Number.MAX_SAFE_INTEGER;
        seen.set(id, expiry);
    }
    function hasSeen(id) {
        if (!enableIdempotency)
            return false;
        sweepExpired();
        return seen.has(id);
    }
    const assertPublishAllowed = (type) => {
        if (acl[type]?.publish !== true) {
            throw new Error(`Publish not allowed for topic ${type}`);
        }
    };
    const assertSubscribeAllowed = (type) => {
        if (acl[type]?.subscribe !== true) {
            throw new Error(`Subscribe not allowed for topic ${type}`);
        }
    };
    const validateAgainstSchema = (msg) => {
        if (!schemaRegistry)
            return;
        const result = schemaRegistry.validate(msg.type, msg.data);
        if (!result.valid) {
            const errs = (result.errors || []).map((e) => {
                if (typeof e === 'object' && e && 'message' in e) {
                    return String(e.message);
                }
                return String(e);
            });
            throw new Error(`Schema validation failed: ${errs.length ? errs.join(', ') : 'unknown error'}`);
        }
    };
    const publish = async (msg) => {
        assertPublishAllowed(msg.type);
        const validatedMsg = validate(msg);
        // Ensure correlationId present if requested
        if (autoCorrelation && !validatedMsg.correlationId) {
            // Use existing id as correlation root when missing
            validatedMsg.correlationId = validatedMsg.id;
        }
        if (schemaRegistry) {
            validateAgainstSchema(validatedMsg);
        }
        const currentContext = getCurrentTraceContext();
        if (currentContext) {
            injectTraceContext(validatedMsg, currentContext);
        }
        else {
            const newContext = createTraceContext();
            injectTraceContext(validatedMsg, newContext);
        }
        await transport.publish(validatedMsg);
        busMetrics().incEvents();
        if (validatedMsg.id)
            markSeen(validatedMsg.id);
    };
    const bind = async (handlers) => {
        for (const h of handlers) {
            assertSubscribeAllowed(h.type);
        }
        const map = new Map(handlers.map((h) => [h.type, h.handle]));
        return transport.subscribe([...map.keys()], async (m) => {
            try {
                validate(m);
                // Idempotency check (drop duplicates silently)
                if (m.id && hasSeen(m.id)) {
                    busMetrics().incDuplicates();
                    return; // duplicate
                }
                const handler = map.get(m.type);
                if (handler) {
                    const currentContext = getCurrentTraceContext();
                    if (currentContext) {
                        injectTraceContext(m, currentContext);
                    }
                    if (autoCorrelation && !m.correlationId) {
                        m.correlationId = m.id; // derive
                    }
                    await handler(m);
                    if (m.id)
                        markSeen(m.id);
                }
            }
            catch (error) {
                console.error(`[A2A Bus] Error handling message type ${m.type}:`, error);
            }
        });
    };
    return { publish, bind };
}
//# sourceMappingURL=bus.js.map