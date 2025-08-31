/**
 * @file index.test.ts
 * @description TDD Tests for package exports
 */

import { describe, it, expect } from 'vitest';
import { PRPOrchestrator } from '../index.js';

describe('Package Exports', () => {
  it('should export PRPOrchestrator class', () => {
    expect(PRPOrchestrator).toBeDefined();
    const orchestrator = new PRPOrchestrator();
    expect(typeof orchestrator.getNeuronCount).toBe('function');
  });
});
