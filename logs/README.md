# Cortex-OS Logs

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

This directory contains log files, logging configurations, and log management utilities for the Cortex-OS system.

## Log Structure

### Log Categories

- **Application Logs** - Core application activity and events
- **Error Logs** - System errors and exceptions
- **Access Logs** - API and service access logs
- **Performance Logs** - Performance metrics and timing
- **Security Logs** - Security events and audit trails
- **Debug Logs** - Development and debugging information

### Log Levels

- **ERROR** - System errors and failures
- **WARN** - Warning conditions and potential issues
- **INFO** - General information and status updates
- **DEBUG** - Detailed debugging information
- **TRACE** - Detailed execution traces

## Log Files

### File Organization

```text
logs/
├── application/
│   ├── app.log            # Main application log
│   ├── agents.log         # Agent-specific logs
│   └── memory.log         # Memory system logs
├── errors/
│   ├── error.log          # General error log
│   └── critical.log       # Critical system errors
├── access/
│   ├── api.log            # API access log
│   └── web.log            # Web interface access
├── performance/
│   ├── metrics.log        # Performance metrics
│   └── timing.log         # Timing information
└── security/
    ├── auth.log           # Authentication events
    └── audit.log          # Security audit trail
```

### Log Rotation

Logs are rotated based on:

- **File Size** - Maximum file size limits
- **Time Period** - Daily, weekly, or monthly rotation
- **Retention Policy** - How long logs are kept
- **Compression** - Automatic compression of old logs

## Logging Configuration

### Log Levels by Environment

#### Development

```javascript
{
  level: 'debug',
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    }),
    new winston.transports.File({
      filename: 'logs/application/app.log'
    })
  ]
}
```

#### Production

```javascript
{
  level: 'info',
  transports: [
    new winston.transports.File({
      filename: 'logs/errors/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/application/app.log'
    })
  ]
}
```

### Structured Logging

Logs use structured format for better analysis:

```json
{
  "timestamp": "2025-09-03T10:30:00.000Z",
  "level": "info",
  "service": "cortex-os",
  "component": "agent-manager",
  "message": "Agent created successfully",
  "agentId": "agent_123",
  "userId": "user_456",
  "requestId": "req_789"
}
```

## Log Management

### Retention Policies

- **Error Logs** - 90 days retention
- **Application Logs** - 30 days retention
- **Access Logs** - 60 days retention
- **Debug Logs** - 7 days retention
- **Audit Logs** - 1 year retention

### Log Cleanup

Automated cleanup processes:

```bash
# Daily cleanup script
find logs/ -name "*.log" -mtime +30 -delete

# Compress old logs
gzip logs/application/app.log.old

# Archive to long-term storage
tar -czf logs-archive-$(date +%Y%m%d).tar.gz logs/
```

## Log Analysis

### Log Analysis Tools

- **grep/awk** - Command-line text processing
- **ELK Stack** - Elasticsearch, Logstash, Kibana
- **Grafana** - Log visualization and dashboards
- **Custom Scripts** - Application-specific analysis

### Common Analysis Tasks

```bash
# Find errors in last hour
grep "ERROR" logs/application/app.log | tail -100

# Count API requests by endpoint
grep "GET" logs/access/api.log | awk '{print $7}' | sort | uniq -c

# Monitor real-time logs
tail -f logs/application/app.log

# Search for specific agent activity
grep "agent_123" logs/application/agents.log
```

## Monitoring and Alerting

### Log Monitoring

- **Error Rate Monitoring** - Alert on error spikes
- **Performance Monitoring** - Track response times
- **Security Monitoring** - Detect suspicious activity
- **System Health** - Monitor system status

### Alert Conditions

```yaml
alerts:
  - name: "High Error Rate"
    condition: "error_rate > 5%"
    action: "notify_team"
  
  - name: "Slow Response Time"
    condition: "avg_response_time > 2s"
    action: "investigate"
  
  - name: "Authentication Failures"
    condition: "auth_failures > 10/min"
    action: "security_alert"
```

## Security and Compliance

### Log Security

- **Access Control** - Restricted log file access
- **Encryption** - Encrypt sensitive log data
- **Integrity** - Log tampering detection
- **Secure Transmission** - Encrypted log shipping

### Compliance Requirements

- **Data Retention** - Meet regulatory requirements
- **Audit Trails** - Complete activity logging
- **Privacy Protection** - PII data handling
- **Access Logging** - Who accessed what data

## Performance Considerations

### Log Performance

- **Asynchronous Logging** - Non-blocking log writes
- **Buffer Management** - Efficient log buffering
- **Sampling** - Log sampling for high-volume events
- **Compression** - Reduce storage requirements

### Storage Optimization

- **Log Rotation** - Prevent disk space issues
- **Compression** - Compress old log files
- **Archive Storage** - Move old logs to cheaper storage
- **Cleanup Automation** - Automated log cleanup

## Development and Debugging

### Debug Logging

Enable debug logging for development:

```bash
# Set debug log level
export LOG_LEVEL=debug

# Enable component-specific logging
export DEBUG=cortex:agent:*

# Verbose API logging
export LOG_API_REQUESTS=true
```

### Log Analysis for Debugging

```bash
# Find specific error patterns
grep -A 5 -B 5 "FATAL" logs/errors/error.log

# Trace request flow
grep "req_789" logs/application/app.log

# Monitor memory usage logs
grep "memory" logs/performance/metrics.log
```

## Log Aggregation

### Centralized Logging

For distributed systems:

- **Log Shipping** - Send logs to central location
- **Log Aggregation** - Combine logs from multiple sources
- **Correlation** - Link related log entries
- **Search and Analysis** - Centralized log search

### Integration

```javascript
// Log shipping configuration
const winston = require('winston');
require('winston-elasticsearch');

const logger = winston.createLogger({
  transports: [
    new winston.transports.Elasticsearch({
      index: 'cortex-os-logs',
      level: 'info'
    })
  ]
});
```

## Best Practices

### Logging Best Practices

- **Meaningful Messages** - Clear, actionable log messages
- **Appropriate Levels** - Use correct log levels
- **Structured Data** - Use structured logging format
- **Context Information** - Include relevant context
- **Avoid Sensitive Data** - Don't log passwords or secrets

### Performance Best Practices

- **Async Logging** - Use asynchronous logging
- **Log Sampling** - Sample high-frequency events
- **Efficient Formats** - Use efficient log formats
- **Buffer Management** - Proper buffer configuration

## Troubleshooting

### Common Issues

- **Disk Space** - Logs consuming too much space
- **Performance Impact** - Logging affecting performance
- **Missing Logs** - Log entries not appearing
- **Log Corruption** - Corrupted log files

### Resolution Strategies

```bash
# Check disk space
df -h logs/

# Monitor log file sizes
du -sh logs/*

# Verify log permissions
ls -la logs/

# Test log writing
logger "Test message"
```

## Related Documentation

- [Monitoring Setup](/docs/)
- [Security Policies](/SECURITY.md)
- [Performance Testing](/k6/README.md)
- [Operations Guide](/ops/README.md)
