# A2A Messaging Audit

## Summary
- Delivery guarantees: `fsQueue` appends to disk but does not redeliver after restart.
- Backpressure: transports expose no flow control or queue limits.
- Message schema versioning: envelopes include a `schemaVersion` field (default 1); no registry.
- Retries/poison queues: not implemented.
- Tracing: basic hooks exist; end-to-end trace propagation missing.

## Tests
- Contract: `packages/a2a/tests/envelope.contract.test.ts`
- Durability: `packages/a2a/tests/fsq.durability.test.ts`
- Chaos: `packages/a2a/tests/inproc.chaos.test.ts`

## Fix Plan
1. Introduce schema registry with versioned envelopes.
2. Add durable queue reader or adopt a broker with persistence.
3. Implement backpressure-aware transports (bounded channels).
4. Provide retry logic with poison queue handling.
5. Extend tracing with distributed context propagation.

## Score
- Delivery guarantees: 2/5
- Backpressure: 1/5
- Schema versioning: 3/5
- Retries/Poison: 1/5
- Tracing: 2/5

**Overall: 9/25**
