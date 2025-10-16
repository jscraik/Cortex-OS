import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  getGPUAccelerationManager,
  stopGPUAccelerationManager,
  type GPUAccelerationConfig,
  type GPUDeviceInfo
} from '../../src/acceleration/GPUAcceleration.js';

const TEST_CONFIG: GPUAccelerationConfig = {
  enabled: true,
  cuda: {
    enabled: true,
    deviceIds: [0],
    maxMemoryUsage: 1024,
    batchSize: 16,
    maxConcurrentBatches: 2,
    timeout: 30_000
  },
  fallback: {
    toCPU: true,
    cpuBatchSize: 8,
    maxQueueSize: 64
  },
  monitoring: {
    enabled: false,
    metricsInterval: 5_000,
    performanceThreshold: 2_000,
    memoryThreshold: 90
  },
  optimization: {
    autoBatching: false,
    batchTimeout: 50,
    memoryOptimization: true,
    preferGPUForBatches: true
  }
};

const createEmbedder = () =>
  vi.fn(async (texts: string[]) =>
    texts.map(() => Array.from({ length: 384 }, () => Math.random()))
  );

const createSparseEmbedder = () =>
  vi.fn(async (texts: string[]) => texts.map((text) => ({ tokens: text.length })));

async function setupManager() {
  await stopGPUAccelerationManager();

  const manager = getGPUAccelerationManager(TEST_CONFIG);
  const denseEmbedder = createEmbedder();
  const sparseEmbedder = createSparseEmbedder();

  const mockDevice: GPUDeviceInfo = {
    id: 0,
    name: 'Test GPU 0',
    memoryTotal: 2_048,
    memoryUsed: 0,
    memoryFree: 2_048,
    computeCapability: '8.6',
    isAvailable: true,
    utilization: 0
  };

  vi.spyOn(manager as any, 'detectRealGPUDevices').mockResolvedValue([mockDevice]);
  vi.spyOn(manager as any, 'detectWebGPUs').mockResolvedValue([]);

  await manager.initialize(denseEmbedder, sparseEmbedder);

  return { manager, denseEmbedder, sparseEmbedder, device: mockDevice } as const;
}

beforeEach(async () => {
  await stopGPUAccelerationManager();
});

afterEach(async () => {
  await stopGPUAccelerationManager();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('GPUAccelerationManager memory lifecycle', () => {
  test('releases GPU buffers after successful embedding generation', async () => {
    const { manager, device } = await setupManager();

    const results = await manager.generateEmbeddings(
      ['alpha', 'beta', 'gamma'],
      { preferGPU: true, batchId: 'success-batch' }
    );

    expect(results).toHaveLength(3);

    const activeReservations: Map<string, unknown> = (manager as any).activeReservations;
    const trackedBuffers: Map<string, unknown> = (manager as any).allocatedBuffers;

    expect(activeReservations.size).toBe(0);
    expect(trackedBuffers.size).toBe(0);
    expect(device.memoryUsed).toBe(0);
    expect(device.memoryFree).toBe(device.memoryTotal);
  });

  test('releases GPU buffers when embedding generation fails', async () => {
    const { manager, denseEmbedder, device } = await setupManager();

    denseEmbedder.mockImplementationOnce(async () => {
      throw new Error('Simulated GPU failure');
    });

    const results = await manager.generateEmbeddings(['delta', 'epsilon'], {
      preferGPU: true,
      batchId: 'failure-batch'
    });

    expect(results).toHaveLength(2);
    expect(results.every((result) => result.device === 'cpu')).toBe(true);

    const activeReservations: Map<string, unknown> = (manager as any).activeReservations;
    const trackedBuffers: Map<string, unknown> = (manager as any).allocatedBuffers;

    expect(activeReservations.size).toBe(0);
    expect(trackedBuffers.size).toBe(0);
    expect(device.memoryUsed).toBe(0);
    expect(device.memoryFree).toBe(device.memoryTotal);
  });

  test('stop() forces release of leaked GPU buffers', async () => {
    const { manager, device } = await setupManager();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const reservation = (manager as any).reserveDeviceMemory(device, 256, 'leak-batch');
    (manager as any).trackGPUBuffer(reservation, device, 256, 'leak-batch');

    const trackedBuffers: Map<string, { release: (success: boolean) => void }> =
      (manager as any).allocatedBuffers;
    expect(trackedBuffers.size).toBe(1);

    await manager.stop();

    expect(trackedBuffers.size).toBe(0);
    expect(device.memoryUsed).toBe(0);
    expect(device.memoryFree).toBe(device.memoryTotal);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('GPU buffers leaked during shutdown'),
      expect.objectContaining({ leakedBuffers: 1 })
    );

    warnSpy.mockRestore();
  });
});
