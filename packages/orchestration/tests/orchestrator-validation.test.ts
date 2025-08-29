import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MLXFirstOrchestrator } from '../src/coordinator/mlx-first-coordinator.js';
import { OrchestrationError } from '../src/errors.js';

describe('MLXFirstOrchestrator input validation', () => {
  let orchestrator: MLXFirstOrchestrator;

  beforeEach(() => {
    vi.useFakeTimers();
    orchestrator = new MLXFirstOrchestrator();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('rejects invalid decomposeTask inputs', async () => {
    await expect(
      orchestrator.decomposeTask('task', ['agent'], { maxParallelism: -1 }),
    ).rejects.toBeInstanceOf(OrchestrationError);
  });

  it('rejects empty task in coordinateMultiModalTask', async () => {
    await expect(orchestrator.coordinateMultiModalTask('')).rejects.toBeInstanceOf(
      OrchestrationError,
    );
  });

  it('rejects non-string codeTask in orchestrateCodeTask', async () => {
    await expect(orchestrator.orchestrateCodeTask(123 as any)).rejects.toBeInstanceOf(
      OrchestrationError,
    );
  });
});
