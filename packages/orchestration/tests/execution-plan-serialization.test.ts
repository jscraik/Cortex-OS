import { describe, expect, it } from 'vitest';
import { ExecutionPlanSchema } from '../src/types.js';

const basePlan = {
  id: '00000000-0000-0000-0000-000000000000',
  taskId: '00000000-0000-0000-0000-000000000001',
  strategy: 'sequential',
  phases: [],
  dependencies: {},
  estimatedDuration: 0,
  resourceRequirements: {
    minAgents: 1,
    maxAgents: 1,
    requiredCapabilities: [],
  },
  checkpoints: [],
  createdAt: new Date(),
};

describe('ExecutionPlanSchema serialization', () => {
  it('parses plan without fallbackStrategies', () => {
    expect(() => ExecutionPlanSchema.parse(basePlan)).not.toThrow();
  });

  it('rejects plan with fallbackStrategies', () => {
    const withFallback = { ...basePlan, fallbackStrategies: ['sequential'] } as any;
    expect(() => ExecutionPlanSchema.parse(withFallback)).toThrow();
  });
});
