import { z } from 'zod';

export const HealthStatus = z.enum(['healthy', 'degraded', 'unhealthy']);

export const HealthCheckResultSchema = z.object({
  status: HealthStatus,
  message: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  duration: z.number().optional(),
});

export const HealthReportSchema = z.object({
  status: HealthStatus,
  checks: z.array(z.object({
    name: z.string(),
    result: HealthCheckResultSchema,
  })),
  timestamp: z.string().datetime(),
  uptime: z.number().optional(),
});

export type HealthStatusType = z.infer<typeof HealthStatus>;
export type HealthCheckResult = z.infer<typeof HealthCheckResultSchema>;
export type HealthReport = z.infer<typeof HealthReportSchema>;

export interface HealthCheck {
  name: string;
  check(): Promise<HealthCheckResult>;
}

export class A2AHealthChecker {
  private readonly checks: HealthCheck[] = [];
  private readonly startTime = Date.now();

  register(check: HealthCheck): void {
    this.checks.push(check);
  }

  async checkHealth(): Promise<HealthReport> {
    const checkResults: Array<{ name: string; result: HealthCheckResult }> = [];

    for (const healthCheck of this.checks) {
      try {
        const startTime = Date.now();
        const result = await healthCheck.check();
        const duration = Date.now() - startTime;

        checkResults.push({
          name: healthCheck.name,
          result: { ...result, duration },
        });
      } catch (error) {
        checkResults.push({
          name: healthCheck.name,
          result: {
            status: 'unhealthy',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    }

    const overallStatus = this.determineOverallStatus(checkResults);

    return {
      status: overallStatus,
      checks: checkResults,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
    };
  }

  private determineOverallStatus(
    results: Array<{ name: string; result: HealthCheckResult }>
  ): HealthStatusType {
    const statuses = results.map(r => r.result.status);

    if (statuses.some(s => s === 'unhealthy')) {
      return 'unhealthy';
    }

    if (statuses.some(s => s === 'degraded')) {
      return 'degraded';
    }

    return 'healthy';
  }
}

// Common health checks
export class QueueHealthCheck implements HealthCheck {
  name = 'queue';

  constructor(
    private readonly getQueueDepth: () => Promise<number>,
    private readonly getMaxQueueDepth: () => Promise<number>
  ) { }

  async check(): Promise<HealthCheckResult> {
    try {
      const depth = await this.getQueueDepth();
      const maxDepth = await this.getMaxQueueDepth();

      const utilizationPercent = (depth / maxDepth) * 100;

      if (utilizationPercent >= 95) {
        return {
          status: 'unhealthy',
          message: 'Queue at critical capacity',
          metadata: { depth, maxDepth, utilization: utilizationPercent },
        };
      }

      if (utilizationPercent >= 80) {
        return {
          status: 'degraded',
          message: 'Queue nearing capacity',
          metadata: { depth, maxDepth, utilization: utilizationPercent },
        };
      }

      return {
        status: 'healthy',
        metadata: { depth, maxDepth, utilization: utilizationPercent },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Queue check failed',
      };
    }
  }
}

export class DatabaseHealthCheck implements HealthCheck {
  name = 'database';

  constructor(private readonly testConnection: () => Promise<boolean>) { }

  async check(): Promise<HealthCheckResult> {
    try {
      const startTime = Date.now();
      const isConnected = await this.testConnection();
      const responseTime = Date.now() - startTime;

      if (!isConnected) {
        return {
          status: 'unhealthy',
          message: 'Database connection failed',
        };
      }

      if (responseTime > 5000) { // 5 seconds
        return {
          status: 'degraded',
          message: 'Database response time is slow',
          metadata: { responseTime },
        };
      }

      return {
        status: 'healthy',
        metadata: { responseTime },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Database check failed',
      };
    }
  }
}

export class CircuitBreakerHealthCheck implements HealthCheck {
  name = 'circuit-breaker';

  constructor(
    private readonly getCircuitBreakerStatus: () => Promise<'closed' | 'open' | 'half-open'>
  ) { }

  async check(): Promise<HealthCheckResult> {
    try {
      const status = await this.getCircuitBreakerStatus();

      if (status === 'open') {
        return {
          status: 'unhealthy',
          message: 'Circuit breaker is open',
          metadata: { circuitBreakerStatus: status },
        };
      }

      if (status === 'half-open') {
        return {
          status: 'degraded',
          message: 'Circuit breaker is half-open',
          metadata: { circuitBreakerStatus: status },
        };
      }

      return {
        status: 'healthy',
        metadata: { circuitBreakerStatus: status },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Circuit breaker check failed',
      };
    }
  }
}

export class MemoryHealthCheck implements HealthCheck {
  name = 'memory';

  constructor(private readonly criticalThresholdPercent: number = 90) { }

  async check(): Promise<HealthCheckResult> {
    try {
      const memUsage = process.memoryUsage();
      const totalMemory = memUsage.heapTotal + memUsage.external;
      const usedMemory = memUsage.heapUsed;
      const usagePercent = (usedMemory / totalMemory) * 100;

      if (usagePercent >= this.criticalThresholdPercent) {
        return {
          status: 'unhealthy',
          message: 'Memory usage is critical',
          metadata: { usagePercent, usedMemory, totalMemory },
        };
      }

      if (usagePercent >= this.criticalThresholdPercent * 0.8) {
        return {
          status: 'degraded',
          message: 'Memory usage is high',
          metadata: { usagePercent, usedMemory, totalMemory },
        };
      }

      return {
        status: 'healthy',
        metadata: { usagePercent, usedMemory, totalMemory },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Memory check failed',
      };
    }
  }
}

export const createA2AHealthChecker = (): A2AHealthChecker => {
  return new A2AHealthChecker();
};

export const createQueueHealthCheck = (
  getQueueDepth: () => Promise<number>,
  getMaxQueueDepth: () => Promise<number>
): QueueHealthCheck => {
  return new QueueHealthCheck(getQueueDepth, getMaxQueueDepth);
};

export const createDatabaseHealthCheck = (
  testConnection: () => Promise<boolean>
): DatabaseHealthCheck => {
  return new DatabaseHealthCheck(testConnection);
};

export const createCircuitBreakerHealthCheck = (
  getCircuitBreakerStatus: () => Promise<'closed' | 'open' | 'half-open'>
): CircuitBreakerHealthCheck => {
  return new CircuitBreakerHealthCheck(getCircuitBreakerStatus);
};

export const createMemoryHealthCheck = (
  criticalThresholdPercent?: number
): MemoryHealthCheck => {
  return new MemoryHealthCheck(criticalThresholdPercent);
};
