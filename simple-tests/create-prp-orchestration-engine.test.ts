import { describe, it, expect } from 'vitest';
import { createPRPOrchestrationEngine } from '../../src/lib/create-prp-orchestration-engine.js';
import { PRPOrchestrationEngine } from '../../packages/orchestration/src/prp-integration.js';

describe('createPRPOrchestrationEngine', () => {
  it('returns a PRPOrchestrationEngine instance', () => {
    const engine = createPRPOrchestrationEngine({ maxConcurrentOrchestrations: 1 });
    expect(engine).toBeInstanceOf(PRPOrchestrationEngine);
  });
});
