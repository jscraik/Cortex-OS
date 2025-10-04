# brAInwav Zero-Trust A2A Gateway Deployment Guide

## Overview

This document provides comprehensive deployment instructions for the brAInwav Zero-Trust Agent-to-Agent (A2A) Gateway system. The implementation follows NIST SP 800-207 zero-trust principles and addresses OWASP LLM Top-10 security concerns.

## Architecture Components

### Core Security Components
- **A2A Gateway**: Central authorization enforcement point
- **Capability Issuer**: Short-lived token management (5-minute TTL)
- **Policy Engine**: OPA/WASM-based decision engine
- **Execution Isolator**: Sandbox tier (gVisor/Firecracker/Kata)
- **Tamper-Evident Audit**: Hash-chained audit logging

### Integration Points
- **MCP Server Security**: Secured boundaries with envelope validation
- **Signed Envelopes**: JWS-based request authentication
- **OpenTelemetry**: Distributed tracing and observability
- **Circuit Breaker**: Agent-level failure protection

## Prerequisites

### Infrastructure Requirements
- Kubernetes 1.24+ (for production deployment)
- Docker 20.10+ with security features
- runsc (gVisor) or kata-runtime installed
- PostgreSQL 14+ for audit storage
- Redis 6+ for capability token caching

### Security Requirements
- TLS 1.3 certificates (mTLS for service-to-service)
- SPIFFE/SPIRE workload identity (recommended)
- Hardware Security Module (HSM) for production secrets
- Network policies enforcing zero-trust boundaries

### Observability Stack
- OpenTelemetry Collector
- Prometheus for metrics
- Grafana for dashboards
- Jaeger/Zipkin for tracing

## Installation

### 1. Environment Setup

```bash
# Create brAInwav namespace
kubectl create namespace brainwav-security

# Create security context constraints
kubectl apply -f - <<EOF
apiVersion: security.openshift.io/v1
kind: SecurityContextConstraints
metadata:
  name: brainwav-zero-trust-scc
  annotations:
    kubernetes.io/description: "brAInwav Zero-Trust Security Context"
allowHostDirVolumePlugin: false
allowHostIPC: false
allowHostNetwork: false
allowHostPID: false
allowHostPorts: false
allowPrivileged: false
allowPrivilegedContainer: false
runAsUser:
  type: MustRunAsNonRoot
seLinuxContext:
  type: MustRunAs
  seLinuxOptions:
    level: "s0:c123,c456"
EOF
```

### 2. Certificate Management

```bash
# Generate CA certificate for brAInwav services
openssl genrsa -out brainwav-ca-key.pem 4096
openssl req -new -x509 -sha256 -key brainwav-ca-key.pem -out brainwav-ca.pem \
  -days 365 -subj "/C=US/ST=CA/L=SF/O=brAInwav/CN=brAInwav-ca"

# Generate service certificates
openssl genrsa -out brainwav-gateway-key.pem 2048
openssl req -new -key brainwav-gateway-key.pem -out brainwav-gateway.csr \
  -subj "/C=US/ST=CA/L=SF/O=brAInwav/CN=brainwav-a2a-gateway"
openssl x509 -req -in brainwav-gateway.csr -CA brainwav-ca.pem \
  -CAkey brainwav-ca-key.pem -CAcreateserial -out brainwav-gateway.pem -days 365

# Create Kubernetes secrets
kubectl create secret tls brainwav-gateway-tls \
  --cert=brainwav-gateway.pem \
  --key=brainwav-gateway-key.pem \
  -n brainwav-security
```

### 3. Configuration Secrets

```bash
# Generate capability signing secret
CAPABILITY_SECRET=$(openssl rand -base64 32)

# Create configuration secret
kubectl create secret generic brainwav-config \
  --from-literal=capability-secret="$CAPABILITY_SECRET" \
  --from-literal=mcp-api-key="$(openssl rand -base64 24)" \
  --from-literal=audit-sink-url="https://audit.brainwav.io/events" \
  -n brainwav-security
```

### 4. Deploy OPA Policies

```bash
# Compile Rego policies to WASM
cd packages/security/policy/opa
opa build -t wasm -e a2a/security -e mcp/tools *.rego

# Create policy ConfigMap
kubectl create configmap brainwav-opa-policies \
  --from-file=security_policy.wasm=bundle.tar.gz \
  -n brainwav-security
```

### 5. Deploy A2A Gateway

```yaml
# brainwav-a2a-gateway-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: brainwav-a2a-gateway
  namespace: brainwav-security
  labels:
    app: brainwav-a2a-gateway
    component: security
    branding: brAInwav
spec:
  replicas: 3
  selector:
    matchLabels:
      app: brainwav-a2a-gateway
  template:
    metadata:
      labels:
        app: brainwav-a2a-gateway
        branding: brAInwav
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: brainwav-gateway-sa
      securityContext:
        runAsNonRoot: true
        runAsUser: 65534
        fsGroup: 65534
      containers:
      - name: a2a-gateway
        image: brainwav/zero-trust-gateway:1.0.0
        ports:
        - containerPort: 3000
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: BRAINWAV_CAPABILITY_SECRET
          valueFrom:
            secretKeyRef:
              name: brainwav-config
              key: capability-secret
        - name: BRAINWAV_MCP_API_KEY
          valueFrom:
            secretKeyRef:
              name: brainwav-config
              key: mcp-api-key
        - name: NODE_ENV
          value: "production"
        - name: LOG_LEVEL
          value: "info"
        volumeMounts:
        - name: tls-certs
          mountPath: /certs
          readOnly: true
        - name: opa-policies
          mountPath: /policies
          readOnly: true
        - name: audit-logs
          mountPath: /var/log/brainwav
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 2000m
            memory: 2Gi
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
          readOnlyRootFilesystem: true
      volumes:
      - name: tls-certs
        secret:
          secretName: brainwav-gateway-tls
      - name: opa-policies
        configMap:
          name: brainwav-opa-policies
      - name: audit-logs
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: brainwav-a2a-gateway
  namespace: brainwav-security
  labels:
    app: brainwav-a2a-gateway
    branding: brAInwav
spec:
  selector:
    app: brainwav-a2a-gateway
  ports:
  - name: http
    port: 80
    targetPort: 3000
  - name: metrics
    port: 9090
    targetPort: 9090
  type: ClusterIP
```

### 6. Deploy Execution Isolation

```yaml
# brainwav-sandbox-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: brainwav-sandbox-daemon
  namespace: brainwav-security
  labels:
    app: brainwav-sandbox
    branding: brAInwav
spec:
  selector:
    matchLabels:
      app: brainwav-sandbox
  template:
    metadata:
      labels:
        app: brainwav-sandbox
        branding: brAInwav
    spec:
      hostPID: false
      hostNetwork: false
      containers:
      - name: gvisor-runtime
        image: gcr.io/gvisor/runsc:latest
        securityContext:
          privileged: true
        volumeMounts:
        - name: runsc-bin
          mountPath: /usr/local/bin/runsc
        - name: containerd-config
          mountPath: /etc/containerd/config.toml
        command:
        - /bin/sh
        - -c
        - |
          echo "Configuring brAInwav gVisor runtime"
          cat > /etc/containerd/config.toml <<EOF
          [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runsc]
            runtime_type = "io.containerd.runsc.v1"
          [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runsc.options]
            TypeUrl = "io.containerd.runsc.v1.options"
            ConfigPath = "/etc/containerd/runsc.toml"
          EOF
          echo "brAInwav gVisor runtime configured"
          sleep infinity
      volumes:
      - name: runsc-bin
        hostPath:
          path: /usr/local/bin/runsc
      - name: containerd-config
        hostPath:
          path: /etc/containerd/config.toml
```

## Configuration

### Environment Variables

```bash
# brAInwav Security Configuration
export BRAINWAV_CAPABILITY_SECRET="your-secret-key-here"
export BRAINWAV_CA_CERT_PATH="/certs/brainwav-ca.pem"
export BRAINWAV_CERT_PATH="/certs/brainwav-gateway.pem"
export BRAINWAV_KEY_PATH="/certs/brainwav-gateway-key.pem"
export BRAINWAV_AUDIT_SINK_URL="https://audit.brainwav.io/events"
export BRAINWAV_MCP_API_KEY="your-mcp-api-key"

# OpenTelemetry Configuration
export OTEL_EXPORTER_OTLP_ENDPOINT="https://otlp.brainwav.io"
export OTEL_EXPORTER_OTLP_HEADERS="authorization=Bearer your-token"
export OTEL_SERVICE_NAME="brainwav-zero-trust-gateway"
export OTEL_SERVICE_VERSION="1.0.0"
```

### Policy Configuration

The system uses two main policy files:

1. **A2A Security Policy** (`a2a-security.rego`)
   - Risk-based authorization
   - Capability validation
   - Budget enforcement
   - Time-based access controls

2. **MCP Tools Policy** (`mcp-tools.rego`)
   - Tool-specific authorization
   - Sandbox requirements
   - Rate limiting
   - Session validation

### Runtime Configuration

Create `/etc/brainwav/config.json` based on the example configuration:

```bash
cp packages/security/examples/zero-trust-config.example.json /etc/brainwav/config.json
# Edit configuration with your environment-specific values
```

## Testing

### Unit Tests

```bash
# Run comprehensive test suite
cd packages/security
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm test -- --grep "A2AGateway"
npm test -- --grep "CapabilityToken"
npm test -- --grep "ExecutionIsolator"
```

### Integration Tests

```bash
# Test A2A gateway integration
curl -X POST https://gateway.brainwav.io/authorize \
  -H "Content-Type: application/json" \
  -H "X-brAInwav-A2A-Envelope: $(echo '{"req_id":"test-123","agent_id":"test-agent","action":"invoke:tool.memory-search","resource":"rag/corpus/test","context":{"tenant":"test","request_cost":0.01,"ts":'$(date +%s)'},"capabilities":["test-capability"],"sig":"test-signature"}' | base64)"

# Test capability issuance
curl -X POST https://caps.brainwav.io/issue \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "test-agent",
    "tenant": "test",
    "actions": ["invoke:tool.memory-search"],
    "resource_prefixes": ["rag/corpus/"],
    "ttl_seconds": 300
  }'

# Test execution isolation
curl -X POST https://sandbox.brainwav.io/execute \
  -H "Content-Type: application/json" \
  -d '{
    "command": "echo",
    "args": ["Hello brAInwav Sandbox"],
    "timeout_seconds": 10
  }'
```

### Security Validation

```bash
# Verify certificate chain
openssl verify -CAfile brainwav-ca.pem brainwav-gateway.pem

# Test mTLS connection
curl --cert brainwav-client.pem --key brainwav-client-key.pem \
  --cacert brainwav-ca.pem \
  https://gateway.brainwav.io/health

# Validate policy compilation
opa test packages/security/policy/opa/

# Check audit chain integrity
curl https://audit.brainwav.io/verify?start=1&end=1000
```

## Monitoring and Alerting

### Prometheus Metrics

Key metrics exposed by the brAInwav Zero-Trust Gateway:

```
# Authorization decisions
brainwav_a2a_decisions_total{decision="allow|deny",tenant,agent_id}
brainwav_a2a_decision_duration_seconds{tenant,agent_id}

# Capability tokens
brainwav_capabilities_issued_total{tenant,agent_id}
brainwav_capabilities_active{tenant}

# Circuit breaker
brainwav_circuit_breaker_state{agent_id,state="open|closed|half-open"}

# Execution isolation
brainwav_sandbox_executions_total{type="gvisor|firecracker|kata",exit_code}
brainwav_sandbox_duration_seconds{type}

# Audit events
brainwav_audit_events_total{event_type}
brainwav_audit_chain_length
```

### Grafana Dashboards

Create dashboards monitoring:
- Authorization success/failure rates
- Average decision latency (P50/P95/P99)
- Active capability tokens by tenant
- Circuit breaker states
- Sandbox execution metrics
- Audit chain integrity

### Alerting Rules

```yaml
# brainwav-alerts.yaml
groups:
- name: brainwav-zero-trust
  rules:
  - alert: brAInwavHighDenialRate
    expr: rate(brainwav_a2a_decisions_total{decision="deny"}[5m]) > 0.5
    for: 2m
    labels:
      severity: warning
      component: brAInwav-security
    annotations:
      summary: "brAInwav high denial rate detected"
      description: "{{ $value }} denials per second in the last 5 minutes"

  - alert: brAInwavCircuitBreakerOpen
    expr: brainwav_circuit_breaker_state{state="open"} > 0
    for: 1m
    labels:
      severity: critical
      component: brAInwav-security
    annotations:
      summary: "brAInwav circuit breaker open for agent {{ $labels.agent_id }}"

  - alert: brAInwavAuditChainBroken
    expr: increase(brainwav_audit_verification_failures_total[5m]) > 0
    for: 0m
    labels:
      severity: critical
      component: brAInwav-security
    annotations:
      summary: "brAInwav audit chain integrity compromised"
```

## Troubleshooting

### Common Issues

#### 1. Certificate Validation Failures
```bash
# Check certificate validity
openssl x509 -in brainwav-gateway.pem -text -noout

# Verify certificate chain
openssl verify -CAfile brainwav-ca.pem brainwav-gateway.pem

# Check certificate expiration
openssl x509 -in brainwav-gateway.pem -enddate -noout
```

#### 2. Policy Evaluation Errors
```bash
# Test policy compilation
opa build -t wasm packages/security/policy/opa/*.rego

# Validate policy syntax
opa fmt packages/security/policy/opa/

# Test policy decisions
opa eval -d packages/security/policy/opa/ "data.a2a.security.allow" \
  --input '{
    "authn": {"valid": true},
    "action": "invoke:tool.memory-search",
    "resource": "rag/corpus/test",
    "tenant": "test",
    "capabilities": [{"action": "invoke:tool.memory-search", "resource_prefix": "rag/corpus/"}]
  }'
```

#### 3. Sandbox Execution Failures
```bash
# Check gVisor installation
runsc --version

# Test sandbox directly
runsc run --network=none test-container

# Check sandbox permissions
kubectl describe node | grep -A 5 "Container Runtime Version"
```

#### 4. Audit Chain Issues
```bash
# Verify audit file integrity
jq -s 'map(select(.sequence != null)) | sort_by(.sequence) | .[0:10]' /var/log/brainwav/audit.jsonl

# Check hash chain
node -e "
const fs = require('fs');
const crypto = require('crypto');
const lines = fs.readFileSync('/var/log/brainwav/audit.jsonl', 'utf8').trim().split('\n');
let prevHash = 'genesis';
for (const line of lines) {
  const record = JSON.parse(line);
  if (record.prev_hash !== prevHash) {
    console.error('Chain broken at sequence', record.sequence);
    process.exit(1);
  }
  prevHash = record.record_hash;
}
console.log('brAInwav audit chain integrity verified');
"
```

## Security Considerations

### Production Hardening

1. **Network Segmentation**
   - Isolate brAInwav components in dedicated VPC/subnet
   - Implement strict firewall rules
   - Use network policies for pod-to-pod communication

2. **Secret Management**
   - Use Hardware Security Module (HSM) for capability secrets
   - Implement secret rotation every 30 days
   - Use separate secrets per environment

3. **Access Controls**
   - Implement RBAC for Kubernetes resources
   - Use Pod Security Standards
   - Enable audit logging for all API calls

4. **Runtime Security**
   - Use distroless container images
   - Implement runtime security monitoring
   - Regular vulnerability scanning

### Compliance

The brAInwav Zero-Trust Gateway addresses:

- **NIST SP 800-207**: Zero Trust Architecture principles
- **OWASP LLM Top-10**: LLM-specific security risks
- **SOC 2 Type II**: Security and availability controls
- **ISO 27001**: Information security management
- **GDPR**: Data protection and privacy by design

## Support

For brAInwav Zero-Trust Gateway support:

- **Documentation**: https://docs.brainwav.io/zero-trust
- **Issues**: https://github.com/brainwav/cortex-os/issues
- **Security**: security@brainwav.io
- **Commercial**: enterprise@brainwav.io

---

**brAInwav Zero-Trust Gateway v1.0.0**  
*Securing AI Agent Communications*
