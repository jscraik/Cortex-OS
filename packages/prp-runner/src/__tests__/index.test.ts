/**
 * @file index.test.ts
 * @description TDD Tests for package exports
 */

import { describe, it, expect } from 'vitest';
import { createPRPOrchestrator } from '../index.js';

describe('Package Exports', () => {
  it('should export createPRPOrchestrator factory', () => {
    expect(createPRPOrchestrator).toBeDefined();
    expect(typeof createPRPOrchestrator).toBe('function');
  });

  it('should create PRP orchestrator instance from factory', () => {
    const orchestrator = createPRPOrchestrator();
    expect(typeof orchestrator.getNeuronCount).toBe('function');
  });
});
