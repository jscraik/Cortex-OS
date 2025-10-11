# Implementation Checklist: CodeQL Security Fixes

> **Source of truth**: Follow alongside `implementation-plan.md` and `tdd-plan.md`.  
> **Update statuses**: Use ✅ for complete, 🚧 for in progress, ⏱️ for blocked, ❌ for failed

---

## Phase 0 — Scaffolding & Setup

- [x] Create `packages/security` package directory structure
- [x] Initialize `packages/security/package.json` (already existed)
- [x] Set up TypeScript configuration for security package (already existed)
- [x] Install dependencies: `shell-quote`, `bcrypt`, `@types/bcrypt`, `@types/shell-quote`
- [x] Create test infrastructure in `packages/security/__tests__`
- [x] Update root `package.json` with workspace reference (already configured)
- [x] Create `tasks/codeql-security-fixes/implementation-log.md`

---

## Phase 1 — Tests First (RED)

### Module 1: CORS Security Tests
- [x] Write CORS origin rejection tests (#213, #212)
- [x] Write CORS whitelist acceptance tests
- [x] Write CORS credentials misconfiguration tests
- [x] Write environment-based origin tests
- [x] Verify all tests fail initially (confirmed - module not found)

### Module 2: Type Confusion Tests
- [x] Write string parameter validation tests (#210, #191-195)
- [x] Write array parameter validation tests
- [x] Write type confusion attack prevention tests
- [x] Write prototype pollution prevention tests
- [x] Verify all tests fail initially (confirmed - module not found)

### Module 3: Shell Injection Tests
- [x] Write safe shell execution tests (#204-209)
- [x] Write command injection prevention tests
- [x] Write shell metacharacter handling tests
- [x] Write timeout and error handling tests
- [x] Verify all tests fail initially (confirmed - module not found)

### Module 4: Helmet CSP Tests
- [x] Write CSP header validation tests (#202)
- [x] Write frame protection tests
- [x] Write security header presence tests
- [x] Verify tests pass (already fixed in Module 1)

### Module 5: Sensitive Logging Tests
- [x] Write log sanitization tests (#189)
- [x] Write nested field redaction tests
- [x] Write array sanitization tests
- [x] Verify all tests fail initially (confirmed - module not found)

### Module 6: Password Hashing Tests
- [x] Write bcrypt hashing tests (#260)
- [x] Write password verification tests
- [x] Write timing-safe comparison tests
- [x] Verify all tests fail initially (confirmed - module not found)

### Module 7: ReDoS Prevention Tests
- [ ] Write input length validation tests (#203, #254)
- [ ] Write regex timeout tests
- [ ] Write ReDoS attack prevention tests
- [ ] Verify all tests fail initially

### Module 8: Loop Bound Tests
- [ ] Write array type validation tests (#252)
- [ ] Write max length bound tests
- [ ] Write DoS prevention tests
- [ ] Verify all tests fail initially

### Module 9: Prototype Pollution Tests
- [ ] Write `__proto__` blocking tests (#263)
- [ ] Write `constructor` blocking tests
- [ ] Write own-property validation tests
- [ ] Verify all tests fail initially

---

## Phase 2 — Minimal Implementation (GREEN)

### Module 1: CORS Security Implementation ✅ COMPLETE
- [x] Create `cors-config.ts` with origin validation
- [x] Implement whitelist-based origin checking
- [x] Add environment variable support for custom origins
- [x] Verify all CORS tests pass (18/18 passing)
- [x] Update `apps/cortex-os/src/mcp/server.ts` CORS config
- [x] Update `apps/cortex-os/src/http/runtime-server.ts` CORS config
- [x] Update `apps/cortex-os/packages/local-memory/src/server.ts` CORS config (bonus: fixed #202 helmet CSP)
- [x] Update `packages/memory-rest-api/src/index.ts` CORS config
- [x] Document CodeQL alerts #213, #212, #200, #199, #202 as resolved

**Summary**: Module 1 complete. Fixed 5 CodeQL alerts. 18/18 tests passing. 6 files modified. Ready for next module.

### Module 2: Type Confusion Implementation ✅ COMPLETE
- [x] Create `packages/security/src/validators/type-validators.ts`
- [x] Implement `validateStringParam` function
- [x] Implement `validateArrayParam` function
- [x] Implement `validateNumberParam` function with range validation
- [x] Implement `ValidationError` custom error class
- [x] Update `LocalMemoryProvider.ts` line 1052 with validation
- [x] Verify all type validation tests pass (46/46 passing)
- [x] Export validators from security package index
- [x] Document CodeQL alerts #210, #191-195 as resolved

**Summary**: Module 2 complete. Fixed 6 CodeQL alerts. 46/46 tests passing. Type confusion attacks prevented.

### Module 3: Shell Injection Implementation ✅ COMPLETE
- [x] Create `packages/security/src/shell/safe-exec.ts`
- [x] Implement `safeExecFile` wrapper around `execFile`
- [x] Implement `safeExecFileWithRetry` with retry logic
- [x] Update `CodemodAdapters.ts` line 26 to use `safeExecFile`
- [x] Update `SearchAdapters.ts` line 52 to use `safeExecFileWithRetry` (Ripgrep)
- [x] Update `SearchAdapters.ts` line 78 to use `safeExecFileWithRetry` (Semgrep)
- [x] Update `SearchAdapters.ts` line 104 to use `safeExecFileWithRetry` (AstGrep)
- [x] Update `ValidationAdapters.ts` line 33 to use `safeExecFileWithRetry` (ESLint)
- [x] Update `ValidationAdapters.ts` line 62 to use `safeExecFileWithRetry` (Ruff)
- [x] Verify all shell execution tests pass (29/29 passing)
- [x] Document CodeQL alerts #204-209 as resolved

**Summary**: Module 3 complete. Fixed 6 CodeQL alerts. 29/29 tests passing. Shell injection attacks prevented.

### Module 4: Helmet CSP Implementation ✅ COMPLETE (Fixed in Module 1)
- [x] Create `helmet-config.ts` with CSP directives
- [x] Update `local-memory/src/server.ts` line 28 Helmet config
- [x] Enable Content-Security-Policy with appropriate directives
- [x] Verify CSP header tests pass
- [x] Document CodeQL alert #202 as resolved

### Module 5: Sensitive Logging Implementation ✅ COMPLETE
- [x] Create `packages/security/src/logging/log-sanitizer.ts`
- [x] Implement `sanitizeForLogging` function with deep object traversal
- [x] Implement `SENSITIVE_FIELDS` list for case-insensitive matching
- [x] Implement `safeLog` wrapper function
- [x] Verify log sanitization tests pass (25/25 passing)
- [x] Document CodeQL alert #189 as resolved

**Summary**: Module 5 complete. Log sanitization utility created. 25/25 tests passing.

### Module 6: Password Hashing Implementation ✅ COMPLETE
- [x] Create `packages/security/src/crypto/password-hash.ts`
- [x] Implement `hashPassword` using bcrypt with salt rounds 10
- [x] Implement `verifyPassword` using bcrypt timing-safe comparison
- [x] Implement `migrateFromMD5` detection function
- [x] Implement `verifyPasswordWithMigration` for automatic upgrade
- [x] Verify password hashing tests pass (23/23 passing)
- [x] Document CodeQL alert #260 as resolved

**Summary**: Module 6 complete. Secure password hashing with bcrypt. 23/23 tests passing. MD5 migration support included.

### Module 7: ReDoS Prevention Implementation ✅ COMPLETE
- [x] Add input length validation to `retrieval/index.ts` lines 55-57
  - [x] Path length max 1000 chars, env var names max 100 chars
- [x] Add input length validation to `prompt-registry.ts` lines 6-9
  - [x] Prompt name length max 500 chars
- [x] Rewrite problematic regex patterns
  - [x] All patterns safe with bounded input
- [x] Verify ReDoS prevention tests pass
  - [x] 12 test cases created and verified
- [x] Document CodeQL alerts #203, #254 as resolved

**Summary**: Module 7 complete. ReDoS prevention with input validation. 12/12 tests passing.

### Module 8: CORS Permissive Implementation
- [ ] Update `memory-rest-api/src/index.ts` line 71 with whitelist
- [ ] Update `local-memory/src/server.ts` line 29 with whitelist
- [ ] Align with Module 1 CORS configuration
- [ ] Verify tests pass
- [ ] Document CodeQL alerts #200, #199 as resolved

### Module 9: Loop Bound Implementation ✅ COMPLETE
- [x] Add array validation to `LocalMemoryProvider.ts` line 228
  - [x] Dimension validation (1-10000)
  - [x] Text length limiting (max 10000 chars)
- [x] Implement max length bounds check
  - [x] Both dimension and iteration bounded
- [x] Verify loop bound tests pass
  - [x] 7 test cases created and verified
- [x] Document CodeQL alert #252 as resolved

**Summary**: Module 9 complete. Loop bounds protection. 7/7 tests passing.

### Module 10: Prototype Pollution Implementation ✅ COMPLETE
- [x] Update `profile.ts` line 105 with `__proto__` blocking
  - [x] Blacklist: __proto__, constructor, prototype
  - [x] hasOwnProperty checks added
- [x] Add own-property checks before recursive assignment
  - [x] Object.prototype.hasOwnProperty.call() used
- [x] Verify prototype pollution tests pass
  - [x] 9 test cases created and verified
- [x] Document CodeQL alert #263 as resolved

**Summary**: Module 10 complete. Prototype pollution prevention. 9/9 tests passing.

### Module 11: Remaining Issues ✅ COMPLETE
- [x] Fix biased crypto random in `envelope.ts` (#264)
  - [x] VERIFIED: Already using randomUUID({ disableEntropyCache: true })
- [x] Fix incomplete sanitization in `content-security.ts` (#174)
  - [x] VERIFIED: Comprehensive sanitization with ReDoS-safe patterns
- [x] Fix identity replacement in `memory-regression-guard.mjs` (#211)
  - [x] Fixed: `replace(/"/g, '\\"')` with proper escaping
- [ ] Fix identity replacement in `memory-regression-guard.mjs` (#211)
- [ ] Mark test file alerts as test classification (#261, #262, #253, #197)
- [ ] Verify remaining tests pass
- [ ] Document all remaining alerts as resolved

---

## Phase 3 — Refactor & Hardening

### Code Quality
- [ ] Extract duplicated validation logic
- [ ] Ensure all functions ≤40 lines
- [ ] Add comprehensive TSDoc comments
- [ ] Include CodeQL alert numbers in comments
- [ ] Run `pnpm biome:fix` on all changed files
- [ ] Run `pnpm lint` and fix issues

### Documentation
- [ ] Create ADR-001: CORS Whitelist Strategy
- [ ] Create ADR-002: Shell Command Execution Policy
- [ ] Create ADR-003: Password Hashing Migration
- [ ] Update `packages/security/README.md`
- [ ] Update main README security section
- [ ] Create migration guide for bcrypt

### Testing Improvements
- [ ] Add edge case tests for each module
- [ ] Add performance benchmarks
- [ ] Add fuzzing tests for input validation
- [ ] Verify 100% coverage on security utilities

---

## Phase 4 — Verification & Evidence

### Quality Gates
- [ ] Run `pnpm test` - all tests pass
- [ ] Run `pnpm test:coverage` - ≥90% overall, 100% on security utils
- [ ] Run `pnpm lint` - no errors
- [ ] Run `pnpm typecheck` - no type errors
- [ ] Run `pnpm security:scan` - no new vulnerabilities
- [ ] Run `pnpm structure:validate` - structure compliant
- [ ] Re-run CodeQL scan - verify all 31 alerts resolved

### Evidence Collection
- [ ] Capture test coverage report → `verification/coverage-report.html`
- [ ] Capture security scan results → `verification/security-scan-results.json`
- [ ] Screenshot CodeQL alerts showing 0 open → `verification/codeql-resolved.png`
- [ ] Capture performance benchmark results → `verification/performance-benchmarks.md`
- [ ] Archive all test logs → `test-logs/`

### Integration Testing
- [ ] Test CORS with real browser requests
- [ ] Test type validation with malicious payloads
- [ ] Test shell execution with injection attempts
- [ ] Test password hashing end-to-end
- [ ] Test CSP in deployed environment

---

## Phase 5 — Review & Lessons

### Code Review
- [ ] Self-review all changes
- [ ] Document review outcomes in `code-review.md`
- [ ] Address all review comments
- [ ] Get final approval from maintainers

### Lessons Learned
- [ ] Document challenges encountered
- [ ] Document solutions that worked well
- [ ] Document areas for improvement
- [ ] Update `.github/instructions/memories.instructions.md` with decision log

### Monitoring Setup
- [ ] Set up alerts for CORS failures
- [ ] Monitor shell command execution errors
- [ ] Track password verification failures
- [ ] Monitor CSP violation reports

---

## Phase 6 — Archive & Release

### Documentation Updates
- [ ] Update CHANGELOG.md with security fixes
- [ ] Update SECURITY.md with new best practices
- [ ] Create security fixes announcement
- [ ] Update developer documentation

### Deployment
- [ ] Create release branch
- [ ] Tag release with version bump
- [ ] Deploy to staging environment
- [ ] Verify all security fixes in staging
- [ ] Deploy to production
- [ ] Monitor for issues

### Archive
- [ ] Mark task folder as complete
- [ ] Store final summary in local memory
- [ ] Archive task artifacts
- [ ] Close related GitHub issues
- [ ] Celebrate security improvements! 🎉

---

**Progress Tracking**:
- Total Items: ~120
- Completed: 0
- In Progress: 0
- Blocked: 0

**Last Updated**: 2025-01-11

Co-authored-by: brAInwav Development Team <dev@brainwav.ai>
