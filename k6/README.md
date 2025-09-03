# Cortex-OS Performance Testing

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

This directory contains K6 performance testing configurations and scripts for evaluating Cortex-OS system performance under various load conditions.

## Performance Testing Framework

### K6 Overview

K6 is used for:

- **Load Testing** - Normal operational load simulation
- **Stress Testing** - High load and breaking point testing  
- **Spike Testing** - Sudden load increase testing
- **Volume Testing** - Large data volume handling
- **Endurance Testing** - Long-duration performance testing

### Test Categories

- **API Performance** - REST API response times and throughput
- **Agent Performance** - Agent processing and response times
- **Memory Performance** - Memory storage and retrieval operations
- **MCP Performance** - Model Context Protocol efficiency
- **Database Performance** - Data storage and query performance

## Test Structure

### Test Organization

```text
k6/
├── scripts/
│   ├── api/               # API performance tests
│   ├── agents/            # Agent performance tests
│   ├── memory/            # Memory system tests
│   └── integration/       # End-to-end tests
├── data/
│   ├── test-data.json     # Test data files
│   └── scenarios.json     # Test scenarios
├── config/
│   ├── environments.js    # Environment configurations
│   └── thresholds.js      # Performance thresholds
└── reports/               # Test result reports
```

### Test Scripts

Performance test scripts include:

- **Smoke Tests** - Basic functionality verification
- **Load Tests** - Normal load simulation
- **Stress Tests** - High load testing
- **Spike Tests** - Traffic spike simulation

## Running Performance Tests

### Prerequisites

Install K6:

```bash
# macOS
brew install k6

# Linux
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows (via Chocolatey)
choco install k6
```

### Test Execution

```bash
# Run basic smoke test
k6 run scripts/smoke-test.js

# Run load test with specific configuration
k6 run --config config/load-test.json scripts/api/api-load-test.js

# Run with custom virtual users and duration
k6 run --vus 50 --duration 5m scripts/agents/agent-performance.js

# Run with environment variables
k6 run -e BASE_URL=http://localhost:3000 scripts/integration/e2e-test.js
```

## Test Scenarios

### API Performance Testing

Testing REST API endpoints:

- **Response Time** - API response latency
- **Throughput** - Requests per second
- **Error Rate** - Error percentage
- **Concurrent Users** - Multiple user simulation

### Agent Performance Testing

Testing agent operations:

- **Agent Creation** - Agent initialization time
- **Message Processing** - Message handling speed
- **Memory Operations** - Memory read/write performance
- **Communication** - A2A messaging performance

### System Performance Testing

Testing overall system:

- **Resource Usage** - CPU, memory, disk utilization
- **Scalability** - Performance under increasing load
- **Stability** - Long-term performance consistency
- **Recovery** - Performance after failures

## Performance Metrics

### Key Performance Indicators

- **Response Time** - Average, median, 95th percentile
- **Throughput** - Requests/transactions per second
- **Error Rate** - Percentage of failed requests
- **Resource Utilization** - CPU, memory, disk usage

### Thresholds

Performance thresholds for:

```javascript
export let options = {
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Error rate under 1%
    http_reqs: ['rate>100'],          // Throughput over 100 RPS
  },
};
```

## Test Environments

### Environment Configuration

- **Local** - Development environment testing
- **Staging** - Pre-production performance validation
- **Production** - Production monitoring and validation
- **Load Testing Environment** - Dedicated load testing setup

### Environment Variables

```javascript
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'test-api-key';
const TEST_DURATION = __ENV.DURATION || '5m';
const VIRTUAL_USERS = __ENV.VUS || 10;
```

## Continuous Performance Testing

### CI/CD Integration

Performance tests in CI/CD:

```yaml
performance-test:
  runs-on: ubuntu-latest
  steps:
    - name: Run K6 Performance Tests
      run: |
        k6 run --summary-export=results.json scripts/smoke-test.js
        k6 run --summary-export=load-results.json scripts/load-test.js
```

### Automated Reporting

- **Test Results** - Automated result collection
- **Performance Trends** - Historical performance tracking
- **Alerting** - Performance degradation notifications
- **Dashboard** - Real-time performance monitoring

## Performance Monitoring

### Real-time Monitoring

Integration with monitoring systems:

- **Grafana** - Performance dashboard visualization
- **Prometheus** - Metrics collection and storage
- **InfluxDB** - Time-series performance data
- **Custom Dashboards** - Application-specific metrics

### Alerting

Performance alert conditions:

- Response time degradation
- Throughput below threshold
- Error rate increase
- Resource utilization spikes

## Optimization

### Performance Tuning

Based on test results:

- **Code Optimization** - Application performance improvements
- **Database Tuning** - Query and index optimization
- **Caching Strategy** - Intelligent caching implementation
- **Resource Scaling** - Infrastructure scaling decisions

### Bottleneck Identification

- **CPU Bottlenecks** - Processing limitations
- **Memory Bottlenecks** - Memory usage issues
- **I/O Bottlenecks** - Disk and network limitations
- **Database Bottlenecks** - Database performance issues

## Best Practices

### Test Design

- **Realistic Scenarios** - Real-world usage patterns
- **Gradual Load Increase** - Progressive load testing
- **Proper Test Data** - Representative test datasets
- **Environment Consistency** - Consistent test environments

### Result Analysis

- **Baseline Comparison** - Compare against baselines
- **Trend Analysis** - Long-term performance trends
- **Root Cause Analysis** - Performance issue investigation
- **Action Items** - Clear improvement recommendations

## Troubleshooting

### Common Issues

- **Network Latency** - Network-related performance issues
- **Resource Constraints** - Insufficient system resources
- **Configuration Issues** - Incorrect test configurations
- **Test Data Problems** - Invalid or insufficient test data

### Debugging Performance Issues

```bash
# Verbose output for debugging
k6 run --verbose scripts/debug-test.js

# HTTP debugging
k6 run --http-debug scripts/api-test.js

# Custom logging
k6 run --log-output=file=test.log scripts/performance-test.js
```

## Related Documentation

- [System Monitoring](/docs/)
- [Infrastructure Setup](/infra/README.md)
- [API Documentation](/docs/)
- [Testing Guidelines](/tests/README.md)
