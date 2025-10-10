# Research: CodeQL Security Fixes

**Date**: 2025-01-11  
**Feature**: Systematic remediation of 31 CodeQL security alerts  
**Priority**: P0 (Critical Security Issues)

## Problem Statement

GitHub CodeQL scanning has identified 31 open security vulnerabilities across the Cortex-OS codebase:
- **11 Critical/High Severity (Errors)**: CORS misconfig, type confusion, shell injection, insecure configs
- **20 Medium/High Severity (Warnings)**: Crypto issues, ReDoS, prototype pollution, sanitization gaps

These vulnerabilities expose the system to credential theft, command injection, DoS attacks, and data leakage.

## RAID Analysis

### Risks
- **R1**: CORS misconfiguration (#213, #212) could leak credentials to attacker origins
- **R2**: Type confusion attacks (#210, #191-195) could bypass input sanitization
- **R3**: Shell command injection (#204-209) could allow arbitrary code execution
- **R4**: Insecure helmet config (#202) exposes to XSS/clickjacking
- **R5**: Clear-text logging (#189) could expose 1Password secrets in logs
- **R6**: Weak password hashing (#260) using MD5 instead of bcrypt
- **R7**: ReDoS vulnerabilities (#203, #254) could cause denial of service
- **R8**: Prototype pollution (#263) could manipulate object prototypes

### Assumptions
- **A1**: All alerts are valid and reproducible (not false positives)
- **A2**: Test files with shell injection are acceptable (marked as test classification)
- **A3**: Existing test coverage will catch regressions from fixes
- **A4**: CORS whitelist can be defined for known legitimate origins
- **A5**: API keys currently use weak hashing for timing-safe comparison

### Issues
- **I1**: Some alerts are in test files but not classified correctly
- **I2**: CORS configuration is dynamically reading from request headers
- **I3**: Agent-toolkit shell commands accept user input without escaping
- **I4**: No input type validation before processing HTTP parameters

### Dependencies
- **D1**: Need to identify legitimate CORS origins for whitelist
- **D2**: Shell command fixes require `shell-quote` npm package
- **D3**: Password hashing migration requires bcrypt library
- **D4**: Type validation needs runtime type guards
- **D5**: Helmet CSP configuration needs application-specific directives

## Existing Patterns Analysis

### Security Patterns Already in Use
1. **Timing-safe comparison** (`packages/mcp-server/src/security/http-auth.ts` line 214)
   - Currently uses MD5 hashing, needs upgrade to bcrypt
2. **API key extraction** (extractApiKeyFromRequest helper)
   - Good separation of concerns, needs type validation
3. **CORS configuration** (apps using cors middleware)
   - Currently too permissive, needs whitelist approach

### Similar Fixes in Codebase
- Search for existing bcrypt usage: None found
- Search for shell-quote usage: None found
- CORS whitelist pattern: Not implemented

## Proposed Solution

### Phase 1: Critical CORS & Type Confusion (P0)
**Alerts**: #213, #212, #210, #191-195

**CORS Fix Pattern**:
```typescript
const ALLOWED_ORIGINS = [
  'http://localhost:3024',
  'http://localhost:3028',
  process.env.ALLOWED_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true
}));
```

**Type Validation Pattern**:
```typescript
function validateStringParam(param: unknown, name: string): string {
  if (typeof param !== 'string') {
    throw new TypeError(`[brAInwav] Parameter ${name} must be a string, got ${typeof param}`);
  }
  return param;
}

// Usage in LocalMemoryProvider
const content = validateStringParam(req.query.content, 'content');
```

### Phase 2: Shell Command Injection (P0)
**Alerts**: #204-209

**Fix using shell-quote**:
```typescript
import { quote } from 'shell-quote';
import { execFile } from 'child_process';

// BEFORE (vulnerable)
exec(`rg ${pattern} ${path}`);

// AFTER (safe)
const args = [pattern, path];
execFile('rg', args, callback); // No shell interpretation
```

### Phase 3: Helmet & CSP Configuration (P0)
**Alert**: #202

**Fix**:
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // If needed
      imgSrc: ["'self'", "data:", "https:"],
    }
  }
}));
```

### Phase 4: Sensitive Data Logging (P0)
**Alert**: #189

**Fix**: Redact sensitive fields before logging
```typescript
const sanitizedVault = {
  ...vault,
  apiKey: '[REDACTED]',
  secrets: '[REDACTED]'
};
logger.info(`[brAInwav] Vault loaded`, { vault: sanitizedVault });
```

### Phase 5: Password Hashing Upgrade (P1)
**Alert**: #260

**Fix using bcrypt**:
```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

async function hashApiKey(apiKey: string): Promise<string> {
  return bcrypt.hash(apiKey, SALT_ROUNDS);
}

async function compareApiKey(provided: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(provided, hashed);
}
```

### Phase 6: ReDoS & Regex Hardening (P1)
**Alerts**: #203, #254

**Fix**: Add input length validation
```typescript
function validateInput(input: string, maxLength: number = 1000): string {
  if (input.length > maxLength) {
    throw new Error(`[brAInwav] Input too long (max ${maxLength} chars)`);
  }
  return input;
}
```

### Phase 7: Prototype Pollution & Other (P2)
**Alerts**: #263, #252, #174, #264

**Prototype Pollution Fix**:
```typescript
function merge(dst: any, src: any) {
  for (const key in src) {
    if (!src.hasOwnProperty(key)) continue;
    if (key === '__proto__' || key === 'constructor') continue; // Block prototype pollution
    
    if (dst.hasOwnProperty(key) && isObject(dst[key])) {
      merge(dst[key], src[key]);
    } else {
      dst[key] = src[key];
    }
  }
}
```

## Quality Gates & Success Criteria

### Quality Gates
1. **All Critical (P0) alerts resolved**: #213, #212, #210, #191-195, #204-209, #202, #189
2. **Test coverage maintained**: ≥90% overall, 100% on new security validation functions
3. **Security scan clean**: `pnpm security:scan` passes
4. **No regressions**: All existing tests pass
5. **Performance**: No measurable performance degradation (<5ms overhead per request)

### Success Metrics
- **Alert Reduction**: 31 → 0 open CodeQL alerts
- **Test Coverage**: New security validation utilities have 100% coverage
- **Documentation**: All fixes documented in code comments and ADRs
- **Auditability**: Each fix linked to specific CodeQL alert number in commit message

## Non-Goals
- Fixing alerts in vendored/third-party code
- Completely rewriting existing auth system
- Implementing advanced rate limiting (separate task)
- Full security audit beyond CodeQL findings

## Technology Choices

### New Dependencies
1. **shell-quote** (v1.8.1): Escapes shell arguments safely
2. **bcrypt** (v5.1.1): Industry-standard password hashing
3. **@types/bcrypt** (dev): TypeScript types

### Architectural Decisions
1. **Whitelist CORS origins** instead of dynamic reflection
2. **Type validation middleware** for all HTTP parameter handlers
3. **execFile over exec** for all shell operations
4. **Centralized input sanitization** utilities in `@cortex-os/security`

## References

### CodeQL Documentation
- [CORS Misconfiguration](https://codeql.github.com/codeql-query-help/javascript/js-cors-misconfiguration-for-credentials/)
- [Type Confusion](https://codeql.github.com/codeql-query-help/javascript/js-type-confusion-through-parameter-tampering/)
- [Shell Command Injection](https://codeql.github.com/codeql-query-help/javascript/js-shell-command-constructed-from-input/)

### OWASP Guidelines
- [A1:2021 – Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- [A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/)

### Internal Standards
- [/.cortex/rules/RULES_OF_AI.md](/.cortex/rules/RULES_OF_AI.md) - Production standards
- [/.cortex/rules/vision.md](/.cortex/rules/vision.md) - Security by default
- [CODESTYLE.md](/CODESTYLE.md) - Coding conventions

## Next Steps

1. Review research with stakeholders
2. Confirm CORS whitelist origins
3. Create TDD plan with test-first approach
4. Implement fixes in priority order (P0 → P1 → P2)
5. Document each fix with CodeQL alert reference
