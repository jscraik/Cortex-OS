# Security Vulnerabilities Fix - Research Phase

**Created**: 2025-01-14
**brAInwav Task ID**: security-vulnerabilities-fix-2025-01

## Executive Summary

Comprehensive resolution of security vulnerabilities identified through GitHub Code Scanning (CodeQL) and Dependabot alerts. Focus on ReDoS (Regular Expression Denial of Service) vulnerabilities, incomplete sanitization issues, and dependency updates.

## Discovered Issues

### Critical Code Scanning Alerts (23 total)

#### High Severity (18 alerts)

1. **Polynomial ReDoS (6 alerts)**
   - `packages/rag/src/ref-rag/query-guard.ts:785` - Injection pattern regex
   - `packages/rag/src/ref-rag/fact-extractor.ts:451,564,593` - Code/date validation regex
   - `packages/tdd-coach/src/` - Test file pattern matching

2. **Bad HTML Filtering (1 alert)**
   - `packages/rag/src/ref-rag/query-guard.ts:771` - Script tag regex missing edge cases

3. **Incomplete Multi-character Sanitization (2 alerts)**
   - `packages/rag/src/lib/content-security.ts:212-213` - Event handler removal

4. **Incomplete Sanitization (3 alerts)**
   - `packages/mcp-auth/src/http/wwwAuthenticate.ts:11` - Missing backslash escaping
   - Generated playwright files (can ignore - test artifacts)

5. **Insufficient Password Hash (1 alert)**
   - `packages/mcp-server/src/security/http-auth.ts:359` - Using SHA for password hashing

#### Medium Severity (4 alerts)

1. **Stack Trace Exposure (1 alert)**
   - `apps/cortex-os/tests/vibe-check-client.test.ts:118` - Test file exposure

2. **Untrusted Source Script (1 alert)**
   - `apps/chatgpt-dashboard/src/index.html:12` - Missing SRI check

3. **Shell Command Injection (2 alerts)**
   - Test files only (acceptable in test context)

#### Critical Severity (1 alert)

1. **Type Confusion (1 alert)**
   - `packages/testing/src/integration/rest-api.test.ts:321` - Test file only

### Dependabot Alerts (6 total)

1. **validator.js** (Medium) - URL validation bypass
2. **axios** (High) - DoS via lack of data size check  
3. **fast-redact** (Low) - Prototype pollution
4. **got** (Medium) - UNIX socket redirect
5. **webpack-dev-server** (2 Medium) - Source code theft vulnerabilities

## RAID Analysis

### Risks
- ReDoS attacks could cause denial of service via crafted input strings
- SQL/XSS injection through incomplete sanitization
- Dependency vulnerabilities could be exploited
- Password hashing using SHA instead of bcrypt/scrypt

### Assumptions
- Most test-related alerts can be marked as false positives
- Playwright-generated files are build artifacts (can be gitignored)
- Production code vulnerabilities require immediate fixes

### Issues
- Multiple regex patterns vulnerable to catastrophic backtracking
- Event handler sanitization allows reintroduction of 'on' prefix
- Missing backslash escaping in auth headers

### Dependencies
- Must maintain backward compatibility with existing APIs
- Changes must not break existing tests
- Dependency updates require full regression testing

## Proposed Solutions

### 1. Fix ReDoS Vulnerabilities
- Replace complex regexes with simpler alternatives
- Add input length validation before regex testing
- Use atomic groups or possessive quantifiers where possible

### 2. Improve Sanitization
- Apply replacements repeatedly until stable
- Escape backslashes properly
- Use well-tested sanitization libraries

### 3. Update Dependencies
- Update axios to latest version
- Update validator.js  
- Update got package
- Update webpack-dev-server (dev dependency)
- Evaluate fast-redact update

### 4. Fix Password Hashing
- Replace SHA with bcrypt for password hashing
- Add proper salt generation

## brAInwav Compliance

- ✅ All error messages will include brAInwav branding
- ✅ Security fixes follow WCAG 2.2 AA accessibility standards
- ✅ Changes will not introduce Math.random() or mock implementations
- ✅ Named exports only, functions ≤40 lines

## Next Steps

1. Create implementation plan with TDD approach
2. Implement fixes for critical security issues first
3. Update dependencies with version constraints
4. Run full security scan verification
5. Document all changes in CHANGELOG.md
