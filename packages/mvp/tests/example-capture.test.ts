import { describe, it, expect } from 'vitest';
import { ExampleCaptureSystem } from '../src/teaching/example-capture.js';

describe('ExampleCaptureSystem', () => {
  it('respects active capture flag', () => {
    const system = new ExampleCaptureSystem();
    system.setCapture(false);

    const blueprint = { title: 'Test', description: 'Test', requirements: [] };

    const result = system.captureExample(
      'workflow',
      { prpPhase: 'strategy', blueprint, inputState: {} },
      {
        type: 'workflow_modification',
        description: 'noop',
        parameters: {},
        timestamp: new Date().toISOString(),
      },
      { resultingState: {}, success: true, learningValue: 1 },
      {},
    );

    expect(result).toBeNull();
    expect(system.getExamples().length).toBe(0);
  });
});
