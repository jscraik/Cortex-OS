# Major Dependency Upgrade Compatibility Assessment

## Executive Summary

This document evaluates the flagged major dependency upgrades for Cortex-OS and provides a phased approach for compatibility work. The upgrades are scheduled to begin once the live test suite achieves a green baseline.

**Current Test Suite Status**: 68 passed, 31 failed (requires stabilization before proceeding)

## Flagged Dependencies

| Dependency | Current Version | Target Version | Risk Level | Breaking Changes |
|------------|----------------|----------------|------------|------------------|
| prisma | 5.22.0 | 6.x | HIGH | Schema changes, API updates |
| uuid | 9.0.1 | 13.x | MEDIUM | ESM-only, Node.js requirements |
| zod | 3.25.76 | 4.x | HIGH | Major API restructuring |
| openai | 4.68.4 | TBD | MEDIUM | Version clarification needed |

## Detailed Impact Analysis

### 1. Prisma 6.x Upgrade (HIGH RISK)

**Current Usage Locations:**
- Root package.json: `prisma@5.22.0`
- packages/memories/package.json: `@prisma/client@5.18.0`

**Breaking Changes:**
- **Node.js Requirements**: Minimum 18.18.0+ (✅ Compatible - using Node 20+)
- **TypeScript Requirements**: Minimum 5.1.0 (✅ Likely compatible)
- **Schema Changes**: PostgreSQL implicit m-n relations change from UNIQUE INDEX to PRIMARY KEY
- **Buffer → Uint8Array**: Breaking change for Bytes fields
- **Error Handling**: `NotFoundError` removed, use `PrismaClientKnownRequestError` with code P2025
- **Reserved Keywords**: `async`, `await`, `using` no longer allowed as model names

**Migration Strategy:**
1. Create dedicated migration: `npx prisma migrate dev --name upgrade-to-v6`
2. Update all `Buffer` usage to `Uint8Array` in codebase
3. Replace `NotFoundError` catches with `PrismaClientKnownRequestError`
4. Verify no model names use reserved keywords

### 2. UUID 13.x Upgrade (MEDIUM RISK)

**Current Usage Locations:**
- Root package.json: `uuid@9.0.1`
- packages/a2a/package.json: `uuid@9.0.1`
- packages/asbr/package.json: `uuid@9.0.1`
- packages/orchestration/package.json: `uuid@9.0.1`

**Breaking Changes:**
- **ESM Only**: Dropped CommonJS support
- **Node.js Requirements**: Dropped Node 16 support (✅ Compatible - using Node 20+)
- **TypeScript**: Updated to TypeScript 5.2

**Migration Strategy:**
1. Ensure all imports use ESM syntax
2. Update import statements from `const { v4 } = require('uuid')` to `import { v4 } from 'uuid'`
3. Test in all affected packages

### 3. Zod 4.x Upgrade (HIGH RISK)

**Current Usage Locations:**
- Root package.json: `zod@3.25.76`
- Wide usage across validation schemas in multiple packages

**Breaking Changes:**
- **Error Customization**: `message` → `error` parameter
- **String Validation**: Methods moved to top-level (e.g., `z.email()` vs `z.string().email()`)
- **Default Behavior**: `.default()` now applies to output type, not input type
- **Object Defaults**: Defaults applied within optional fields
- **ZodError Format**: Significant API changes

**Migration Strategy:**
1. Update all `message` parameters to `error`
2. Replace `z.string().email()` with `z.email()` etc.
3. Review and update `.default()` usage
4. Update error handling code for new ZodError formats
5. Consider using community codemod `zod-v3-to-v4`

### 4. OpenAI SDK Version (MEDIUM RISK)

**Current Usage Locations:**
- packages/orchestration/package.json: `openai@^4.68.4`

**Clarification Needed:**
The target "openai@2" seems to indicate a downgrade from 4.x to 2.x, which would be highly unusual and breaking. This likely means:
- Option A: Upgrade to latest 4.x series
- Option B: Upgrade to 5.x series  
- Option C: Actual downgrade to 2.x (requires justification)

**Action Required**: Clarify intended target version before proceeding.

## Pre-Conditions for Upgrade Work

### Test Suite Green Baseline

Before any upgrade work begins, the following must be achieved:

1. **Current Status**: 68 passed / 31 failed tests
2. **Target**: All tests passing or known failures properly quarantined
3. **Monitoring**: Establish CI/CD baseline metrics

**Specific Issues to Resolve:**
- QualityGateEnforcer constructor issues
- Missing test-safe.sh script
- Quality gate contract validation failures

### Environment Readiness

- [x] Node.js 20+ (compatible with all target versions)
- [x] TypeScript setup
- [x] pnpm workspace configuration
- [x] Renovate dependency management
- [ ] Test suite stabilization

## Phased Upgrade Schedule

### Phase 0: Preparation (IMMEDIATE)
- [ ] Stabilize test suite to green baseline
- [ ] Create comprehensive test coverage report
- [ ] Document current API usage patterns
- [ ] Set up rollback procedures

### Phase 1: UUID 13.x (LOW COMPLEXITY)
- [ ] Update to ESM imports across all packages
- [ ] Test UUID functionality in all affected packages
- [ ] Validate no breaking changes in UUID generation

### Phase 2: Prisma 6.x (HIGH COMPLEXITY)
- [ ] Create backup of current database schema
- [ ] Run upgrade migration in development environment
- [ ] Update Buffer to Uint8Array in codebase
- [ ] Update error handling patterns
- [ ] Validate schema changes don't break existing data

### Phase 3: Zod 4.x (HIGH COMPLEXITY)
- [ ] Audit all validation schemas
- [ ] Update error customization APIs
- [ ] Migrate string validation methods
- [ ] Review .default() behavior changes
- [ ] Update error handling code

### Phase 4: OpenAI SDK (PENDING CLARIFICATION)
- [ ] Clarify target version (2.x vs 4.x vs 5.x)
- [ ] Assess breaking changes based on target
- [ ] Update API usage patterns
- [ ] Test model integration functionality

## Risk Mitigation

### Rollback Procedures
1. **Database**: Prisma migration rollback scripts
2. **Dependencies**: Version pinning in package.json
3. **Feature Flags**: Gradual rollout capability
4. **Monitoring**: Enhanced error tracking during upgrade period

### Testing Strategy
1. **Unit Tests**: Comprehensive coverage before/after each phase
2. **Integration Tests**: End-to-end validation
3. **Performance Tests**: Ensure no regression
4. **Manual Testing**: Critical user journeys

### Communication Plan
1. **Stakeholder Notification**: Before each phase begins
2. **Progress Updates**: Weekly status reports
3. **Issue Escalation**: Clear communication channels
4. **Documentation**: Updated guides and troubleshooting

## Success Criteria

Each upgrade phase is considered successful when:
- [ ] All tests pass
- [ ] No functional regressions identified
- [ ] Performance benchmarks maintained
- [ ] Documentation updated
- [ ] Team training completed (if needed)

## Timeline Estimates

- **Phase 0 (Preparation)**: 1-2 weeks
- **Phase 1 (UUID)**: 3-5 days
- **Phase 2 (Prisma)**: 1-2 weeks
- **Phase 3 (Zod)**: 2-3 weeks
- **Phase 4 (OpenAI)**: 1 week (pending clarification)

**Total Estimated Duration**: 6-8 weeks (after test suite stabilization)

## Next Actions

1. **IMMEDIATE**: Focus on test suite stabilization
2. **PENDING**: Clarify OpenAI target version
3. **PREPARE**: Create detailed migration scripts for each dependency
4. **SCHEDULE**: Begin Phase 1 once green baseline is achieved

---

*Document created: October 5, 2025*  
*Status: Awaiting test suite green baseline*  
*Next Review: Upon test suite stabilization*
