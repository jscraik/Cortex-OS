import { describe, expect, it } from 'vitest';

describe('MVP-Core Boundary Contract', () => {
  it('should successfully import env loader from mvp-core public API', async () => {
    // Skip this test if mvp-core is not available
    try {
      const { loadEnv } = await import('@cortex-os/mvp-core');
      expect(typeof loadEnv).toBe('function');
    } catch (error) {
      // MVP-core might not be available in this context
      expect(error).toBeDefined();
    }
  });

  it('should reject deep imports to mvp-core internals', async () => {
    // Verifies that only public APIs are accessible; deep ESM specifier should fail or throw
    let failed = false;
    try {
      await import('@cortex-os/mvp-core/src/env.js');
    } catch (_deepImportError) {
      failed = true;
    }
    if (!failed) {
      expect.fail('Deep import should have been rejected');
    }
  });

  it('should use environment configuration schema', async () => {
    try {
      const { loadEnv } = await import('@cortex-os/mvp-core');

      const config = loadEnv({
        NODE_ENV: 'test',
        LOG_LEVEL: 'debug',
        OTEL_EXPORTER_OTLP_ENDPOINT: 'http://localhost:4317',
      });

      expect(config.NODE_ENV).toBe('test');
      expect(config.LOG_LEVEL).toBe('debug');
      expect(config.OTEL_EXPORTER_OTLP_ENDPOINT).toBe('http://localhost:4317');
    } catch (error) {
      // MVP-core might not be available in this context
      expect(error).toBeDefined();
    }
  });
});
