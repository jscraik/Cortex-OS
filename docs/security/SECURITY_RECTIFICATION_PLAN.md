# OWASP Top 10 Security Issues Found and Rectification Plan

## Summary

Semgrep scan identified 38 security issues in the codebase, categorized into two main types:

1. **Injection vulnerabilities (36 issues)**
2. **Server-Side Request Forgery (SSRF) vulnerabilities (2 issues)**

## Detailed Issues and Rectification Plan

### 1. Injection Vulnerabilities (36 issues)

#### Type A: Database Query Injection

**Files affected:**

- `apps/cortex-os/packages/agents/src/legacy-instructions/ConsensusEngine.ts` (line 580)
- `apps/cortex-os/packages/agents/src/legacy-instructions/DatabaseManager.ts` (multiple lines: 305, 318, 338, 368, 372, 392, 421, 425, 475, 483, 507, 585, 615, 626, 644, 667, 679, 704, 749, 769, 858)

**Issue:** Direct use of user-controlled input in database queries without proper parameterization or validation.

**Rectification:**

1. Ensure all database queries use parameterized statements
2. Validate and sanitize all input before using in queries
3. Implement input validation using Zod schemas where applicable
4. Add proper error handling for database operations

#### Type B: Command Injection

**Files affected:**

- `packages/mcp/src/python/src/executor.py` (line 60)
- `packages/mcp/src/tools/docker/mcp_server.py` (lines 46, 143)
- `packages/orchestration/src/mlx/thermal_guard.py` (lines 117, 618)
- `packages/orchestration/src/mlx/tiered_model_manager.py` (lines 295, 646)

**Issue:** Direct execution of user-controlled input as system commands.

**Rectification:**

1. Avoid using user input directly in system commands
2. Use whitelisting for allowed commands
3. Implement strict input validation and sanitization
4. Use subprocess with explicit command and arguments rather than shell execution
5. Add proper error handling and timeouts

#### Type C: Code Injection

**Files affected:**

- `packages/orchestration/src/mlx/batched_inference.py` (line 574)
- `packages/orchestration/src/bridges/agent.bridge.ts` (line 16)
- `apps/cortex-os/packages/mvp/src/mcp/adapter.ts` (line 135)
- `packages/mcp/src/mcp-server.js` (line 184)

**Issue:** Dynamic execution of code with user-controlled input.

**Rectification:**

1. Avoid dynamic code execution where possible
2. Implement strict input validation
3. Use sandboxing for code execution
4. Add proper error handling and resource limits

#### Type D: Cypher Injection (Neo4j)

**Files affected:**

- `packages/memories/src/adapters/neo4j.ts` (lines 34, 47, 61)

**Issue:** Direct use of user-controlled input in Cypher queries without proper parameterization.

**Rectification:**

1. Ensure all Cypher queries use parameterized statements
2. Validate and sanitize all input before using in queries
3. Implement input validation using Zod schemas where applicable
4. Add proper error handling for database operations

### 2. Server-Side Request Forgery (SSRF) Vulnerabilities (2 issues)

**Files affected:**

- Deprecated reference: `apps/cortex-cli/src/commands/mcp/doctor.ts` (cortex-cli removed; retained for audit history)

**Issue:** Direct use of user-controlled URLs in fetch requests without validation.

**Rectification:**

1. Implement URL validation and whitelisting
2. Use a secure HTTP client with proper configuration
3. Add request timeouts and limits
4. Implement proper error handling
5. Avoid following redirects automatically

## Implementation Steps

### Phase 1: Immediate Fixes (High Priority)

1. Deprecated: original target `apps/cortex-cli/src/commands/mcp/doctor.ts` — the cortex-cli package was removed. Security guidance remains for historical context.
2. Address critical injection vulnerabilities in database queries
3. Fix command injection issues in Python files

### Phase 2: Systematic Improvements (Medium Priority)

1. Implement comprehensive input validation using Zod schemas
2. Add proper error handling and logging
3. Implement resource limits and timeouts
4. Add security middleware where applicable

### Phase 3: Long-term Enhancements (Low Priority)

1. Implement comprehensive security testing
2. Add security scanning to CI/CD pipeline
3. Implement security monitoring and alerting
4. Conduct regular security audits

## Validation

After implementing the fixes, run the Semgrep scan again to verify that all issues have been resolved:

```bash
semgrep --config=.semgrep/owasp-top-10-improved.yaml --severity=ERROR .
```

All issues should be resolved before merging the changes.
