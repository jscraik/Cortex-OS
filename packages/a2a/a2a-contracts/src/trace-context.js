import { randomBytes } from 'node:crypto';
/**
 * Generate a new trace ID (16 bytes as hex string)
 */
export function generateTraceId() {
    return randomBytes(16).toString('hex');
}
/**
 * Generate a new span ID (8 bytes as hex string)
 */
export function generateSpanId() {
    return randomBytes(8).toString('hex');
}
/**
 * Create a new trace context for starting a new trace
 */
export function createTraceContext(options) {
    return {
        traceId: options?.traceId || generateTraceId(),
        spanId: options?.spanId || generateSpanId(),
        traceFlags: options?.traceFlags ?? 1, // 1 = sampled
        traceState: options?.traceState,
        baggage: options?.baggage,
    };
}
/**
 * Create a child span context from a parent trace context
 */
export function createChildSpan(parentContext) {
    return {
        ...parentContext,
        spanId: generateSpanId(),
    };
}
/**
 * Extract trace context from W3C traceparent header
 * Format: 00-traceId-spanId-traceFlags
 */
export function parseTraceParent(traceparent) {
    if (!traceparent?.startsWith('00-')) {
        return null;
    }
    const parts = traceparent.split('-');
    if (parts.length !== 4) {
        return null;
    }
    const [, traceId, spanId, traceFlagsStr] = parts;
    // Validate format
    if (traceId.length !== 32 || spanId.length !== 16) {
        return null;
    }
    const traceFlags = parseInt(traceFlagsStr, 16);
    if (Number.isNaN(traceFlags)) {
        return null;
    }
    return {
        traceId,
        spanId,
        traceFlags,
    };
}
/**
 * Create W3C traceparent header from trace context
 */
export function createTraceParent(context) {
    return `00-${context.traceId}-${context.spanId}-${context.traceFlags.toString(16).padStart(2, '0')}`;
}
/**
 * Extract trace context from envelope headers
 */
export function extractTraceContext(envelope) {
    if (!envelope.traceparent) {
        return null;
    }
    const parsed = parseTraceParent(envelope.traceparent);
    if (!parsed) {
        return null;
    }
    return {
        ...parsed,
        traceState: envelope.tracestate,
        baggage: envelope.baggage,
    };
}
/**
 * Inject trace context into envelope headers
 */
export function injectTraceContext(envelope, context) {
    envelope.traceparent = createTraceParent(context);
    if (context.traceState) {
        envelope.tracestate = context.traceState;
    }
    if (context.baggage) {
        envelope.baggage = context.baggage;
    }
}
/**
 * Propagate trace context from incoming to outgoing envelope
 * Creates a child span for the outgoing message
 */
export function propagateTraceContext(incomingEnvelope, outgoingEnvelope) {
    const parentContext = extractTraceContext(incomingEnvelope);
    if (parentContext) {
        const childContext = createChildSpan(parentContext);
        injectTraceContext(outgoingEnvelope, childContext);
    }
}
/**
 * Check if the current trace is sampled
 */
export function isSampled(context) {
    return (context.traceFlags & 1) === 1;
}
/**
 * Set sampling decision for trace context
 */
export function setSampling(context, sampled) {
    return {
        ...context,
        traceFlags: sampled ? context.traceFlags | 1 : context.traceFlags & ~1,
    };
}
/**
 * Add vendor-specific data to trace state
 */
export function addTraceState(context, vendor, value) {
    const existingState = context.traceState ? `${context.traceState},` : '';
    return {
        ...context,
        traceState: `${existingState}${vendor}=${value}`,
    };
}
/**
 * Get vendor-specific data from trace state
 */
export function getTraceState(context, vendor) {
    if (!context.traceState) {
        return null;
    }
    const pairs = context.traceState.split(',');
    for (const pair of pairs) {
        const [key, value] = pair.trim().split('=');
        if (key === vendor) {
            return value;
        }
    }
    return null;
}
/**
 * Add baggage item to trace context
 */
export function addBaggage(context, key, value) {
    const existingBaggage = context.baggage ? `${context.baggage},` : '';
    return {
        ...context,
        baggage: `${existingBaggage}${key}=${encodeURIComponent(value)}`,
    };
}
/**
 * Get baggage item from trace context
 */
export function getBaggage(context, key) {
    if (!context.baggage) {
        return null;
    }
    const pairs = context.baggage.split(',');
    for (const pair of pairs) {
        const [bagKey, bagValue] = pair.trim().split('=');
        if (bagKey === key) {
            return decodeURIComponent(bagValue);
        }
    }
    return null;
}
//# sourceMappingURL=trace-context.js.map