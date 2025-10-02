# brAInwav Cortex WebUI Production Monitoring Setup

## Overview

This guide covers the comprehensive monitoring infrastructure for the brAInwav Cortex WebUI in production. The monitoring stack provides observability into application performance, infrastructure health, and business metrics to ensure reliable operations and rapid incident response.

## Monitoring Architecture

### Components Overview
- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboarding
- **AlertManager**: Alert routing and management
- **Loki**: Log aggregation (optional)
- **Tempo**: Distributed tracing (optional)
- **DataDog/NewRelic**: APM integration (optional)

### Data Flow
```
Applications → Prometheus → Grafana Dashboards
              ↓              ↓
         AlertManager → Notification Channels
              ↓
      Loki/Tempo → Log/Trace Analysis
```

## 1. Prometheus Configuration

### 1.1 Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'cortex-prod'
    region: 'us-west-2'
    environment: 'production'

rule_files:
  - "/etc/prometheus/rules/*.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  # Cortex WebUI Backend
  - job_name: 'cortex-webui-backend'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - cortex-webui
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__
      - action: labelmap
        regex: __meta_kubernetes_pod_label_(.+)
      - source_labels: [__meta_kubernetes_namespace]
        action: replace
        target_label: kubernetes_namespace
      - source_labels: [__meta_kubernetes_pod_name]
        action: replace
        target_label: kubernetes_pod_name
    metrics_path: /metrics
    scrape_interval: 15s
    scrape_timeout: 10s

  # Cortex WebUI Frontend (via Nginx)
  - job_name: 'cortex-webui-frontend'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - cortex-webui
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app_kubernetes_io_component]
        action: keep
        regex: frontend
      - source_labels: [__address__]
        action: replace
        target_label: __address__
        regex: (.+)
        replacement: $1:9113  # nginx-exporter
    metrics_path: /metrics
    scrape_interval: 30s

  # Kubernetes Nodes
  - job_name: 'kubernetes-nodes'
    kubernetes_sd_configs:
      - role: node
    relabel_configs:
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)
      - target_label: __address__
        replacement: kubernetes.default.svc:443
      - source_labels: [__meta_kubernetes_node_name]
        regex: (.+)
        target_label: __metrics_path__
        replacement: /api/v1/nodes/${1}/proxy/metrics

  # Kubernetes Pods
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__
      - action: labelmap
        regex: __meta_kubernetes_pod_label_(.+)
      - source_labels: [__meta_kubernetes_namespace]
        action: replace
        target_label: kubernetes_namespace
      - source_labels: [__meta_kubernetes_pod_name]
        action: replace
        target_label: kubernetes_pod_name

  # Blackbox Exporter (URL monitoring)
  - job_name: 'blackbox'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
        - https://cortex.brainwav.ai
        - https://api.cortex.brainwav.ai
        - https://api.cortex.brainwav.ai/health
        - https://api.cortex.brainwav.ai/metrics
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115

# Storage Configuration
remote_write:
  - url: "https://prometheus-remote-write.brainwav.ai/api/v1/write"
    basic_auth:
      username: "cortex-webui"
      password: "${PROMETHEUS_REMOTE_WRITE_PASSWORD}"
    queue_config:
      max_samples_per_send: 1000
      max_shards: 200
      capacity: 2500
```

### 1.2 Prometheus Recording Rules

```yaml
# recording-rules.yml
groups:
  - name: cortex-webui.rules
    interval: 15s
    rules:
      # Application Performance
      - record: cortex:backend:http_request_duration_seconds:rate5m
        expr: rate(http_request_duration_seconds_sum{job="cortex-webui-backend"}[5m]) /
              rate(http_request_duration_seconds_count{job="cortex-webui-backend"}[5m])

      - record: cortex:backend:http_requests:rate5m
        expr: sum(rate(http_requests_total{job="cortex-webui-backend"}[5m])) by (method, status)

      - record: cortex:backend:error_rate:rate5m
        expr: sum(rate(http_requests_total{job="cortex-webui-backend",status=~"5.."}[5m])) /
              sum(rate(http_requests_total{job="cortex-webui-backend"}[5m]))

      # Database Performance
      - record: cortex:database:connections:current
        expr: database_connections_active{job="cortex-webui-backend"}

      - record: cortex:database:query_duration:rate5m
        expr: rate(database_query_duration_seconds_sum{job="cortex-webui-backend"}[5m]) /
              rate(database_query_duration_seconds_count{job="cortex-webui-backend"}[5m])

      # Cache Performance
      - record: cortex:cache:hit_rate:rate5m
        expr: rate(cache_hits_total{job="cortex-webui-backend"}[5m]) /
              (rate(cache_hits_total{job="cortex-webui-backend"}[5m]) + rate(cache_misses_total{job="cortex-webui-backend"}[5m]))

      # Memory Usage
      - record: cortex:backend:memory_usage_bytes
        expr: process_resident_memory_bytes{job="cortex-webui-backend"}

      - record: cortex:backend:memory_usage_percent
        expr: (process_resident_memory_bytes{job="cortex-webui-backend"} /
              container_spec_memory_limit_bytes{pod=~".*-backend.*"}) * 100

      # CPU Usage
      - record: cortex:backend:cpu_usage:rate5m
        expr: rate(process_cpu_seconds_total{job="cortex-webui-backend"}[5m])

      # Frontend Performance
      - record: cortex:frontend:nginx_connections_active
        expr: nginx_connections_active{job="cortex-webui-frontend"}

      - record: cortex:frontend:nginx_requests:rate5m
        expr: sum(rate(nginx_http_requests_total{job="cortex-webui-frontend"}[5m])) by (status)

      # Business Metrics
      - record: cortex:users:active:rate1h
        expr: increase(active_users_total{job="cortex-webui-backend"}[1h])

      - record: cortex:ai_requests:total:rate5m
        expr: sum(rate(ai_requests_total{job="cortex-webui-backend"}[5m])) by (model)

      - record: cortex:ai_requests:error_rate:rate5m
        expr: sum(rate(ai_requests_total{job="cortex-webui-backend",status=~"5.."}[5m])) /
              sum(rate(ai_requests_total{job="cortex-webui-backend"}[5m]))

      # SLO Metrics
      - record: cortex:slo:http_request_latency_seconds:burnrate5m
        expr: sum(rate(http_request_duration_seconds_bucket{job="cortex-webui-backend",le="0.5"}[5m])) /
              sum(rate(http_request_duration_seconds_count{job="cortex-webui-backend"}[5m]))

      - record: cortex:slo:http_error_rate:burnrate5m
        expr: sum(rate(http_requests_total{job="cortex-webui-backend",status=~"5.."}[5m])) /
              sum(rate(http_requests_total{job="cortex-webui-backend"}[5m]))
```

### 1.3 Prometheus Alerting Rules

```yaml
# alerting-rules.yml
groups:
  - name: cortex-webui.alerts
    interval: 15s
    rules:
      # Application Health Alerts
      - alert: BackendDown
        expr: up{job="cortex-webui-backend"} == 0
        for: 30s
        labels:
          severity: critical
          service: cortex-webui
          component: backend
        annotations:
          summary: "Cortex WebUI Backend is down"
          description: "Cortex WebUI Backend has been down for more than 30 seconds."
          runbook_url: "https://runbooks.brainwav.ai/cortex-webui/backend-down"

      - alert: HighErrorRate
        expr: cortex:backend:error_rate:rate5m > 0.05
        for: 2m
        labels:
          severity: warning
          service: cortex-webui
          component: backend
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} for the last 5 minutes."
          runbook_url: "https://runbooks.brainwav.ai/cortex-webui/high-error-rate"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="cortex-webui-backend"}[5m])) > 1
        for: 5m
        labels:
          severity: warning
          service: cortex-webui
          component: backend
        annotations:
          summary: "High latency detected"
          description: "95th percentile latency is {{ $value }}s for the last 5 minutes."
          runbook_url: "https://runbooks.brainwav.ai/cortex-webui/high-latency"

      # Resource Alerts
      - alert: HighMemoryUsage
        expr: cortex:backend:memory_usage_percent > 85
        for: 5m
        labels:
          severity: warning
          service: cortex-webui
          component: backend
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value }}% for pod {{ $labels.pod }}."
          runbook_url: "https://runbooks.brainwav.ai/cortex-webui/high-memory-usage"

      - alert: HighCPUUsage
        expr: rate(process_cpu_seconds_total{job="cortex-webui-backend"}[5m]) > 0.8
        for: 5m
        labels:
          severity: warning
          service: cortex-webui
          component: backend
        annotations:
          summary: "High CPU usage"
          description: "CPU usage is {{ $value | humanizePercentage }} for pod {{ $labels.pod }}."
          runbook_url: "https://runbooks.brainwav.ai/cortex-webui/high-cpu-usage"

      # Database Alerts
      - alert: DatabaseConnectionPoolExhausted
        expr: database_connections_active / database_connections_max > 0.9
        for: 2m
        labels:
          severity: critical
          service: cortex-webui
          component: database
        annotations:
          summary: "Database connection pool nearly exhausted"
          description: "Database connection pool usage is {{ $value | humanizePercentage }}."
          runbook_url: "https://runbooks.brainwav.ai/cortex-webui/db-pool-exhausted"

      - alert: DatabaseSlowQueries
        expr: cortex:database:query_duration:rate5m > 2
        for: 5m
        labels:
          severity: warning
          service: cortex-webui
          component: database
        annotations:
          summary: "Slow database queries detected"
          description: "Average query duration is {{ $value }}s."
          runbook_url: "https://runbooks.brainwav.ai/cortex-webui/slow-db-queries"

      # Cache Alerts
      - alert: LowCacheHitRate
        expr: cortex:cache:hit_rate:rate5m < 0.7
        for: 10m
        labels:
          severity: warning
          service: cortex-webui
          component: cache
        annotations:
          summary: "Low cache hit rate"
          description: "Cache hit rate is {{ $value | humanizePercentage }}."
          runbook_url: "https://runbooks.brainwav.ai/cortex-webui/low-cache-hit-rate"

      # SLO Alerts
      - alert: SLOHTTPLatencyBurnRate
        expr: cortex:slo:http_request_latency_seconds:burnrate5m > 14.4
        for: 2m
        labels:
          severity: critical
          service: cortex-webui
          slo: http_latency
        annotations:
          summary: "HTTP latency SLO burn rate critical"
          description: "HTTP latency SLO burn rate is {{ $value }} (fast burn)."
          runbook_url: "https://runbooks.brainwav.ai/cortex-webui/slo-latency-burn"

      - alert: SLOHTTPErrorRateBurnRate
        expr: cortex:slo:http_error_rate:burnrate5m > 6
        for: 1m
        labels:
          severity: critical
          service: cortex-webui
          slo: http_error_rate
        annotations:
          summary: "HTTP error rate SLO burn rate critical"
          description: "HTTP error rate SLO burn rate is {{ $value }} (fast burn)."
          runbook_url: "https://runbooks.brainwav.ai/cortex-webui/slo-error-burn"

      # Infrastructure Alerts
      - alert: PodCrashLooping
        expr: rate(kube_pod_container_status_restarts_total{namespace="cortex-webui"}[5m]) > 0
        for: 5m
        labels:
          severity: critical
          service: cortex-webui
          component: infrastructure
        annotations:
          summary: "Pod is crash looping"
          description: "Pod {{ $labels.pod }} is crash looping."
          runbook_url: "https://runbooks.brainwav.ai/cortex-webui/pod-crash-looping"

      - alert: HighPodRestartCount
        expr: kube_pod_container_status_restarts_total{namespace="cortex-webui"} > 5
        for: 0s
        labels:
          severity: warning
          service: cortex-webui
          component: infrastructure
        annotations:
          summary: "High pod restart count"
          description: "Pod {{ $labels.pod }} has restarted {{ $value }} times."
          runbook_url: "https://runbooks.brainwav.ai/cortex-webui/high-restart-count"

      # SSL Certificate Alerts
      - alert: SSLCertificateExpiringSoon
        expr: probe_ssl_earliest_cert_expiry - time() < 86400 * 30
        for: 0s
        labels:
          severity: warning
          service: cortex-webui
          component: security
        annotations:
          summary: "SSL certificate expiring soon"
          description: "SSL certificate for {{ $labels.instance }} expires in {{ $value | humanizeDuration }}."
          runbook_url: "https://runbooks.brainwav.ai/cortex-webui/ssl-expiring"
```

## 2. Grafana Dashboards

### 2.1 Application Overview Dashboard

```json
{
  "dashboard": {
    "id": null,
    "title": "Cortex WebUI - Application Overview",
    "tags": ["cortex-webui", "application"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Request Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{job=\"cortex-webui-backend\"}[5m]))",
            "legendFormat": "RPS"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "reqps",
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 50},
                {"color": "red", "value": 100}
              ]
            }
          }
        },
        "gridPos": {"h": 8, "w": 6, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Error Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "cortex:backend:error_rate:rate5m",
            "legendFormat": "Error Rate"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percentunit",
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 0.01},
                {"color": "red", "value": 0.05}
              ]
            }
          }
        },
        "gridPos": {"h": 8, "w": 6, "x": 6, "y": 0}
      },
      {
        "id": 3,
        "title": "P95 Latency",
        "type": "stat",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job=\"cortex-webui-backend\"}[5m]))",
            "legendFormat": "P95"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s",
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 0.5},
                {"color": "red", "value": 1}
              ]
            }
          }
        },
        "gridPos": {"h": 8, "w": 6, "x": 12, "y": 0}
      },
      {
        "id": 4,
        "title": "Memory Usage",
        "type": "stat",
        "targets": [
          {
            "expr": "cortex:backend:memory_usage_percent",
            "legendFormat": "Memory %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 70},
                {"color": "red", "value": 85}
              ]
            }
          }
        },
        "gridPos": {"h": 8, "w": 6, "x": 18, "y": 0}
      },
      {
        "id": 5,
        "title": "Request Rate (Time Series)",
        "type": "timeseries",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{job=\"cortex-webui-backend\"}[5m])) by (method)",
            "legendFormat": "{{method}}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8}
      },
      {
        "id": 6,
        "title": "Response Time Distribution",
        "type": "timeseries",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket{job=\"cortex-webui-backend\"}[5m]))",
            "legendFormat": "P50"
          },
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job=\"cortex-webui-backend\"}[5m]))",
            "legendFormat": "P95"
          },
          {
            "expr": "histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{job=\"cortex-webui-backend\"}[5m]))",
            "legendFormat": "P99"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8}
      }
    ],
    "time": {"from": "now-1h", "to": "now"},
    "refresh": "30s"
  }
}
```

### 2.2 SLO Dashboard

```json
{
  "dashboard": {
    "id": null,
    "title": "Cortex WebUI - SLO Monitoring",
    "tags": ["cortex-webui", "slo"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "HTTP Latency SLO - 30 Day",
        "type": "stat",
        "targets": [
          {
            "expr": "(sum(rate(http_request_duration_seconds_bucket{job=\"cortex-webui-backend\",le=\"0.5\"}[30d])) / sum(rate(http_request_duration_seconds_count{job=\"cortex-webui-backend\"}[30d]))) * 100",
            "legendFormat": "Latency SLO Compliance"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "thresholds": {
              "steps": [
                {"color": "red", "value": null},
                {"color": "yellow", "value": 95},
                {"color": "green", "value": 97.5}
              ]
            }
          }
        },
        "gridPos": {"h": 8, "w": 6, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "HTTP Error Rate SLO - 30 Day",
        "type": "stat",
        "targets": [
          {
            "expr": "(1 - (sum(rate(http_requests_total{job=\"cortex-webui-backend\",status!~\"5..\"}[30d])) / sum(rate(http_requests_total{job=\"cortex-webui-backend\"}[30d]))) * 100",
            "legendFormat": "Error Rate SLO Compliance"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "thresholds": {
              "steps": [
                {"color": "red", "value": null},
                {"color": "yellow", "value": 99.5},
                {"color": "green", "value": 99.9}
              ]
            }
          }
        },
        "gridPos": {"h": 8, "w": 6, "x": 6, "y": 0}
      },
      {
        "id": 3,
        "title": "Error Budget Remaining",
        "type": "stat",
        "targets": [
          {
            "expr": "(1 - ((sum(rate(http_requests_total{job=\"cortex-webui-backend\",status=~\"5..\"}[30d])) / sum(rate(http_requests_total{job=\"cortex-webui-backend\"}[30d])) / 0.005)) * 100",
            "legendFormat": "Error Budget"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "thresholds": {
              "steps": [
                {"color": "red", "value": null},
                {"color": "yellow", "value": 25},
                {"color": "green", "value": 50}
              ]
            }
          }
        },
        "gridPos": {"h": 8, "w": 6, "x": 12, "y": 0}
      },
      {
        "id": 4,
        "title": "Burn Rate",
        "type": "timeseries",
        "targets": [
          {
            "expr": "cortex:slo:http_error_rate:burnrate5m",
            "legendFormat": "5m Burn Rate"
          },
          {
            "expr": "cortex:slo:http_error_rate:burnrate5m",
            "legendFormat": "1h Burn Rate"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8}
      }
    ],
    "time": {"from": "now-30d", "to": "now"},
    "refresh": "5m"
  }
}
```

### 2.3 Infrastructure Dashboard

```json
{
  "dashboard": {
    "id": null,
    "title": "Cortex WebUI - Infrastructure",
    "tags": ["cortex-webui", "infrastructure"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Pod Status",
        "type": "stat",
        "targets": [
          {
            "expr": "kube_pod_status_phase{namespace=\"cortex-webui\",phase=\"Running\"}",
            "legendFormat": "Running"
          },
          {
            "expr": "kube_pod_status_phase{namespace=\"cortex-webui\",phase=\"Pending\"}",
            "legendFormat": "Pending"
          },
          {
            "expr": "kube_pod_status_phase{namespace=\"cortex-webui\",phase=\"Failed\"}",
            "legendFormat": "Failed"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Resource Usage",
        "type": "timeseries",
        "targets": [
          {
            "expr": "sum(rate(container_cpu_usage_seconds_total{namespace=\"cortex-webui\"}[5m])) by (pod)",
            "legendFormat": "CPU - {{pod}}"
          },
          {
            "expr": "sum(container_memory_working_set_bytes{namespace=\"cortex-webui\"}) by (pod) / 1024 / 1024",
            "legendFormat": "Memory - {{pod}}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      }
    ],
    "time": {"from": "now-1h", "to": "now"},
    "refresh": "30s"
  }
}
```

## 3. AlertManager Configuration

### 3.1 AlertManager Configuration

```yaml
# alertmanager.yml
global:
  smtp_smarthost: 'smtp.brainwav.ai:587'
  smtp_from: 'alerts@cortex.brainwav.ai'
  smtp_auth_username: 'alerts@cortex.brainwav.ai'
  smtp_auth_password: '${SMTP_PASSWORD}'

templates:
  - '/etc/alertmanager/templates/*.tmpl'

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'default'
  routes:
  - match:
      severity: critical
    receiver: 'critical-alerts'
    group_wait: 5s
    repeat_interval: 30m
  - match:
      severity: warning
    receiver: 'warning-alerts'
    repeat_interval: 2h
  - match:
      service: cortex-webui
      slo: "http_latency|http_error_rate"
    receiver: 'slo-alerts'
    group_wait: 0s
    repeat_interval: 15m

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'cluster', 'service']

receivers:
  - name: 'default'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#cortex-alerts'
        title: 'Cortex WebUI Alert'
        text: '{{ template "slack.default.title" . }}'

  - name: 'critical-alerts'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#cortex-critical'
        title: '🚨 CRITICAL: Cortex WebUI'
        text: '{{ template "slack.critical" . }}'
        send_resolved: true
    email_configs:
      - to: 'oncall@cortex.brainwav.io'
        subject: '🚨 CRITICAL: Cortex WebUI - {{ .GroupLabels.alertname }}'
        body: '{{ template "email.default" . }}'
        send_resolved: true
    pagerduty_configs:
      - routing_key: '${PAGERDUTY_ROUTING_KEY}'
        description: '{{ .GroupLabels.alertname }} - {{ .GroupLabels.service }}'

  - name: 'warning-alerts'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#cortex-alerts'
        title: '⚠️ WARNING: Cortex WebUI'
        text: '{{ template "slack.warning" . }}'
        send_resolved: true
    email_configs:
      - to: 'devops@cortex.brainwav.io'
        subject: '⚠️ WARNING: Cortex WebUI - {{ .GroupLabels.alertname }}'
        body: '{{ template "email.default" . }}'

  - name: 'slo-alerts'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#cortex-slo'
        title: '📊 SLO Alert: Cortex WebUI'
        text: '{{ template "slack.slo" . }}'
        send_resolved: true
    email_configs:
      - to: 'sre@cortex.brainwav.io'
        subject: '📊 SLO Alert: Cortex WebUI - {{ .GroupLabels.slo }}'
        body: '{{ template "email.slo" . }}'
```

### 3.2 Alert Templates

```tmpl
{{/* templates/slack.tmpl */}}
{{ define "slack.default.title" }}
{{ range .Alerts }}
{{ .Annotations.summary }}
{{ end }}
{{ end }}

{{ define "slack.critical" }}
🚨 **CRITICAL ALERT** 🚨

*Service*: {{ .GroupLabels.service }}
*Component*: {{ .GroupLabels.component }}

{{ range .Alerts }}
**{{ .Annotations.summary }}**
{{ .Annotations.description }}

*Runbook*: <{{ .Annotations.runbook_url }}|View Runbook>
{{ end }}
{{ end }}

{{ define "slack.warning" }}
⚠️ **WARNING ALERT** ⚠️

*Service*: {{ .GroupLabels.service }}
*Component*: {{ .GroupLabels.component }}

{{ range .Alerts }}
**{{ .Annotations.summary }}**
{{ .Annotations.description }}

*Runbook*: <{{ .Annotations.runbook_url }}|View Runbook>
{{ end }}
{{ end }}

{{ define "slack.slo" }}
📊 **SLO BURN ALERT** 📊

*Service*: {{ .GroupLabels.service }}
*SLO*: {{ .GroupLabels.slo }}

{{ range .Alerts }}
**{{ .Annotations.summary }}**
{{ .Annotations.description }}

*Error Budget Impact*: High
*Action Required*: Immediate investigation needed
{{ end }}
{{ end }}

{{/* templates/email.tmpl */}}
{{ define "email.default" }}
<html>
<body>
<h2>{{ .GroupLabels.alertname }}</h2>
<p><strong>Service:</strong> {{ .GroupLabels.service }}</p>
<p><strong>Component:</strong> {{ .GroupLabels.component }}</p>
<p><strong>Severity:</strong> {{ .GroupLabels.severity }}</p>

{{ range .Alerts }}
<h3>{{ .Annotations.summary }}</h3>
<p>{{ .Annotations.description }}</p>
<p><strong>Runbook:</strong> <a href="{{ .Annotations.runbook_url }}">View Runbook</a></p>
<hr>
{{ end }}

</body>
</html>
{{ end }}

{{ define "email.slo" }}
<html>
<body>
<h2>🚨 SLO Burn Rate Alert 🚨</h2>
<p><strong>Service:</strong> {{ .GroupLabels.service }}</p>
<p><strong>SLO:</strong> {{ .GroupLabels.slo }}</p>

{{ range .Alerts }}
<h3>{{ .Annotations.summary }}</h3>
<p>{{ .Annotations.description }}</p>
<p><strong>Error Budget Impact:</strong> This alert indicates rapid consumption of the error budget.</p>
<p><strong>Action Required:</strong> Immediate investigation and response required.</p>
{{ end }}

</body>
</html>
{{ end }}
```

## 4. APM Integration

### 4.1 DataDog Integration

```typescript
// src/monitoring/datadog.ts
import { datadogLogs } from '@datadog/browser-logs';
import { datadogRum } from '@datadog/browser-rum';

// Frontend DataDog Configuration
export function initDataDogFrontend() {
  datadogLogs.init({
    clientToken: process.env.DATADOG_CLIENT_TOKEN,
    site: 'datadoghq.com',
    forwardErrorsToLogs: true,
    sessionSampleRate: 100,
    service: 'cortex-webui-frontend',
    env: process.env.NODE_ENV,
    version: process.env.APP_VERSION,
  });

  datadogRum.init({
    applicationId: process.env.DATADOG_APP_ID,
    clientToken: process.env.DATADOG_CLIENT_TOKEN,
    site: 'datadoghq.com',
    service: 'cortex-webui-frontend',
    env: process.env.NODE_ENV,
    version: process.env.APP_VERSION,
    sessionSampleRate: 100,
    trackUserInteractions: true,
    trackResources: true,
    trackLongTasks: true,
    defaultPrivacyLevel: 'mask-user-input',
  });
}

// Backend DataDog Integration
import { ddTracer, datadog } from 'datadog-api-client';

export function initDataDogBackend() {
  // Tracing
  const tracer = require('dd-trace').init({
    service: 'cortex-webui-backend',
    env: process.env.NODE_ENV,
    version: process.env.APP_VERSION,
    hostname: process.env.HOSTNAME,
    port: process.env.PORT,
    dogstatsd: {
      host: process.env.DATADOG_HOST,
      port: process.env.DATADOG_PORT,
    },
  });

  // Metrics
  const metrics = new datadog.MetricsApi({
    authMethods: {
      apiKeyAuth: process.env.DATADOG_API_KEY,
      appKeyAuth: process.env.DATADOG_APP_KEY,
    },
  });

  // Custom metrics
  return { tracer, metrics };
}
```

### 4.2 New Relic Integration

```typescript
// src/monitoring/newrelic.ts
import newrelic from 'newrelic';

// Backend New Relic Configuration
export const newrelicConfig = {
  app_name: ['Cortex WebUI Backend'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  logging: {
    level: 'info',
    filepath: 'stdout',
  },
  distributed_tracing: {
    enabled: true,
  },
  browser_monitoring: {
    enabled: true,
  },
  error_collector: {
    enabled: true,
    capture_source_maps: true,
  },
  transaction_tracer: {
    enabled: true,
    record_sql: 'obfuscated',
    stack_trace_threshold: 20,
  },
  browser_monitoring: {
    enabled: true,
  },
};

// Custom metrics
export function recordCustomMetric(name: string, value: number) {
  newrelic.recordMetric(`Custom/${name}`, value);
}

export function recordTransaction(name: string, duration: number) {
  newrelic.endTransaction();
  newrelic.startSegment(name, true, () => {
    return new Promise((resolve) => setTimeout(resolve, duration));
  });
}

// Error tracking
export function trackError(error: Error, customAttributes?: Record<string, any>) {
  newrelic.noticeError(error, customAttributes);
}
```

## 5. Log Aggregation Setup

### 5.1 Loki Configuration

```yaml
# loki.yml
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    address: 127.0.0.1
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
    final_sleep: 0s
  chunk_idle_period: 1h
  max_chunk_age: 1h
  chunk_target_size: 1048576
  chunk_retain_period: 30s

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /loki/boltdb-shipper-active
    cache_location: /loki/boltdb-shipper-cache
    shared_store: filesystem
  filesystem:
    directory: /loki/chunks

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h

chunk_store_config:
  max_look_back_period: 0s

table_manager:
  retention_deletes_enabled: false
  retention_period: 0s
```

### 5.2 Promtail Configuration

```yaml
# promtail.yml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  # Cortex WebUI Backend Logs
  - job_name: cortex-webui-backend
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - cortex-webui
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app_kubernetes_io_component]
        action: keep
        regex: backend
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: pod
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace
      - source_labels: [__meta_kubernetes_pod_container_name]
        target_label: container
      - replacement: /var/log/containers/*backend*.log
        target_label: __path__
    pipeline_stages:
      - json:
          expressions:
            level: level
            message: message
            service: service
            timestamp: timestamp
            trace_id: trace_id
            span_id: span_id
      - timestamp:
          format: RFC3339Nano
          source: timestamp
      - labels:
          level:
          service:
          trace_id:
          span_id:

  # Cortex WebUI Frontend Logs (Nginx)
  - job_name: cortex-webui-frontend
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - cortex-webui
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app_kubernetes_io_component]
        action: keep
        regex: frontend
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: pod
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace
      - replacement: /var/log/containers/*frontend*.log
        target_label: __path__
    pipeline_stages:
      - regex:
          expression: '(?P<remote_addr>\S+) - (?P<remote_user>\S+) \[(?P<time_local>[^\]]+)\] "(?P<method>\S+) (?P<path>\S+) (?P<protocol>\S+)" (?P<status>\d+) (?P<body_bytes_sent>\d+) "(?P<http_referer>[^"]*)" "(?P<http_user_agent>[^"]*)"'
      - timestamp:
          format: '02/Jan/2006:15:04:05 -0700'
          source: time_local
      - labels:
          method:
          status:
          remote_addr:
```

## 6. Distributed Tracing

### 6.1 Jaeger Configuration

```yaml
# jaeger-deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jaeger
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: jaeger
  template:
    metadata:
      labels:
        app: jaeger
    spec:
      containers:
      - name: jaeger
        image: jaegertracing/all-in-one:1.35
        ports:
        - containerPort: 16686
          name: ui
        - containerPort: 14268
          name: collector
        - containerPort: 14250
          name: grpc
        env:
        - name: COLLECTOR_ZIPKIN_HOST_PORT
          value: ":9411"
        - name: SPAN_STORAGE_TYPE
          value: memory
---
apiVersion: v1
kind: Service
metadata:
  name: jaeger
  namespace: monitoring
spec:
  selector:
    app: jaeger
  ports:
  - port: 16686
    targetPort: 16686
    name: ui
  - port: 14268
    targetPort: 14268
    name: collector
  - port: 14250
    targetPort: 14250
    name: grpc
```

### 6.2 OpenTelemetry Integration

```typescript
// src/monitoring/tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-grpc';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// Initialize OpenTelemetry
export function initializeTracing() {
  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'cortex-webui-backend',
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION || '1.0.0',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'production',
    }),
    traceExporter: new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://jaeger:4317',
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();

  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('OpenTelemetry terminated'))
      .catch((error) => console.error('Error terminating OpenTelemetry', error))
      .finally(() => process.exit(0));
  });

  return sdk;
}

// Custom span creation
import { trace } from '@opentelemetry/api';

export function createSpan(name: string, fn: () => Promise<any>) {
  const tracer = trace.getTracer('cortex-webui-backend');

  return tracer.startActiveSpan(name, async (span) => {
    try {
      const result = await fn();
      span.setStatus({ code: trace.SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: trace.SpanStatusCode.ERROR, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

## 7. Monitoring Deployment

### 7.1 Kubernetes Monitoring Stack

```yaml
# monitoring-stack.yml
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring

---
# Prometheus
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      containers:
      - name: prometheus
        image: prom/prometheus:v2.40.0
        ports:
        - containerPort: 9090
        volumeMounts:
        - name: config
          mountPath: /etc/prometheus
        - name: storage
          mountPath: /prometheus
        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
          limits:
            memory: "4Gi"
            cpu: "2"
      volumes:
      - name: config
        configMap:
          name: prometheus-config
      - name: storage
        persistentVolumeClaim:
          claimName: prometheus-pvc

---
# Grafana
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      containers:
      - name: grafana
        image: grafana/grafana:9.3.0
        ports:
        - containerPort: 3000
        env:
        - name: GF_SECURITY_ADMIN_PASSWORD
          valueFrom:
            secretKeyRef:
              name: grafana-secrets
              key: admin-password
        - name: GF_INSTALL_PLUGINS
          value: "grafana-piechart-panel,grafana-worldmap-panel"
        volumeMounts:
        - name: storage
          mountPath: /var/lib/grafana
        - name: provisioning
          mountPath: /etc/grafana/provisioning
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
      volumes:
      - name: storage
        persistentVolumeClaim:
          claimName: grafana-pvc
      - name: provisioning
        configMap:
          name: grafana-provisioning

---
# AlertManager
apiVersion: apps/v1
kind: Deployment
metadata:
  name: alertmanager
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: alertmanager
  template:
    metadata:
      labels:
        app: alertmanager
    spec:
      containers:
      - name: alertmanager
        image: prom/alertmanager:v0.25.0
        ports:
        - containerPort: 9093
        volumeMounts:
        - name: config
          mountPath: /etc/alertmanager
        - name: storage
          mountPath: /alertmanager
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "250m"
      volumes:
      - name: config
        configMap:
          name: alertmanager-config
      - name: storage
        persistentVolumeClaim:
          claimName: alertmanager-pvc
```

### 7.2 Service Monitors

```yaml
# servicemonitor.yml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: cortex-webui-backend
  namespace: monitoring
  labels:
    app: cortex-webui
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: cortex-webui
      app.kubernetes.io/component: backend
  endpoints:
  - port: http
    path: /metrics
    interval: 15s
    scrapeTimeout: 10s
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: cortex-webui-frontend
  namespace: monitoring
  labels:
    app: cortex-webui
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: cortex-webui
      app.kubernetes.io/component: frontend
  endpoints:
  - port: nginx-exporter
    path: /metrics
    interval: 30s
```

## 8. Monitoring Best Practices

### 8.1 Alerting Best Practices

1. **Alert on Symptoms, Not Causes**
   - Alert on user impact (high latency, errors)
   - Not on infrastructure metrics (CPU usage alone)

2. **Use Burn Rate Alerts for SLOs**
   - Fast burn: 1% error budget/hour → Page immediately
   - Slow burn: 5% error budget/day → Ticket

3. **Implement Alert Fatigue Prevention**
   - Group related alerts
   - Use proper severity levels
   - Set appropriate repeat intervals

### 8.2 Dashboard Best Practices

1. **Dashboard Organization**
   - Overview dashboard for quick health checks
   - Detailed dashboards for specific components
   - SLO dashboards for reliability monitoring

2. **Visual Design**
   - Use consistent color schemes
   - Include thresholds and targets
   - Provide context and annotations

3. **Performance Optimization**
   - Use appropriate time ranges
   - Limit the number of panels
   - Cache expensive queries

### 8.3 Metrics Best Practices

1. **Metric Naming**
   - Use consistent naming conventions
   - Include units in metric names
   - Use labels for cardinality control

2. **Cardinality Management**
   - Limit high-cardinality labels
   - Use aggregation rules
   - Monitor metric volume

---

**Monitoring Setup Version**: 1.0.0
**Last Updated**: 2025-10-02
**Next Review**: 2025-11-02

This comprehensive monitoring setup provides full observability into the brAInwav Cortex WebUI production environment, enabling proactive issue detection and rapid incident response.