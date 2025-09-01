# Production Deployment Guide

## Overview

This guide covers deploying Cortex TUI v2.0 in production environments with proper security, monitoring, and scalability considerations.

## Security Configuration

### Network Security

**Secure Binding Configuration:**

```bash
# Development (debug builds) - automatically binds to localhost only
export RUST_LOG=debug
cargo run

# Production - configure binding address explicitly
export CORTEX_BIND_ADDRESS="127.0.0.1:8080"  # Localhost only
# OR for internal network access (use with caution)
export CORTEX_BIND_ADDRESS="10.0.1.100:8080"  # Specific internal IP
```

**Never bind to 0.0.0.0 in production unless behind proper firewall/proxy.**

### MLX Provider Security

The MLX provider has been hardened against command injection:

- ✅ Uses secure process spawning with `Command::new()`
- ✅ Passes prompts via stdin (not command line arguments)
- ✅ Implements proper timeout handling (30 seconds)
- ✅ Validates and sanitizes all inputs

### Environment Variables

Required environment variables for production:

```bash
# Logging
export RUST_LOG=info,cortex_tui=debug

# Network binding (required in production)
export CORTEX_BIND_ADDRESS="127.0.0.1:8080"

# MCP Configuration
export MCP_NETWORK_EGRESS=disabled  # For testing/development
export MCP_NETWORK_EGRESS=enabled   # For production with external tools

# Provider configurations
export OPENAI_API_KEY="your_key_here"
export ANTHROPIC_API_KEY="your_key_here"
export GITHUB_TOKEN="your_github_token"

# Memory/Storage
export CORTEX_AGENTS_MD_PATH="/var/lib/cortex/agents.md"
export CORTEX_MEMORY_RETENTION_DAYS=30
```

## Deployment Architecture

### Recommended Architecture

```
[Load Balancer/Reverse Proxy]
           ↓
[Cortex TUI Daemon - Port 8080]
           ↓
[MCP Servers] ← → [External APIs]
           ↓
[File System Storage]
```

### Component Health Monitoring

The system includes comprehensive health monitoring:

```bash
# Health check endpoint
curl http://localhost:8080/health

# Detailed metrics
curl http://localhost:8080/metrics
```

Health check response:

```json
{
  "status": "healthy",
  "version": "2.0.0",
  "uptime": 3600,
  "components": {
    "mcp": "healthy",
    "memory": "healthy",
    "providers": "healthy"
  }
}
```

## Performance and Scaling

### Resource Requirements

**Minimum Requirements:**

- CPU: 2 cores
- RAM: 4GB
- Storage: 10GB
- Network: 100Mbps

**Recommended Production:**

- CPU: 4+ cores
- RAM: 8GB+
- Storage: 50GB+ SSD
- Network: 1Gbps+

### Monitoring Metrics

Key metrics to monitor:

1. **Request Metrics**
   - Total requests/responses
   - Average response time
   - Request rate (requests/minute)
   - Error rate percentage

2. **Performance Metrics**
   - Memory usage
   - CPU utilization
   - Response time percentiles (P50, P95, P99)

3. **Usage Metrics**
   - Active sessions
   - Provider usage distribution
   - Feature usage statistics
   - Token consumption

4. **System Health**
   - Component availability
   - Error tracking by type
   - Uptime statistics

### Logging Configuration

```bash
# Production logging setup
export RUST_LOG="info,cortex_tui=info,hyper=warn,reqwest=warn"

# Enable structured logging for monitoring systems
export CORTEX_LOG_FORMAT="json"  # or "pretty" for human-readable

# Log rotation (use logrotate or similar)
export CORTEX_LOG_FILE="/var/log/cortex/cortex-tui.log"
```

## High Availability Setup

### Multi-Instance Deployment

```bash
# Instance 1
export CORTEX_BIND_ADDRESS="127.0.0.1:8080"
export CORTEX_INSTANCE_ID="cortex-01"
./cortex-tui daemon --port 8080

# Instance 2
export CORTEX_BIND_ADDRESS="127.0.0.1:8081"
export CORTEX_INSTANCE_ID="cortex-02"
./cortex-tui daemon --port 8081
```

### Load Balancer Configuration (nginx)

```nginx
upstream cortex_backend {
    server 127.0.0.1:8080;
    server 127.0.0.1:8081;
    keepalive 32;
}

server {
    listen 80;
    server_name cortex.yourcompany.com;

    location / {
        proxy_pass http://cortex_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Streaming support
        proxy_buffering off;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://cortex_backend/health;
        access_log off;
    }
}
```

## Security Hardening

### File System Security

```bash
# Create dedicated user
sudo useradd -r -s /bin/false cortex-tui

# Set up secure directories
sudo mkdir -p /var/lib/cortex /var/log/cortex /etc/cortex
sudo chown cortex-tui:cortex-tui /var/lib/cortex /var/log/cortex
sudo chmod 750 /var/lib/cortex /var/log/cortex
sudo chmod 755 /etc/cortex

# Secure memory files
sudo chmod 600 /var/lib/cortex/agents.md
```

### Systemd Service

```ini
# /etc/systemd/system/cortex-tui.service
[Unit]
Description=Cortex TUI Daemon
After=network.target
Requires=network.target

[Service]
Type=simple
User=cortex-tui
Group=cortex-tui
WorkingDirectory=/opt/cortex-tui
ExecStart=/opt/cortex-tui/cortex-tui daemon --port 8080
Restart=always
RestartSec=5

# Security settings
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/cortex /var/log/cortex
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
MemoryDenyWriteExecute=true
RestrictRealtime=true
RestrictNamespaces=true

# Environment
Environment=RUST_LOG=info,cortex_tui=info
Environment=CORTEX_BIND_ADDRESS=127.0.0.1:8080
Environment=CORTEX_AGENTS_MD_PATH=/var/lib/cortex/agents.md
EnvironmentFile=-/etc/cortex/cortex-tui.env

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable cortex-tui.service
sudo systemctl start cortex-tui.service
```

### Firewall Configuration

```bash
# UFW example
sudo ufw allow from 10.0.0.0/8 to any port 8080 comment 'Cortex TUI internal'
sudo ufw deny 8080 comment 'Block external access to Cortex TUI'

# iptables example
iptables -A INPUT -s 10.0.0.0/8 -p tcp --dport 8080 -j ACCEPT
iptables -A INPUT -p tcp --dport 8080 -j DROP
```

## Backup and Recovery

### Data Backup

```bash
#!/bin/bash
# backup-cortex.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/cortex"
SOURCE_DIR="/var/lib/cortex"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup memory files
tar -czf "$BACKUP_DIR/cortex-memory-$DATE.tar.gz" \
    -C "$SOURCE_DIR" \
    agents.md

# Backup configuration
cp -r /etc/cortex "$BACKUP_DIR/config-$DATE"

# Cleanup old backups (keep 30 days)
find "$BACKUP_DIR" -name "cortex-*" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/cortex-memory-$DATE.tar.gz"
```

### Recovery Process

```bash
#!/bin/bash
# restore-cortex.sh

BACKUP_FILE="$1"
RESTORE_DIR="/var/lib/cortex"

if [[ -z "$BACKUP_FILE" ]]; then
    echo "Usage: $0 <backup-file.tar.gz>"
    exit 1
fi

# Stop service
sudo systemctl stop cortex-tui.service

# Restore files
sudo tar -xzf "$BACKUP_FILE" -C "$RESTORE_DIR"

# Fix permissions
sudo chown -R cortex-tui:cortex-tui "$RESTORE_DIR"
sudo chmod 600 "$RESTORE_DIR/agents.md"

# Start service
sudo systemctl start cortex-tui.service

echo "Restore completed from $BACKUP_FILE"
```

## Troubleshooting

### Common Issues

1. **Port binding errors**

   ```bash
   # Check if port is in use
   sudo netstat -tulpn | grep 8080

   # Check service status
   sudo systemctl status cortex-tui.service

   # View logs
   sudo journalctl -u cortex-tui.service -f
   ```

2. **Permission issues**

   ```bash
   # Fix file permissions
   sudo chown -R cortex-tui:cortex-tui /var/lib/cortex
   sudo chmod 600 /var/lib/cortex/agents.md
   ```

3. **Memory/Storage issues**

   ```bash
   # Check disk usage
   df -h /var/lib/cortex

   # Check memory usage
   sudo ps aux | grep cortex-tui
   ```

4. **MCP connectivity issues**

   ```bash
   # Test MCP servers
   curl -X GET http://localhost:8080/mcp/servers

   # Check MCP logs
   grep "MCP" /var/log/cortex/cortex-tui.log
   ```

### Performance Tuning

```bash
# Increase file descriptor limits
echo "cortex-tui soft nofile 65536" >> /etc/security/limits.conf
echo "cortex-tui hard nofile 65536" >> /etc/security/limits.conf

# Tune kernel parameters for high-performance networking
echo "net.core.somaxconn = 65535" >> /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65535" >> /etc/sysctl.conf
sysctl -p
```

## Monitoring Integration

### Prometheus Metrics

The system exposes Prometheus-compatible metrics at `/metrics`:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'cortex-tui'
    static_configs:
      - targets: ['localhost:8080']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### Alerting Rules

```yaml
# cortex-alerts.yml
groups:
  - name: cortex-tui
    rules:
      - alert: CortexTUIDown
        expr: up{job="cortex-tui"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'Cortex TUI is down'

      - alert: CortexTUIHighErrorRate
        expr: rate(cortex_requests_failed_total[5m]) / rate(cortex_requests_total[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: 'High error rate in Cortex TUI'
```

## Version Updates

### Rolling Update Process

1. **Prepare new version:**

   ```bash
   # Build new version
   cargo build --release
   sudo cp target/release/cortex-tui /opt/cortex-tui/cortex-tui.new
   ```

2. **Update with zero downtime:**

   ```bash
   # Start new instance on different port
   sudo -u cortex-tui CORTEX_BIND_ADDRESS="127.0.0.1:8081" \
     /opt/cortex-tui/cortex-tui.new daemon --port 8081 &

   # Update load balancer to point to new instance
   # Then stop old instance
   sudo systemctl stop cortex-tui.service

   # Replace binary and restart
   sudo mv /opt/cortex-tui/cortex-tui.new /opt/cortex-tui/cortex-tui
   sudo systemctl start cortex-tui.service
   ```

3. **Verify deployment:**
   ```bash
   curl http://localhost:8080/health
   sudo systemctl status cortex-tui.service
   ```

This deployment guide ensures secure, scalable, and maintainable production deployments of Cortex TUI v2.0.
