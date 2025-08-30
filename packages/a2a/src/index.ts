/**
 * A2A (Agent-to-Agent) Communication Framework
 * Main entry point for A2A functionality
 */

// Re-export contracts (including Envelope)
export * from '@cortex-os/a2a-contracts';

// Re-export core functionality (excluding conflicting Envelope)
export * from '@cortex-os/a2a-core';

// Explicitly re-export Envelope from contracts to resolve ambiguity
export { Envelope } from '@cortex-os/a2a-contracts';

// Re-export transport functionality
export * from '@cortex-os/a2a-transport';
