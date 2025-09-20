/**
 * @fileoverview Health Checker Tests - TDD Implementation
 * @company brAInwav
 * @version 1.0.0
 *
 * TDD Test Suite for Health Checker Component
 * Co-authored-by: brAInwav Development Team
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  HealthCheck,
  HealthCheckConfig
} from '../../monitoring/health-checker.js';
import { HealthChecker } from '../../monitoring/health-checker.js';

describe('HealthChecker - TDD Implementation', () => {
  let healthChecker: HealthChecker;
  let mockCheck: HealthCheck;

  beforeEach(() => {
    const config: HealthCheckConfig = {
      defaultTimeout: 5000,
      defaultInterval: 30000,
    };
    healthChecker = new HealthChecker(config);

    mockCheck = {
      name: 'test-service',
      critical: true,
      timeout: 1000,
      check: vi.fn().mockResolvedValue({
        name: 'test-service',
        status: 'healthy' as const,
        timestamp: new Date(),
        responseTime: 50,
        details: { connected: true },
      }),
    };
  });

  afterEach(() => {
    healthChecker.stop();
    vi.clearAllMocks();
  });

  describe('Health Check Registration', () => {
    it('should register a health check successfully', () => {
      // Arrange & Act
      healthChecker.register(mockCheck);

      // Assert
      expect(healthChecker.getRegisteredChecks()).toContain(mockCheck.name);
    });

    it('should prevent duplicate health check registration', () => {
      // Arrange
      healthChecker.register(mockCheck);

      // Act & Assert
      expect(() => healthChecker.register(mockCheck)).toThrow(
        'Health check with name "test-service" already exists',
      );
    });

    it('should validate health check configuration on registration', () => {
      // Arrange
      const invalidCheck = {
        ...mockCheck,
        name: '',
      };

      // Act & Assert
      expect(() => healthChecker.register(invalidCheck)).toThrow('Health check name is required');
    });
  });

  describe('Health Check Execution', () => {
    beforeEach(() => {
      healthChecker.register(mockCheck);
    });

    it('should execute a single health check successfully', async () => {
      // Act
      const result = await healthChecker.runCheck('test-service');

      // Assert
      expect(result).toMatchObject({
        name: 'test-service',
        status: 'healthy',
        responseTime: expect.any(Number),
      });
      expect(mockCheck.check).toHaveBeenCalledOnce();
    });

    it('should handle health check timeout', async () => {
      // Arrange
      const slowCheck: HealthCheck = {
        ...mockCheck,
        name: 'slow-service',
        timeout: 100,
        check: vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 200))),
      };
      healthChecker.register(slowCheck);

      // Act
      const result = await healthChecker.runCheck('slow-service');

      // Assert
      expect(result.status).toBe('unhealthy');
      expect(result.message).toContain('timeout');
    });

    it('should handle health check errors gracefully', async () => {
      // Arrange
      const failingCheck: HealthCheck = {
        ...mockCheck,
        name: 'failing-service',
        check: vi.fn().mockRejectedValue(new Error('Service unavailable')),
      };
      healthChecker.register(failingCheck);

      // Act
      const result = await healthChecker.runCheck('failing-service');

      // Assert
      expect(result.status).toBe('unhealthy');
      expect(result.message).toContain('Service unavailable');
    });

    it('should throw error when checking non-existent health check', async () => {
      // Act & Assert
      await expect(healthChecker.runCheck('non-existent')).rejects.toThrow(
        'Health check "non-existent" not found',
      );
    });
  });

  describe('System Health Assessment', () => {
    beforeEach(() => {
      // Register multiple health checks
      healthChecker.register(mockCheck);

      const databaseCheck: HealthCheck = {
        name: 'database',
        critical: true,
        check: vi.fn().mockResolvedValue({
          name: 'database',
          status: 'healthy' as const,
          timestamp: new Date(),
          responseTime: 25,
        }),
      };
      healthChecker.register(databaseCheck);

      const cacheCheck: HealthCheck = {
        name: 'cache',
        critical: false,
        check: vi.fn().mockResolvedValue({
          name: 'cache',
          status: 'degraded' as const,
          timestamp: new Date(),
          responseTime: 100,
        }),
      };
      healthChecker.register(cacheCheck);
    });

    it('should assess overall system health as healthy when all critical services are healthy', async () => {
      // Act
      const systemHealth = await healthChecker.getSystemHealth();

      // Assert
      expect(systemHealth.overall).toBe('healthy');
      expect(systemHealth.summary.total).toBe(3);
      expect(systemHealth.summary.healthy).toBe(2);
      expect(systemHealth.summary.degraded).toBe(1);
    });

    it('should assess overall system health as degraded when non-critical services fail', async () => {
      // Arrange - Make cache unhealthy
      const cacheCheck = healthChecker.getRegisteredChecks().find((name) => name === 'cache');
      expect(cacheCheck).toBeDefined();

      // Mock cache as unhealthy
      const unhealthyCache: HealthCheck = {
        name: 'cache',
        critical: false,
        check: vi.fn().mockResolvedValue({
          name: 'cache',
          status: 'unhealthy' as const,
          timestamp: new Date(),
          responseTime: 0,
          error: 'Connection failed',
        }),
      };

      // Re-register with unhealthy response
      healthChecker.unregister('cache');
      healthChecker.register(unhealthyCache);

      // Act
      const systemHealth = await healthChecker.getSystemHealth();

      // Assert
      expect(systemHealth.overall).toBe('degraded');
      expect(systemHealth.summary.unhealthy).toBe(1);
    });

    it('should assess overall system health as unhealthy when critical services fail', async () => {
      // Arrange - Make critical service unhealthy
      const failingCriticalCheck: HealthCheck = {
        name: 'critical-service',
        critical: true,
        check: vi.fn().mockResolvedValue({
          name: 'critical-service',
          status: 'unhealthy' as const,
          timestamp: new Date(),
          responseTime: 0,
          error: 'Critical failure',
        }),
      };
      healthChecker.register(failingCriticalCheck);

      // Act
      const systemHealth = await healthChecker.getSystemHealth();

      // Assert
      expect(systemHealth.overall).toBe('unhealthy');
    });
  });

  describe('Liveness and Readiness Probes', () => {
    it('should provide liveness probe indicating process is alive', async () => {
      // Act
      const liveness = await healthChecker.getLivenessProbe();

      // Assert
      expect(liveness).toMatchObject({
        status: 'alive',
        uptime: expect.any(Number),
        timestamp: expect.any(String),
      });
    });

    it('should provide readiness probe based on critical services', async () => {
      // Arrange
      healthChecker.register(mockCheck); // Critical service

      // Act
      const readiness = await healthChecker.getReadinessProbe();

      // Assert
      expect(readiness).toMatchObject({
        ready: true,
        checks: expect.any(Object),
      });
    });

    it('should mark readiness as false when critical services are unhealthy', async () => {
      // Arrange
      const criticalFailingCheck: HealthCheck = {
        name: 'critical-db',
        critical: true,
        check: vi.fn().mockResolvedValue({
          name: 'critical-db',
          status: 'unhealthy' as const,
          timestamp: new Date(),
          responseTime: 0,
          error: 'Database connection failed',
        }),
      };
      healthChecker.register(criticalFailingCheck);

      // Act
      const readiness = await healthChecker.getReadinessProbe();

      // Assert
      expect(readiness.ready).toBe(false);
    });
  });

  describe('Health Check Lifecycle', () => {
    it('should start and stop health checker properly', () => {
      // Act
      healthChecker.start();
      expect(healthChecker.isRunning()).toBe(true);

      healthChecker.stop();
      expect(healthChecker.isRunning()).toBe(false);
    });

    it('should handle multiple start calls gracefully', () => {
      // Act
      healthChecker.start();
      healthChecker.start(); // Should not throw or cause issues

      // Assert
      expect(healthChecker.isRunning()).toBe(true);
    });

    it('should unregister health checks properly', () => {
      // Arrange
      healthChecker.register(mockCheck);
      expect(healthChecker.getRegisteredChecks()).toContain('test-service');

      // Act
      healthChecker.unregister('test-service');

      // Assert
      expect(healthChecker.getRegisteredChecks()).not.toContain('test-service');
    });

    it('should handle unregistering non-existent health checks gracefully', () => {
      // Act & Assert
      expect(() => healthChecker.unregister('non-existent')).not.toThrow();
    });
  });

  describe('Performance and Metrics', () => {
    it('should track response times for health checks', async () => {
      // Arrange
      healthChecker.register(mockCheck);

      // Act
      const result = await healthChecker.runCheck('test-service');

      // Assert
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(typeof result.responseTime).toBe('number');
    });

    it('should provide health check history', async () => {
      // Arrange
      healthChecker.register(mockCheck);

      // Act
      await healthChecker.runCheck('test-service');
      await healthChecker.runCheck('test-service');

      const results = healthChecker.getAllResults();

      // Assert
      expect(results).toHaveLength(1); // Latest result only
      expect(results[0].name).toBe('test-service');
    });
  });

  describe('Integration with brAInwav Standards', () => {
    it('should include brAInwav branding in health responses', async () => {
      // Act
      const systemHealth = await healthChecker.getSystemHealth();

      // Assert
      expect(systemHealth.version).toBeDefined();
      expect(systemHealth.service).toContain('brAInwav');
    });

    it('should follow brAInwav error handling patterns', async () => {
      // Arrange
      const errorCheck: HealthCheck = {
        name: 'error-service',
        critical: false,
        check: vi.fn().mockRejectedValue(new Error('Test error')),
      };
      healthChecker.register(errorCheck);

      // Act
      const result = await healthChecker.runCheck('error-service');

      // Assert
      expect(result).toMatchObject({
        status: 'unhealthy',
        message: expect.stringContaining('Test error'),
        timestamp: expect.any(String),
      });
    });
  });
});
