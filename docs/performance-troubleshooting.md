# Performance Optimization Troubleshooting Guide

This guide provides comprehensive troubleshooting steps for common issues with the Cortex-OS performance optimization system.

## Table of Contents

- [Quick Diagnosis](#quick-diagnosis)
- [Common Issues and Solutions](#common-issues-and-solutions)
- [Component-Specific Troubleshooting](#component-specific-troubleshooting)
- [Performance Degradation](#performance-degradation)
- [Memory and Resource Issues](#memory-and-resource-issues)
- [Network and Connectivity](#network-and-connectivity)
- [Monitoring and Alerting](#monitoring-and-alerting)
- [Advanced Debugging](#advanced-debugging)

---

## Quick Diagnosis

### Health Check Script

Run this comprehensive health check to identify issues:

```bash
#!/bin/bash
# performance-health-check.sh

echo "🔍 Cortex-OS Performance Health Check"
echo "===================================="

# Check if performance scripts are executable
echo "1. Checking script permissions..."
find scripts/performance -name "*.ts" -exec test -x {} \; -print || echo "❌ Some scripts are not executable"

# Check environment variables
echo "2. Checking environment configuration..."
if [ -f .env.performance ]; then
    echo "✅ .env.performance exists"
    source .env.performance
    echo "   - PERF_CPU_THRESHOLD: ${PERF_CPU_THRESHOLD:-not set}"
    echo "   - PERF_MEMORY_THRESHOLD: ${PERF_MEMORY_THRESHOLD:-not set}"
    echo "   - PERF_MAX_INSTANCES: ${PERF_MAX_INSTANCES:-not set}"
else
    echo "❌ .env.performance not found"
fi

# Check Node.js and TypeScript
echo "3. Checking runtime dependencies..."
if command -v node >/dev/null; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js not found"
fi

if command -v tsx >/dev/null; then
    echo "✅ tsx available"
else
    echo "❌ tsx not found - run: pnpm add -D tsx"
fi

# Check performance monitoring
echo "4. Checking performance monitoring..."
if pgrep -f "performance.*monitor" >/dev/null; then
    echo "✅ Performance monitoring running"
else
    echo "⚠️  Performance monitoring not running"
fi

# Check GPU availability
echo "5. Checking GPU availability..."
if command -v nvidia-smi >/dev/null; then
    echo "✅ NVIDIA GPU detected"
    nvidia-smi --query-gpu=name,memory.total,memory.used --format=csv,noheader,nounits
else
    echo "⚠️  No NVIDIA GPU detected"
fi

# Check Redis (if used)
echo "6. Checking Redis connectivity..."
if command -v redis-cli >/dev/null; then
    if redis-cli ping >/dev/null 2>&1; then
        echo "✅ Redis server responding"
    else
        echo "❌ Redis server not responding"
    fi
else
    echo "⚠️  Redis CLI not available"
fi

echo "===================================="
echo "Health check complete. See above for issues."
```

### Quick Commands for Diagnosis

```bash
# Check overall system performance
pnpm performance:report

# Test individual components
pnpm performance:scaling --dry-run
pnpm performance:redis --check
pnpm performance:analytics --status
pnpm performance:router --health
pnpm performance:gpu --status
pnpm performance:alerts --test

# Check logs
tail -f logs/performance.log
tail -f logs/alerts.log
tail -f logs/scaling.log

# Verify configuration
node -e "console.log(JSON.stringify(require('./.env.performance'), null, 2))"
```

---

## Common Issues and Solutions

### 1. Performance Scripts Not Working

**Symptoms**: Commands fail with "command not found" or permission errors

**Solutions**:

```bash
# Make scripts executable
chmod +x scripts/performance/*.ts

# Install tsx if missing
pnpm add -D tsx

# Check TypeScript compilation
npx tsc --noEmit scripts/performance/advanced-scaling.ts

# Verify Node.js version
node --version  # Should be 20.x or 22.x
```

**Environment Issues**:

```bash
# Load performance environment
source .env.performance

# Verify critical variables
echo $PERF_CPU_THRESHOLD
echo $PERF_MEMORY_THRESHOLD
echo $PERF_MAX_INSTANCES

# Create missing .env.performance if needed
cp .env.example .env.performance
```

### 2. High CPU Usage

**Symptoms**: System CPU consistently above 80%

**Diagnosis**:

```bash
# Check current CPU usage
top -o %CPU -n 10

# Check performance monitoring processes
ps aux | grep performance

# Check for runaway processes
ps aux --sort=-%cpu | head -10

# Check auto-scaling status
pnpm performance:scaling --status
```

**Solutions**:

```bash
# Immediate: Restart performance monitoring
pkill -f "performance.*monitor"
pnpm performance:monitor

# Adjust CPU thresholds
export PERF_CPU_THRESHOLD=90  # Increase threshold temporarily

# Scale down if over-provisioned
pnpm performance:scaling --scale-down

# Check for inefficient queries
pnpm performance:analytics --bottlenecks
```

### 3. Memory Leaks

**Symptoms**: Memory usage continuously increases, system becomes sluggish

**Diagnosis**:

```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head -10

# Check Node.js process memory
ps -o pid,ppid,rss,vsz,comm -p $(pgrep -f node)

# Check GPU memory usage
nvidia-smi

# Monitor memory over time
watch -n 5 'free -h && echo "---" && ps aux --sort=-%mem | head -5'
```

**Solutions**:

```bash
# Restart performance components
pnpm performance:stop
pnpm performance:start

# Clear GPU memory
nvidia-smi --gpu-reset  # Use with caution

# Optimize memory usage
pnpm performance:cache --clear
pnpm performance:gpu --compact-memory

# Reduce batch sizes
export PERF_BATCH_SIZE=50  # Reduce from default
```

### 4. Scaling Not Working

**Symptoms**: Auto-scaling not triggering during high load

**Diagnosis**:

```bash
# Check scaling status
pnpm performance:scaling --status

# Check current metrics
pnpm performance:analytics --current-metrics

# Check scaling logs
tail -f logs/scaling.log

# Verify configuration
grep -E "(THRESHOLD|ENABLE)" .env.performance
```

**Solutions**:

```bash
# Check if ML model is trained
pnpm performance:scaling --train-model

# Adjust thresholds
export PERF_CPU_THRESHOLD=70  # Lower threshold
export PERF_MEMORY_THRESHOLD=75

# Enable emergency scaling
export PERF_ENABLE_EMERGENCY=true

# Test scaling manually
pnpm performance:scaling --test-scale-up
pnpm performance:scaling --test-scale-down
```

### 5. Cache Issues

**Symptoms**: Slow response times, low cache hit rates

**Diagnosis**:

```bash
# Check Redis status
redis-cli info stats

# Check cache performance
pnpm performance:cache --stats

# Check memory fragmentation
pnpm performance:cache --fragmentation

# Monitor cache hits
watch -n 2 'redis-cli info stats | grep keyspace'
```

**Solutions**:

```bash
# Clear and warm cache
pnpm performance:cache --clear
pnpm performance:cache --warm

# Optimize cache settings
export PERF_CACHE_SIZE=2000  # Increase cache size
export PERF_CACHE_TTL=7200    # Increase TTL

# Check Redis memory usage
redis-cli info memory

# Restart Redis if needed
sudo systemctl restart redis
```

---

## Component-Specific Troubleshooting

### Advanced Auto-Scaling

**Common Issues**:

1. **Scaling Not Triggering**
   ```bash
   # Check thresholds
   pnpm performance:scaling --check-thresholds

   # Verify metrics collection
   pnpm performance:analytics --verify-metrics

   # Test scaling logic
   pnpm performance:scaling --dry-run --load-test
   ```

2. **Over-Scaling**
   ```bash
   # Check scaling limits
   grep MAX_INSTANCES .env.performance

   # Adjust cooling period
   export PERF_COOLDOWN_PERIOD=300  # 5 minutes

   # Enable cost optimization
   export PERF_ENABLE_COST_OPT=true
   ```

3. **ML Model Issues**
   ```bash
   # Retrain model
   pnpm performance:scaling --retrain-model

   # Check model accuracy
   pnpm performance:scaling --model-stats

   # Fall back to rule-based scaling
   export PERF_SCALING_ALGORITHM=rule_based
   ```

### Distributed Redis Clustering

**Common Issues**:

1. **Cluster Connectivity**
   ```bash
   # Check cluster status
   pnpm performance:redis --cluster-status

   # Test individual nodes
   redis-cli -h redis-node-1 ping
   redis-cli -h redis-node-2 ping

   # Check network latency
   ping redis-cluster.example.com
   ```

2. **Data Inconsistency**
   ```bash
   # Check replication lag
   redis-cli --latency-history -i 1

   # Verify data consistency
   pnpm performance:redis --verify-replication

   # Force resynchronization
   pnpm performance:redis --resync
   ```

3. **Memory Issues**
   ```bash
   # Check Redis memory usage
   redis-cli info memory | grep used_memory_human

   # Clean up expired keys
   redis-cli --scan --pattern "*:*" | xargs redis-cli del

   # Optimize memory usage
   pnpm performance:redis --optimize-memory
   ```

### Performance Analytics Engine

**Common Issues**:

1. **Missing Metrics**
   ```bash
   # Check metric collection
   pnpm performance:analytics --check-collection

   # Verify metric sources
   pnpm performance:analytics --list-sources

   # Restart metric collection
   pnpm performance:analytics --restart-collection
   ```

2. **Anomaly Detection False Positives**
   ```bash
   # Adjust sensitivity
   export PERF_ANOMALY_SENSITIVITY=0.9  # Higher = less sensitive

   # Retrain anomaly model
   pnpm performance:analytics --retrain-anomaly

   # Check training data quality
   pnpm performance:analytics --check-training-data
   ```

3. **Slow Analytics Queries**
   ```bash
   # Check database performance
   pnpm performance:analytics --db-performance

   # Optimize queries
   pnpm performance:analytics --optimize-queries

   # Clear old data
   pnpm performance:analytics --cleanup --days=7
   ```

### Intelligent Query Router

**Common Issues**:

1. **Poor Load Balancing**
   ```bash
   # Check routing distribution
   pnpm performance:router --routing-stats

   # Test load balancing
   pnpm performance:router --load-test

   # Adjust weights
   pnpm performance:router --rebalance-weights
   ```

2. **Circuit Breaker Issues**
   ```bash
   # Check circuit breaker status
   pnpm performance:router --circuit-status

   # Reset circuit breakers
   pnpm performance:router --reset-circuits

   # Adjust thresholds
   export PERF_CIRCUIT_THRESHOLD=10  # More failures before tripping
   ```

3. **Routing Failures**
   ```bash
   # Check target health
   pnpm performance:router --health-check

   # Test routing logic
   pnpm performance:router --test-routing

   # Check network connectivity
   pnpm performance:router --network-test
   ```

### Advanced GPU Management

**Common Issues**:

1. **GPU Not Detected**
   ```bash
   # Check NVIDIA driver
   nvidia-smi

   # Check CUDA installation
   nvcc --version

   # Check GPU permissions
   ls -l /dev/nvidia*

   # Restart GPU manager
   pnpm performance:gpu --restart
   ```

2. **GPU Memory Issues**
   ```bash
   # Check GPU memory usage
   nvidia-smi --query-gpu=memory.used,memory.total --format=csv

   # Clear GPU memory
   pnpm performance:gpu --clear-memory

   # Optimize memory allocation
   pnpm performance:gpu --optimize-memory
   ```

3. **Task Scheduling Issues**
   ```bash
   # Check task queue
   pnpm performance:gpu --queue-status

   # Check running tasks
   pnpm performance:gpu --running-tasks

   # Clear stuck tasks
   pnpm performance:gpu --clear-stuck-tasks
   ```

### Real-Time Alerting System

**Common Issues**:

1. **Alerts Not Triggering**
   ```bash
   # Check alert rules
   pnpm performance:alerts --list-rules

   # Test alert system
   pnpm performance:alerts --test-alert

   # Check metric submission
   pnpm performance:alerts --check-metrics
   ```

2. **Alert Fatigue**
   ```bash
   # Check alert frequency
   pnpm performance:alerts --alert-frequency

   # Enable rate limiting
   export PERF_ALERT_RATE_LIMIT=5  # Max 5 per minute

   # Adjust cooldown periods
   export PERF_ALERT_COOLDOWN=1800  # 30 minutes
   ```

3. **Channel Configuration Issues**
   ```bash
   # Test alert channels
   pnpm performance:alerts --test-channels

   # Check webhook delivery
   pnpm performance:alerts --test-webhook

   # Verify email configuration
   pnpm performance:alerts --test-email
   ```

---

## Performance Degradation

### Identifying Performance Issues

```bash
# Generate performance report
pnpm performance:analytics --report --period=1h

# Check for bottlenecks
pnpm performance:analytics --bottlenecks

# Compare with baseline
pnpm performance:analytics --compare-baseline

# Check system metrics
pnpm performance:monitor --system-metrics
```

### Performance Recovery Steps

1. **Immediate Recovery**
   ```bash
   # Restart performance services
   pnpm performance:stop
   pnpm performance:start

   # Clear caches
   pnpm performance:cache --clear

   # Reset auto-scaling
   pnpm performance:scaling --reset
   ```

2. **Investigate Root Cause**
   ```bash
   # Check recent changes
   git log --oneline -10

   # Review performance logs
   tail -100 logs/performance.log | grep ERROR

   # Check system resources
   top -b -n 1 | head -20
   ```

3. **Apply Fixes**
   ```bash
   # Rollback if needed
   git checkout HEAD~1 -- scripts/performance/

   # Update configuration
   # Edit .env.performance with appropriate values

   # Restart with new config
   pnpm performance:restart
   ```

---

## Memory and Resource Issues

### Memory Leak Detection

```bash
# Monitor Node.js memory usage
node --inspect scripts/performance/memory-monitor.js

# Check for memory leaks
pnpm performance:analytics --memory-leak-detection

# Generate memory profile
node --prof scripts/performance/profile-memory.js
node --prof-process isolate-*.log > memory-profile.txt
```

### Resource Optimization

```bash
# Optimize memory usage
pnpm performance:optimize --memory-only

# Clean up resources
pnpm performance:cleanup --force

# Optimize configuration
pnpm performance:optimize --config-only
```

### GPU Resource Issues

```bash
# Monitor GPU usage
watch -n 2 nvidia-smi

# Check GPU processes
nvidia-smi pmon

# Reset GPU if needed
sudo nvidia-smi --gpu-reset -i 0
```

---

## Network and Connectivity

### Network Diagnostics

```bash
# Check network latency
ping -c 4 8.8.8.8

# Check DNS resolution
nslookup google.com

# Check port availability
netstat -tuln | grep :3000

# Test Redis connectivity
redis-cli -h localhost -p 6379 ping
```

### Firewall Issues

```bash
# Check firewall status
sudo ufw status

# Allow necessary ports
sudo ufw allow 3000/tcp  # Cortex-OS
sudo ufw allow 6379/tcp  # Redis
sudo ufw allow 3024/tcp  # MCP

# Check if ports are blocked
telnet localhost 3000
```

### Performance Impact

```bash
# Test network performance
iperf3 -c target-server

# Check bandwidth usage
iftop -i eth0

# Monitor network latency
ping -i 1 target-server | grep "time="
```

---

## Monitoring and Alerting

### Monitoring Setup

```bash
# Verify monitoring is running
ps aux | grep performance.*monitor

# Check monitoring configuration
cat config/monitoring.json

# Test monitoring endpoints
curl http://localhost:3001/metrics
curl http://localhost:3001/health
```

### Alert Configuration

```bash
# Test alert delivery
pnpm performance:alerts --test-delivery

# Check alert rules
pnpm performance:alerts --validate-rules

# Update alert configuration
pnpm performance:alerts --reload-config
```

### Log Analysis

```bash
# Check error logs
grep ERROR logs/performance.log

# Analyze alert patterns
grep "ALERT TRIGGERED" logs/alerts.log | tail -20

# Check scaling events
grep "SCALE" logs/scaling.log

# Monitor logs in real-time
tail -f logs/performance.log | grep -E "(ERROR|WARN|ALERT)"
```

---

## Advanced Debugging

### Debug Mode

```bash
# Enable debug logging
export DEBUG=performance:*
export PERF_DEBUG=true

# Run components with debug
pnpm performance:monitor --debug
pnpm performance:scaling --debug
```

### Performance Profiling

```bash
# Profile Node.js performance
node --prof scripts/performance/profile.js

# Generate flame graph
npm install -g 0x
0x --output-dir profiles/ scripts/performance/advanced-scaling.ts

# Analyze performance bottlenecks
clinic doctor -- node scripts/performance/advanced-scaling.ts
```

### Database Performance

```bash
# Check database queries
pnpm performance:database --slow-queries

# Analyze database performance
pnpm performance:database --analyze

# Optimize database
pnpm performance:database --optimize
```

### Custom Debug Scripts

Create custom debug scripts for specific issues:

```typescript
// scripts/performance/debug-specific-issue.ts
import { AdvancedAutoScaler } from './advanced-scaling';

async function debugScalingIssue() {
  console.log('🔍 Debugging scaling issue...');

  const scaler = new AdvancedAutoScaler();
  await scaler.initialize();

  // Check current state
  const status = scaler.getStatus();
  console.log('Current status:', status);

  // Test scaling logic
  console.log('Testing scale up...');
  await scaler.scaleUp(1);

  // Monitor metrics
  const metrics = scaler.getPerformanceMetrics();
  console.log('Performance metrics:', metrics);

  await scaler.shutdown();
}

debugSpecificIssue().catch(console.error);
```

---

## Emergency Procedures

### System Recovery

```bash
# Emergency stop all performance services
pkill -f "performance.*"

# Restart with safe defaults
pnpm performance:start --safe-mode

# Clear all caches and restart
pnpm performance:emergency-reset

# Restore from backup if needed
pnpm performance:restore --backup=latest
```

### Performance Degradation

```bash
# Immediate performance recovery
pnpm performance:emergency-recovery

# Disable advanced features
export PERF_ENABLE_ML=false
export PERF_ENABLE_GPU=false
export PERF_ENABLE_CACHE=false

# Run with minimal features
pnpm performance:start --minimal
```

### Contact Support

If issues persist:

1. **Collect Debug Information**:
   ```bash
   pnpm performance:debug-bundle > debug-bundle.txt
   ```

2. **Check System Status**:
   ```bash
   pnpm performance:system-status
   ```

3. **Contact Support**:
   - Email: performance@cortex-os.dev
   - Include debug-bundle.txt and system status
   - Describe the issue and steps taken

---

## Prevention and Maintenance

### Regular Health Checks

```bash
# Schedule daily health checks
0 2 * * * /path/to/cortex-os/scripts/performance-health-check.sh

# Weekly performance reports
0 6 * * 1 pnpm performance:report --email=admin@example.com
```

### Monitoring Setup

```bash
# Set up comprehensive monitoring
pnpm performance:monitoring-setup

# Configure alerts
pnpm performance:alerts --setup-basic

# Create dashboards
pnpm performance:dashboard --create
```

### Performance Tuning

```bash
# Monthly performance optimization
pnpm performance:optimize --full

# Quarterly model retraining
pnpm performance:scaling --retrain-all-models

# Annual performance audit
pnpm performance:audit --full-report
```

---

## Quick Reference

### Essential Commands

```bash
# Health check
pnpm performance:health-check

# System status
pnpm performance:status

# Emergency recovery
pnpm performance:emergency-recovery

# Debug information
pnpm performance:debug-bundle

# Test all components
pnpm performance:test-all
```

### Key Files

- `.env.performance` - Configuration
- `logs/performance.log` - Main log file
- `logs/alerts.log` - Alert log file
- `config/performance.json` - Performance config
- `scripts/performance/` - Performance scripts

### Environment Variables

- `PERF_DEBUG` - Enable debug mode
- `PERF_SAFE_MODE` - Run with minimal features
- `PERF_CPU_THRESHOLD` - CPU scaling threshold
- `PERF_MEMORY_THRESHOLD` - Memory scaling threshold
- `PERF_MAX_INSTANCES` - Maximum instances

---

For additional support or questions about performance troubleshooting, see the [Performance API Reference](./performance-api-reference.md) or create an issue in the repository.