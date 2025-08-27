/**
 * @file index.test.ts
 * @description TDD Tests for package exports
 */

import { describe, it, expect } from 'vitest';
import { PRPOrchestrator } from '../index.js';

describe('Package Exports', () => {
  it('should export PRPOrchestrator class', () => {
    expect(PRPOrchestrator).toBeDefined();
    expect(typeof PRPOrchestrator).toBe('function');
  });

  it('should create PRPOrchestrator instance from main export', () => {
    const orchestrator = new PRPOrchestrator();
    expect(orchestrator).toBeInstanceOf(PRPOrchestrator);
  });
});
