/**
 * Simple test to verify Cerebrum functionality
 */

import { describe, it, expect } from 'vitest';
import { Cerebrum } from '../../src/cerebrum/index.js';
import { DEFAULT_CONFIG } from '../../src/core/config.js';

describe('Cerebrum Functionality', () => {
  it('should create a plan from intent', async () => {
    const cerebrum = new Cerebrum({ config: DEFAULT_CONFIG });
    const context = {
      intent: 'Create a new React component for user profiles',
    };
    
    const plan = await cerebrum.plan(context);
    
    expect(plan).toBeDefined();
    expect(plan.title).toBe('Create a new React component for user profiles');
    expect(plan.steps.length).toBeGreaterThan(0);
  });

  it('should simulate a plan', async () => {
    const cerebrum = new Cerebrum({ config: DEFAULT_CONFIG });
    const context = {
      intent: 'Create a new React component for user profiles',
    };
    
    const plan = await cerebrum.plan(context);
    const simulation = await cerebrum.simulate(plan);
    
    expect(simulation).toBeDefined();
    expect(typeof simulation.success).toBe('boolean');
  });

  it('should critique input', async () => {
    const cerebrum = new Cerebrum({ config: DEFAULT_CONFIG });
    const input = 'This is a sample input for critique';
    
    const critique = await cerebrum.critique(input);
    
    expect(critique).toBeDefined();
    expect(typeof critique.score).toBe('number');
  });

  it('should teach from content', async () => {
    const cerebrum = new Cerebrum({ config: DEFAULT_CONFIG });
    const content = 'This is sample content for teaching';
    
    const teaching = await cerebrum.teach(content);
    
    expect(teaching).toBeDefined();
    expect(typeof teaching.content).toBe('string');
  });
});