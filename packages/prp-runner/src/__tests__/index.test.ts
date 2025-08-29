/**
 * @file index.test.ts
 * @description TDD Tests for package exports
 */

import { describe, it, expect } from 'vitest';
import { createPRPOrchestrator, PRPOrchestrator } from '../index.js';

describe('Package Exports', () => {
  it('should export createPRPOrchestrator factory', () => {
    expect(createPRPOrchestrator).toBeDefined();
    expect(typeof createPRPOrchestrator).toBe('function');
  });

  it('should retain PRPOrchestrator alias for backward compatibility', () => {
    expect(PRPOrchestrator).toBe(createPRPOrchestrator);
  });

  it('should create PRP orchestrator instance from factory', () => {
    const orchestrator = createPRPOrchestrator();
    expect(typeof orchestrator.getNeuronCount).toBe('function');
  });
});
