# brAInwav Flaky Task Retry Strategy with Nx Cloud

This document outlines the comprehensive retry strategy implemented in brAInwav Cortex-OS to automatically handle flaky tasks and improve CI pipeline reliability using Nx Cloud.

## Overview

Flaky tasks can significantly disrupt CI/CD pipelines, causing false failures and reducing development velocity. This implementation leverages Nx Cloud's automatic retry feature alongside our existing robust retry mechanisms to create a multi-layered defense against transient failures.

## Nx Cloud Retry Configuration

### Automatic Task Retry

The following configuration has been implemented in `nx.json`:

```json
{
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx-cloud",
      "options": {
        "retryableOperations": ["test", "e2e", "build"],
        "flakyTaskRetryOptions": {
          "maxRetries": 3,
          "enabled": true,
          "retryDelay": 1000,
          "retryDelayMultiplier": 2,
          "maxRetryDelay": 10000
        }
      }
    }
  }
}
```

### Task-Specific Retry Settings

#### Test Tasks
- **Max Retries**: 3 attempts
- **Initial Delay**: 500ms
- **Retry Pattern**: Exponential backoff
- **Target**: Unit and integration tests

#### E2E Tasks
- **Max Retries**: 2 attempts
- **Initial Delay**: 1000ms
- **Retry Pattern**: Linear backoff
- **Target**: End-to-end test suites

#### Build Tasks
- **Max Retries**: 3 attempts (via Nx Cloud)
- **Initial Delay**: 1000ms
- **Retry Pattern**: Exponential backoff
- **Target**: TypeScript compilation, bundling

## Environment Configuration

### Development Environment

Add to your `.env.local`:

```bash
# Nx Cloud Configuration
NX_CLOUD_ACCESS_TOKEN=your-nx-cloud-access-token-here
NX_CLOUD_DISTRIBUTED_TASK_EXECUTION=true
NX_CLOUD_CACHE=true
NX_CLOUD_RETRY_FLAKY_TASKS=true

# brAInwav Quality Standards
BRAINWAV_STRICT_MODE=false
BRAINWAV_TRACE_ENABLED=true
```

### CI/CD Environment

GitHub Actions workflows include:

```yaml
env:
  NX_CLOUD_ACCESS_TOKEN: ${{ secrets.NX_CLOUD_ACCESS_TOKEN }}
  NX_CLOUD_DISTRIBUTED_TASK_EXECUTION: true
  NX_CLOUD_CACHE: true
  NX_CLOUD_RETRY_FLAKY_TASKS: true
```

## Multi-Layer Retry Strategy

### Layer 1: Application-Level Retry

Existing retry mechanisms in the codebase:

- **RAG Pipeline**: Embedding and reranking operations with circuit breaker patterns
- **MLX Service Bridge**: Model inference with exponential backoff
- **A2A Event Bus**: Message delivery with dead letter queue escalation
- **Memory Providers**: Storage operations with connection retry

### Layer 2: Test Framework Retry

- **Vitest**: Built-in retry for intermittent test failures
- **Python pytest**: Retry decorators for flaky test scenarios
- **E2E Tests**: Browser automation retry for network/timing issues

### Layer 3: Nx Cloud Retry

- **Automatic Detection**: AI-powered flaky task identification
- **Smart Retry**: Context-aware retry decisions
- **Distributed Execution**: Retry across different agents for isolation

### Layer 4: CI/CD Pipeline Retry

- **GitHub Actions**: Workflow-level retry for infrastructure issues
- **Step-Level Retry**: Individual job step retry configuration
- **Matrix Strategy**: Parallel execution with failure tolerance

## Retry Patterns and Best Practices

### Exponential Backoff

Used for transient resource conflicts:

```typescript
const retryDelay = baseDelay * Math.pow(2, attempt - 1);
const jitteredDelay = retryDelay + (Math.random() * 1000);
```

### Circuit Breaker Pattern

Prevents cascade failures:

```typescript
if (consecutiveFailures >= threshold) {
  circuitState = 'OPEN';
  return fallbackResponse();
}
```

### Deterministic Retry

For reproducible test scenarios:

```typescript
const jitter = hashMessageId(messageId) % 1000;
const delay = baseDelay + jitter;
```

## Monitoring and Observability

### Nx Cloud Dashboard

- Real-time retry metrics
- Flaky task identification
- Performance impact analysis
- Historical trend tracking

### brAInwav Telemetry

- Retry attempt logging with correlation IDs
- Circuit breaker state transitions
- Performance degradation alerts
- Quality gate compliance tracking

### Metrics Collection

Key metrics tracked:

- **Retry Success Rate**: Percentage of successful retries
- **Time to Recovery**: Average time from failure to success
- **Flaky Task Frequency**: Tasks requiring multiple attempts
- **Resource Utilization**: Impact of retries on CI resources

## Configuration Guidelines

### When to Enable Retries

✅ **Enable for:**
- Network-dependent operations
- External service integrations
- Resource-intensive computations
- Browser automation tests
- File system operations

❌ **Avoid for:**
- Logic errors in code
- Syntax errors
- Configuration validation
- Schema migrations
- Authentication failures

### Retry Limits

- **Quick Operations** (< 30s): Max 3 retries
- **Medium Operations** (30s - 2min): Max 2 retries  
- **Long Operations** (> 2min): Max 1 retry
- **Critical Path**: No retries (fail fast)

## Troubleshooting

### Common Issues

1. **Excessive Retry Loops**
   - Review retry conditions
   - Check for deterministic failures
   - Reduce retry counts for fast feedback

2. **Resource Exhaustion**
   - Monitor parallel retry execution
   - Implement backpressure mechanisms
   - Use circuit breakers for protection

3. **False Positive Retries**
   - Improve error classification
   - Add specific exception handling
   - Implement smart failure detection

### Debug Commands

```bash
# Check Nx Cloud status
npx nx-cloud status

# View retry configuration
npx nx show project-details <project-name>

# Test retry behavior locally
NX_CLOUD_RETRY_FLAKY_TASKS=true pnpm test

# Analyze flaky task patterns
npx nx-cloud analyze-flaky-tasks
```

## Success Metrics

### Target KPIs

- **Flaky Task Reduction**: < 2% false failure rate
- **CI Pipeline Reliability**: > 95% success rate
- **Developer Velocity**: < 5% overhead from retries
- **Resource Efficiency**: < 20% additional CI time

### Monitoring Dashboard

Access real-time metrics at:
- Nx Cloud Dashboard: `https://nx.app`
- brAInwav Quality Gates: Internal monitoring
- GitHub Actions Insights: Workflow analytics

## Implementation Checklist

- [x] Configure Nx Cloud runner in `nx.json`
- [x] Add retry options to task configurations
- [x] Update environment variable templates
- [x] Enhance GitHub Actions workflows
- [x] Document retry strategy and best practices
- [ ] Set up Nx Cloud access token
- [ ] Train team on retry configuration
- [ ] Establish monitoring and alerting
- [ ] Review and optimize retry settings

## References

- [Nx Cloud Documentation](https://nx.dev/ci/features/flaky-tasks)
- [brAInwav Quality Standards](./AGENTS.md)
- [Circuit Breaker Pattern](./packages/agents/src/lib/circuit-breaker.ts)
- [Retry Utilities](./packages/a2a/a2a-core/src/lib/retry-utils.ts)

---

**Maintained by: brAInwav Development Team**  
**Last Updated: October 1, 2025**  
**Version: 1.0.0**
