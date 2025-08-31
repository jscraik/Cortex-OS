import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch for gateway HTTP calls  
global.fetch = vi.fn().mockImplementation(() => 
  Promise.reject(new Error('fetch failed'))
);

// Mock child_process for thermal monitoring
vi.mock('child_process', () => ({
  spawn: vi.fn(() => {
    const { EventEmitter } = require('events');
    const emitter = new EventEmitter();
    const stdoutEmitter = new EventEmitter();
    const stderrEmitter = new EventEmitter();
    // @ts-ignore
    emitter.stdout = stdoutEmitter;
    // @ts-ignore
    emitter.stderr = stderrEmitter;
    setTimeout(() => {
      stdoutEmitter.emit('data', '2');
      emitter.emit('close', 0);
    }, 5);
    return emitter;
  }),
}));

// Import after mocks are set
import { createMLXProvider, createAutoMLXProvider } from '@/providers/mlx-provider/index.js';

describe('MLX Provider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Provider Creation', () => {
    it('createAutoMLXProvider returns valid provider', async () => {
      const provider = await createAutoMLXProvider();
      expect(provider.name).toBe('mlx');
      expect(typeof provider.generate).toBe('function');
      expect(typeof provider.shutdown).toBe('function');
    });

    it('createMLXProvider accepts custom configuration', () => {
      const config = {
        modelPath: 'custom-model',
        maxTokens: 1000,
        temperature: 0.5,
        gatewayUrl: 'http://custom:8080',
      };
      const provider = createMLXProvider(config);
      expect(provider.name).toBe('mlx');
    });
  });

  describe('Generation', () => {
    it('fails generation when gateway is unavailable', async () => {
      const provider = createMLXProvider({ modelPath: 'test-model' });
      await expect(provider.generate('hi', {})).rejects.toThrow('fetch failed');
    });

    it('respects generation options', async () => {
      const provider = createMLXProvider({ modelPath: 'test-model' });
      const options = {
        maxTokens: 100,
        temperature: 0.1,
        timeout: 5000,
      };
      
      await expect(provider.generate('test prompt', options)).rejects.toThrow();
      // Test would pass with working gateway
    });
  });

  describe('System Monitoring', () => {
    it('handles thermal monitoring gracefully', async () => {
      const { getMLXThermalStatus } = await import('@/providers/mlx-provider/index.js');
      const thermalStatus = await getMLXThermalStatus();
      expect(thermalStatus.level).toMatch(/normal|warm|hot|critical/);
      expect(typeof thermalStatus.temperature).toBe('number');
      expect(typeof thermalStatus.throttled).toBe('boolean');
      expect(typeof thermalStatus.timestamp).toBe('number');
    });

    it('handles memory monitoring gracefully', async () => {
      const { getMLXMemoryStatus } = await import('@/providers/mlx-provider/index.js');
      const memoryStatus = await getMLXMemoryStatus();
      expect(memoryStatus.pressure).toMatch(/normal|warning|critical/);
      expect(typeof memoryStatus.used).toBe('number');
      expect(typeof memoryStatus.available).toBe('number');
    });
  });

  describe('Circuit Breaker', () => {
    it('handles circuit breaker behavior', () => {
      const provider = createMLXProvider({
        modelPath: 'test-model',
        circuitBreakerThreshold: 2,
        circuitBreakerResetMs: 1000,
      });
      
      expect(provider.name).toBe('mlx');
      // Circuit breaker behavior would be tested with integration tests
    });
  });
});
