# Implementation Plan: CodeQL Security Fixes

**Date**: 2025-01-11  
**Task**: codeql-security-fixes  
**Scope**: Remediate 31 CodeQL security vulnerabilities

## Objectives

1. **Eliminate all critical security vulnerabilities** (P0: 11 alerts)
2. **Resolve high-priority warnings** (P1: 12 alerts)
3. **Address remaining medium-severity issues** (P2: 8 alerts)
4. **Maintain 90%+ test coverage** with security-focused tests
5. **Document all fixes** with CodeQL alert references

## Prioritization (MoSCoW)

### Must Have (P0 - Critical)
- **CORS Misconfiguration Fixes** (#213, #212)
- **Type Confusion Protection** (#210, #191-195 - 6 alerts)
- **Shell Injection Prevention** (#204-209 - 6 alerts)
- **Helmet CSP Configuration** (#202)
- **Sensitive Data Logging** (#189)

### Should Have (P1 - High Priority)
- **Password Hashing Upgrade** (#260)
- **ReDoS Protection** (#203, #254)
- **Loop Bound Validation** (#252)
- **CORS Permissive Config** (#200, #199)

### Could Have (P2 - Medium Priority)
- **Prototype Pollution** (#263)
- **Biased Crypto Random** (#264)
- **Incomplete Sanitization** (#174)
- **Shell Commands in Tests** (#261, #262, #253 - marked as test)
- **Identity Replacement** (#211)
- **Type Confusion in Tests** (#197)

### Won't Have (Out of Scope)
- Refactoring entire authentication system
- Implementing rate limiting
- Full penetration testing

## Task Breakdown

### Module 1: CORS Security Hardening (P0)
**Alerts**: #213, #212  
**Files**: 
- `apps/cortex-os/src/mcp/server.ts`
- `apps/cortex-os/src/http/runtime-server.ts`

**Tasks**:
1. Create CORS whitelist configuration
2. Implement origin validation function
3. Update MCP server CORS config
4. Update runtime server CORS config
5. Add environment variable for additional origins
6. Write tests for CORS validation

**Estimate**: 4 hours

---

### Module 2: Type Confusion Protection (P0)
**Alerts**: #210, #191-195 (6 alerts)  
**Files**: 
- `packages/memory-core/src/providers/LocalMemoryProvider.ts` (lines 1062, 1070, 1089, 1106, 1124, 1139)
- `packages/testing/src/integration/rest-api.test.ts` (line 321)

**Tasks**:
1. Create `@cortex-os/security` package with type validators
2. Implement `validateStringParam` utility
3. Implement `validateArrayParam` utility
4. Update LocalMemoryProvider to validate all query params
5. Add runtime type guards
6. Write comprehensive type confusion tests

**Estimate**: 6 hours

---

### Module 3: Shell Command Injection Prevention (P0)
**Alerts**: #204-209 (6 alerts)  
**Files**:
- `packages/agent-toolkit/src/infra/CodemodAdapters.ts` (line 26)
- `packages/agent-toolkit/src/infra/SearchAdapters.ts` (lines 51, 77, 103)
- `packages/agent-toolkit/src/infra/ValidationAdapters.ts` (lines 32, 61)

**Tasks**:
1. Install `shell-quote` dependency
2. Create safe shell execution wrapper
3. Refactor CodemodAdapters to use execFile
4. Refactor SearchAdapters to use execFile
5. Refactor ValidationAdapters to use execFile
6. Add shell injection prevention tests

**Estimate**: 8 hours

---

### Module 4: Helmet CSP & Secure Headers (P0)
**Alert**: #202  
**Files**:
- `apps/cortex-os/packages/local-memory/src/server.ts` (line 28)

**Tasks**:
1. Define CSP directives for application
2. Update Helmet configuration
3. Test CSP enforcement
4. Document CSP policy

**Estimate**: 2 hours

---

### Module 5: Sensitive Data Redaction (P0)
**Alert**: #189  
**Files**:
- `apps/cortex-os/packages/local-memory/src/cli/license-manager.ts` (line 232)

**Tasks**:
1. Create log sanitizer utility
2. Implement field redaction for sensitive data
3. Update license-manager logging
4. Add tests for log sanitization

**Estimate**: 3 hours

---

### Module 6: Password Hashing Upgrade (P1)
**Alert**: #260  
**Files**:
- `packages/mcp-server/src/security/http-auth.ts` (line 214)

**Tasks**:
1. Install bcrypt dependency
2. Create bcrypt-based hashing utilities
3. Migrate from MD5 to bcrypt
4. Update timing-safe comparison
5. Add migration strategy for existing hashes
6. Write security tests

**Estimate**: 5 hours

---

### Module 7: ReDoS Protection (P1)
**Alerts**: #203, #254  
**Files**:
- `apps/cortex-os/packages/local-memory/src/retrieval/index.ts` (lines 55-57)
- `packages/agents/src/prompt-registry.ts` (lines 6-9)

**Tasks**:
1. Add input length validation
2. Rewrite problematic regex patterns
3. Add timeout guards for regex matching
4. Write ReDoS attack tests

**Estimate**: 4 hours

---

### Module 8: CORS Permissive Configuration (P1)
**Alerts**: #200, #199  
**Files**:
- `packages/memory-rest-api/src/index.ts` (line 71)
- `apps/cortex-os/packages/local-memory/src/server.ts` (line 29)

**Tasks**:
1. Replace permissive CORS with whitelist
2. Align with Module 1 CORS config
3. Test restricted origins

**Estimate**: 2 hours

---

### Module 9: Loop Bound Validation (P1)
**Alert**: #252  
**Files**:
- `packages/memory-core/src/providers/LocalMemoryProvider.ts` (line 228)

**Tasks**:
1. Add array type validation before iteration
2. Implement max length bounds
3. Write DoS prevention tests

**Estimate**: 2 hours

---

### Module 10: Prototype Pollution Prevention (P2)
**Alert**: #263  
**Files**:
- `packages/workflow-orchestrator/src/cli/commands/profile.ts` (line 105)

**Tasks**:
1. Block `__proto__` and `constructor` keys
2. Add own-property checks
3. Write prototype pollution tests

**Estimate**: 3 hours

---

### Module 11: Remaining Issues (P2)
**Alerts**: #264, #174, #211, #261-262, #253, #197

**Tasks**:
1. Fix biased crypto random (#264)
2. Fix incomplete sanitization (#174)
3. Fix identity replacement (#211)
4. Mark test file alerts appropriately (#261, #262, #253, #197)

**Estimate**: 4 hours

---

## Timeline

### Week 1: Critical Fixes (P0)
- **Day 1-2**: Modules 1-2 (CORS + Type Confusion)
- **Day 3-4**: Module 3 (Shell Injection)
- **Day 5**: Modules 4-5 (Helmet + Logging)

### Week 2: High Priority + Polish (P1-P2)
- **Day 6-7**: Modules 6-7 (Password Hashing + ReDoS)
- **Day 8**: Modules 8-9 (CORS Permissive + Loop Bounds)
- **Day 9**: Modules 10-11 (Prototype Pollution + Remaining)
- **Day 10**: Integration testing, documentation, verification

**Total Estimate**: 43 hours (~2 weeks with testing/review)

## Dependencies

### External Packages
- `shell-quote@^1.8.1` - Shell argument escaping
- `bcrypt@^5.1.1` - Secure password hashing
- `@types/bcrypt@^5.0.2` (dev) - TypeScript types
- `@types/shell-quote@^1.7.5` (dev) - TypeScript types

### Internal Modules
- Create `@cortex-os/security` package for shared utilities
- Update `@cortex-os/utils` with validation helpers

### Configuration
- Environment variables for CORS whitelist
- CSP directives configuration
- Bcrypt salt rounds configuration

## Testing Strategy

### Unit Tests
- Type validation utilities (100% coverage)
- CORS origin validation
- Shell command escaping
- Password hashing functions
- Log sanitization

### Integration Tests
- End-to-end CORS request validation
- Type confusion attack prevention
- Shell injection attack prevention
- ReDoS attack prevention

### Security Tests
- Negative test cases for each vulnerability
- Fuzzing inputs for type confusion
- Malicious origin tests for CORS
- Command injection payloads

## Rollback Strategy

### If Critical Issues Arise
1. **Revert specific module** via git revert
2. **Feature flag sensitive changes** (CORS whitelist, bcrypt migration)
3. **Graceful degradation** for non-critical fixes
4. **Hotfix branch** for production issues

### Monitoring
- Watch for auth failures after bcrypt migration
- Monitor CORS-related request failures
- Alert on shell command execution errors

## Documentation

### Code Documentation
- TSDoc comments for all security utilities
- CodeQL alert numbers in commit messages
- Inline comments explaining security fixes

### ADRs (Architecture Decision Records)
- ADR-001: CORS Whitelist Strategy
- ADR-002: Shell Command Execution Policy
- ADR-003: Password Hashing Migration

### README Updates
- Security section in main README
- Security utilities in @cortex-os/security README
- Migration guide for password hashing

## Success Criteria

### Functional Requirements
- ✅ All 31 CodeQL alerts resolved
- ✅ Zero new security vulnerabilities introduced
- ✅ All existing tests pass
- ✅ New security tests achieve 100% coverage

### Non-Functional Requirements
- ✅ Performance impact <5ms per request
- ✅ No breaking API changes
- ✅ Backward compatible where possible
- ✅ Clear migration path for breaking changes

### Documentation Requirements
- ✅ All fixes documented in code
- ✅ ADRs published
- ✅ CHANGELOG updated
- ✅ Security best practices guide created

---

**Prepared by**: brAInwav Development Team  
**Reviewed by**: [Pending]  
**Approved by**: [Pending]

Co-authored-by: brAInwav Development Team <dev@brainwav.ai>
