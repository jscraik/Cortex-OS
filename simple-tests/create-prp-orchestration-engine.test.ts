import { describe, expect, it } from 'vitest';
import { PRPOrchestrationEngine } from '../../packages/orchestration/src/prp-integration.js';
import { createPRPOrchestrationEngine } from '../../src/lib/create-prp-orchestration-engine.js';

describe('createPRPOrchestrationEngine', () => {
  it('returns a PRPOrchestrationEngine instance', () => {
    const engine = createPRPOrchestrationEngine({ maxConcurrentOrchestrations: 1 });
    expect(engine).toBeInstanceOf(PRPOrchestrationEngine);
  });
});
