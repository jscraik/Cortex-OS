/**
 * nO Master Agent Loop - Prometheus Metrics Integration
 * 
 * This module provides comprehensive metrics collection for the nO system
 * using Prometheus client library for monitoring and observability.
 * 
 * Co-authored-by: brAInwav Development Team
 */

import { collectDefaultMetrics, Counter, Gauge, Histogram, register, Summary } from 'prom-client';

// Initialize default metrics collection
collectDefaultMetrics({
  prefix: 'no_system_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

/**
 * nO System Request Metrics
 */
export const requestMetrics = {
  // Total requests processed
  totalRequests: new Counter({
    name: 'no_requests_total',
    help: 'Total number of nO execution requests processed',
    labelNames: ['priority', 'complexity_level', 'status'],
  }),

  // Request duration histogram
  requestDuration: new Histogram({
    name: 'no_request_duration_seconds',
    help: 'Duration of nO execution requests in seconds',
    labelNames: ['priority', 'complexity_level'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  }),

  // Active concurrent requests
  activeRequests: new Gauge({
    name: 'no_active_requests',
    help: 'Number of currently active nO execution requests',
  }),

  // Request queue depth
  queueDepth: new Gauge({
    name: 'no_queue_depth',
    help: 'Number of requests waiting in the execution queue',
    labelNames: ['priority'],
  }),
};

/**
 * nO Agent Pool Metrics
 */
export const agentMetrics = {
  // Total available agents
  availableAgents: new Gauge({
    name: 'no_agents_available',
    help: 'Number of available agents in the pool',
    labelNames: ['specialization'],
  }),

  // Active agents currently executing tasks
  activeAgents: new Gauge({
    name: 'no_agents_active',
    help: 'Number of agents currently executing tasks',
    labelNames: ['specialization'],
  }),

  // Agent utilization percentage
  agentUtilization: new Gauge({
    name: 'no_agent_utilization_percent',
    help: 'Percentage of agent pool currently utilized',
  }),

  // Agent task completion rate
  taskCompletionRate: new Gauge({
    name: 'no_agent_task_completion_rate',
    help: 'Rate of task completion per agent per minute',
    labelNames: ['agent_id', 'specialization'],
  }),
};

/**
 * nO System Performance Metrics
 */
export const performanceMetrics = {
  // CPU utilization
  cpuUtilization: new Gauge({
    name: 'no_cpu_utilization_percent',
    help: 'CPU utilization percentage of the nO system',
  }),

  // Memory utilization
  memoryUtilization: new Gauge({
    name: 'no_memory_utilization_percent',
    help: 'Memory utilization percentage of the nO system',
  }),

  // Response time percentiles
  responseTime: new Summary({
    name: 'no_response_time_seconds',
    help: 'Response time distribution for nO requests',
    labelNames: ['endpoint'],
    percentiles: [0.5, 0.9, 0.95, 0.99],
  }),

  // Throughput
  throughput: new Gauge({
    name: 'no_throughput_requests_per_second',
    help: 'Current throughput in requests per second',
  }),
};

/**
 * nO Error and Reliability Metrics
 */
export const errorMetrics = {
  // Total errors by type
  totalErrors: new Counter({
    name: 'no_errors_total',
    help: 'Total number of errors encountered',
    labelNames: ['error_type', 'component', 'severity'],
  }),

  // Circuit breaker states
  circuitBreakerState: new Gauge({
    name: 'no_circuit_breaker_state',
    help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
    labelNames: ['service'],
  }),

  // Retry attempts
  retryAttempts: new Counter({
    name: 'no_retry_attempts_total',
    help: 'Total number of retry attempts',
    labelNames: ['operation', 'success'],
  }),

  // Service availability
  serviceAvailability: new Gauge({
    name: 'no_service_availability_percent',
    help: 'Service availability percentage',
    labelNames: ['service'],
  }),
};

/**
 * nO Security Metrics
 */
export const securityMetrics = {
  // Authentication attempts
  authAttempts: new Counter({
    name: 'no_auth_attempts_total',
    help: 'Total authentication attempts',
    labelNames: ['method', 'result'],
  }),

  // Authorization decisions
  authzDecisions: new Counter({
    name: 'no_authz_decisions_total',
    help: 'Total authorization decisions',
    labelNames: ['resource', 'action', 'result'],
  }),

  // Security violations
  securityViolations: new Counter({
    name: 'no_security_violations_total',
    help: 'Total security violations detected',
    labelNames: ['violation_type', 'severity'],
  }),

  // Rate limiting hits
  rateLimitHits: new Counter({
    name: 'no_rate_limit_hits_total',
    help: 'Total rate limit hits',
    labelNames: ['client_id', 'endpoint'],
  }),
};

/**
 * Metrics Collection Functions
 */
export class MetricsCollector {
  /**
   * Record request processing metrics
   */
  recordRequest(
    priority: string,
    complexity: number,
    duration: number,
    status: 'success' | 'error' | 'timeout'
  ): void {
    const complexityLevel = this.getComplexityLevel(complexity);

    requestMetrics.totalRequests
      .labels(priority, complexityLevel, status)
      .inc();

    requestMetrics.requestDuration
      .labels(priority, complexityLevel)
      .observe(duration);
  }

  /**
   * Update agent pool metrics
   */
  updateAgentMetrics(
    available: number,
    active: number,
    specialization: string = 'general'
  ): void {
    agentMetrics.availableAgents
      .labels(specialization)
      .set(available);

    agentMetrics.activeAgents
      .labels(specialization)
      .set(active);

    const utilization = available > 0 ? (active / available) * 100 : 0;
    agentMetrics.agentUtilization.set(utilization);
  }

  /**
   * Record system performance metrics
   */
  recordPerformance(
    cpuPercent: number,
    memoryPercent: number,
    throughput: number
  ): void {
    performanceMetrics.cpuUtilization.set(cpuPercent);
    performanceMetrics.memoryUtilization.set(memoryPercent);
    performanceMetrics.throughput.set(throughput);
  }

  /**
   * Record error occurrence
   */
  recordError(
    errorType: string,
    component: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): void {
    errorMetrics.totalErrors
      .labels(errorType, component, severity)
      .inc();
  }

  /**
   * Record security event
   */
  recordSecurityEvent(
    eventType: 'auth' | 'authz' | 'violation' | 'rate_limit',
    details: Record<string, string>
  ): void {
    switch (eventType) {
      case 'auth':
        securityMetrics.authAttempts
          .labels(details.method || 'unknown', details.result || 'unknown')
          .inc();
        break;
      case 'authz':
        securityMetrics.authzDecisions
          .labels(
            details.resource || 'unknown',
            details.action || 'unknown',
            details.result || 'unknown'
          )
          .inc();
        break;
      case 'violation':
        securityMetrics.securityViolations
          .labels(
            details.violation_type || 'unknown',
            details.severity || 'medium'
          )
          .inc();
        break;
      case 'rate_limit':
        securityMetrics.rateLimitHits
          .labels(
            details.client_id || 'unknown',
            details.endpoint || 'unknown'
          )
          .inc();
        break;
    }
  }

  /**
   * Get complexity level from numeric complexity
   */
  private getComplexityLevel(complexity: number): string {
    if (complexity < 0.3) return 'low';
    if (complexity < 0.7) return 'medium';
    return 'high';
  }

  /**
   * Get all metrics for scraping
   */
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * Clear all metrics (for testing)
   */
  clearMetrics(): void {
    register.clear();
  }
}

// Export singleton instance
export const metricsCollector = new MetricsCollector();

/**
 * Health check metrics endpoint
 */
export const healthMetrics = {
  // System health status
  healthStatus: new Gauge({
    name: 'no_health_status',
    help: 'Overall system health status (1=healthy, 0=unhealthy)',
  }),

  // Component health status
  componentHealth: new Gauge({
    name: 'no_component_health',
    help: 'Individual component health status',
    labelNames: ['component'],
  }),

  // Last health check timestamp
  lastHealthCheck: new Gauge({
    name: 'no_last_health_check_timestamp',
    help: 'Timestamp of last health check',
  }),
};
