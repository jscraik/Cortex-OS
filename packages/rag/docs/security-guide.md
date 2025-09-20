# RAG Security Guide

This document outlines the security best practices, threat model, and hardening measures implemented in the RAG package.

## Security Architecture

The RAG package implements a defense-in-depth security strategy with multiple layers of protection:

### 1. Input Validation & Sanitization

#### Content Security

- **XSS Protection**: Comprehensive filtering of malicious scripts, styles, and event handlers
- **Injection Prevention**: Protection against command injection, SQL injection, and code injection
- **Content Size Limits**: Configurable limits on text content and metadata size
- **Prototype Pollution Protection**: Deep sanitization to prevent object prototype manipulation

#### Configuration Validation

- **Strict Schema Validation**: All configuration inputs validated using Zod schemas
- **Type Safety**: Runtime type checking for all external interfaces
- **Range Validation**: Numeric parameters bounded within safe ranges
- **Format Validation**: String inputs validated against expected formats

### 2. Content Security Policy (CSP)

The `ContentSecurityPolicy` class provides comprehensive protection:

```typescript
import { ContentSecurityPolicy } from '@cortex-os/rag';

const csp = new ContentSecurityPolicy({
  xss: {
    enabled: true,
    stripScripts: true,
    stripEventHandlers: true,
  },
  content: {
    maxLength: 100000,
    blockSuspiciousPatterns: true,
  },
  storage: {
    preventPrototypePollution: true,
    validateJsonStructure: true,
  }
});

const safeContent = csp.sanitizeText(userContent);
```

#### Protected Against

- Script injection (`<script>`, `javascript:`, `eval()`)
- Event handler injection (`onclick`, `onload`, etc.)
- Style injection (`<style>` tags)
- Protocol handlers (`file:`, `ftp:`)
- Template injection (`{{`, `${}` patterns)
- SQL injection patterns
- Path traversal (`../`, `..\\`)
- Command injection (`|`, `&`, `;`, `$()`)

### 3. MCP Tool Security

All MCP tools implement strict validation:

#### Input Sanitization

```typescript
// Query validation
const query = sanitizeQuery(rawQuery); // Max 4096 chars, non-empty

// Content validation  
const content = sanitizeContent(rawContent); // Max 25K chars

// Metadata validation
const metadata = sanitizeMetadata(rawMetadata); // Prototype pollution protection
```

#### Security Boundaries

- **Query Length**: 4,096 characters maximum
- **Content Size**: 25,000 characters maximum
- **Metadata Size**: 16,384 bytes maximum
- **Metadata Depth**: 4 levels maximum
- **Array Length**: 50 items maximum
- **String Length**: 2,048 characters maximum

#### Forbidden Operations

- Prototype pollution attempts (`__proto__`, `constructor`, `prototype`)
- Non-plain objects (class instances, exotic objects)
- Unsafe metadata types (functions, symbols, BigInt)

### 4. Command Injection Protection

The `isSafeExecutablePath` function validates executable paths:

```typescript
import { isSafeExecutablePath } from '@cortex-os/rag';

// Safe patterns (allowlisted)
const safePaths = [
  '/usr/bin/python3',
  '/opt/homebrew/bin/python3',
  './venv/bin/python',
  'python3' // if in PATH
];

// Validates against injection patterns
const isValid = isSafeExecutablePath(userPath);
```

### 5. Embedding & Vector Security

#### Dimension Validation

```typescript
// Configurable allowed dimensions
const allowedDims = [384, 768, 1024, 1536, 3072];
validateEmbeddingDim(vector, allowedDims);
```

#### Content Size Limits

```typescript
const maxContentChars = 25000; // Configurable
validateContentSize(content, maxContentChars);
```

### 6. Rate Limiting

Token bucket rate limiting prevents abuse:

```typescript
import { TokenBucketRateLimiter } from '@cortex-os/rag';

const rateLimiter = new TokenBucketRateLimiter({
  tokensPerSecond: 10,
  bucketSize: 100,
});

if (!rateLimiter.tryConsume(1)) {
  throw new Error('Rate limit exceeded');
}
```

### 7. Reliability & Circuit Breaking

Circuit breakers prevent cascade failures:

- **Retry Logic**: Exponential backoff with jitter
- **Circuit Breakers**: Fail-fast when components are unhealthy
- **Timeouts**: Configurable timeouts per component
- **Graceful Degradation**: Safe fallbacks when services fail

## Threat Model

### Assets Protected

1. **User Data**: Text content, metadata, embeddings
2. **System Resources**: CPU, memory, storage, network
3. **Service Availability**: Uptime and responsiveness
4. **Data Integrity**: Accuracy and consistency of stored data

### Attack Vectors Mitigated

#### 1. Injection Attacks

- **XSS**: Content sanitization removes malicious scripts
- **Command Injection**: Path validation and input sanitization  
- **SQL Injection**: Parameterized queries (when applicable)
- **Template Injection**: Pattern detection and blocking

#### 2. Resource Exhaustion

- **Memory Bombing**: Size limits on all inputs
- **CPU Exhaustion**: Timeouts and rate limiting
- **Storage Flooding**: Content and metadata size limits

#### 3. Data Poisoning

- **Malicious Content**: Content security policy filtering
- **Prototype Pollution**: Deep object sanitization
- **Schema Injection**: Strict Zod validation

#### 4. Service Disruption

- **DDoS**: Rate limiting and circuit breakers
- **Cascade Failures**: Circuit breakers and timeouts
- **Resource Leaks**: Automatic cleanup and monitoring

### Security Assumptions

1. **Network Security**: TLS in transit, secure network boundaries
2. **Host Security**: Secure operating system and container runtime
3. **Authentication**: External authentication and authorization
4. **Monitoring**: Security event logging and alerting

## Security Configuration

### Production Security Settings

```typescript
const productionSecurity = {
  // Content security
  allowedEmbeddingDims: [384, 768, 1024, 1536, 3072],
  maxContentChars: 25000,
  
  // Content Security Policy
  contentSecurity: {
    xss: {
      enabled: true,
      stripScripts: true,
      stripStyles: true,
      stripEventHandlers: true,
    },
    content: {
      maxLength: 100000,
      blockSuspiciousPatterns: true,
      sanitizeUrls: true,
      allowDataUrls: false,
    },
    storage: {
      encryptSensitive: true,
      preventPrototypePollution: true,
      validateJsonStructure: true,
    },
  },
  
  // Rate limiting
  rateLimits: {
    embedder: { tokensPerSecond: 100, bucketSize: 500 },
    store: { tokensPerSecond: 200, bucketSize: 1000 },
    reranker: { tokensPerSecond: 50, bucketSize: 200 },
  },
  
  // Timeouts
  timeouts: {
    embedder: 300000,  // 5 minutes
    store: 60000,      // 1 minute  
    reranker: 180000,  // 3 minutes
    healthCheck: 30000, // 30 seconds
  },
};
```

### Development Security Settings

```typescript
const developmentSecurity = {
  // Relaxed for development
  allowedEmbeddingDims: [384, 768, 1024, 1536, 3072, 4096],
  maxContentChars: 100000,
  
  contentSecurity: {
    xss: { enabled: true, stripScripts: true },
    content: { maxLength: 200000, blockSuspiciousPatterns: true },
    storage: { preventPrototypePollution: true },
  },
  
  // Higher limits for development
  rateLimits: {
    embedder: { tokensPerSecond: 1000, bucketSize: 5000 },
    store: { tokensPerSecond: 2000, bucketSize: 10000 },
  },
};
```

## Security Testing

### Automated Security Tests

The security implementation includes comprehensive test coverage:

```bash
# Run security-specific tests
pnpm test --grep="security|validation|sanitization"

# Run security scans
pnpm security:scan

# Run with coverage
pnpm test:coverage
```

### Test Coverage Areas

1. **Input Validation**: Malformed inputs, oversized content, invalid types
2. **Content Security**: XSS payloads, injection attempts, prototype pollution
3. **MCP Tools**: Invalid parameters, security boundary violations
4. **Rate Limiting**: Burst handling, token refill, capacity limits
5. **Configuration**: Invalid configs, schema violations, edge cases

### Security Regression Tests

Key regression tests verify:

- XSS payloads are properly sanitized
- Prototype pollution attempts are blocked
- Command injection is prevented
- Size limits are enforced
- Rate limits function correctly

## Security Monitoring

### Metrics to Monitor

```typescript
// Security-related metrics
const securityMetrics = [
  'rag_content_security_violations_total',
  'rag_validation_errors_total', 
  'rag_rate_limit_hits_total',
  'rag_circuit_breaker_opens_total',
  'rag_timeout_errors_total',
];
```

### Alert Thresholds

- **High validation error rate**: > 5% of requests
- **Repeated security violations**: > 10/minute from same source
- **Rate limit hits**: > 100/minute
- **Circuit breaker opens**: Any occurrence
- **Content size violations**: > 1% of requests

### Security Events to Log

```typescript
// Log security events
logger.warn({
  event: 'security_violation',
  type: 'xss_attempt',
  source: clientId,
  content: sanitizedContent,
}, 'XSS attempt blocked');
```

## Compliance & Best Practices

### OWASP Alignment

The RAG package addresses OWASP Top 10 risks:

1. **A01 Broken Access Control**: Input validation and sanitization
2. **A02 Cryptographic Failures**: Secure content handling  
3. **A03 Injection**: Comprehensive injection prevention
4. **A04 Insecure Design**: Security-by-design architecture
5. **A05 Security Misconfiguration**: Secure defaults
6. **A06 Vulnerable Components**: Regular dependency scanning
7. **A07 Identity/Auth Failures**: External auth integration
8. **A08 Data Integrity Failures**: Content validation
9. **A09 Logging/Monitor Failures**: Comprehensive security logging
10. **A10 SSRF**: Request validation and sanitization

### Security Development Lifecycle

1. **Design Phase**: Threat modeling and security requirements
2. **Development**: Secure coding practices and input validation
3. **Testing**: Security test coverage and automated scanning
4. **Deployment**: Secure configuration and monitoring
5. **Maintenance**: Regular updates and vulnerability management

## Security Contacts

For security issues:

1. Review this security guide
2. Check existing test coverage
3. Run security scans: `pnpm security:scan`
4. Follow responsible disclosure practices

## Security Changelog

- **2025-09-20**: Initial comprehensive security implementation
- **2025-09-20**: Content Security Policy implementation
- **2025-09-20**: MCP tool input validation
- **2025-09-20**: Rate limiting and circuit breakers
- **2025-09-20**: Command injection protection
- **2025-09-20**: Security documentation and testing
