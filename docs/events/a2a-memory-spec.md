# A2A Memory Event Specification

This document defines the A2A event envelopes for memory operations.

## Events

- `memory.store`: Emitted when a memory is stored.
- `memory.search`: Emitted when a memory is searched.
- `memory.get`: Emitted when a memory is retrieved.
- `memory.remove`: Emitted when a memory is deleted.

## Envelope

All memory events follow the `MemoryStoreEventSchema` from `@cortex-os/a2a-contracts`.
