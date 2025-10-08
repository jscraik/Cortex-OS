# Research Document: [FEATURE_NAME]

**Task ID**: `[task-id-slug]`  
**Created**: [YYYY-MM-DD]  
**Researcher**: [Name or "AI Agent"]  
**Status**: [In Progress / Complete / Needs Review]

---

## Objective

[1-2 sentences describing what you're researching and why]

Example: "Research modern authentication patterns for MCP REST endpoints to ensure OAuth 2.1 PKCE compliance while maintaining brAInwav local-first principles."

---

## Current State Observations

### Existing Implementation
- **Location**: [Path to relevant code]
- **Current Approach**: [How it works now]
- **Limitations**: [What doesn't work or needs improvement]

### Related Components
- **Component 1**: [Path and brief description]
- **Component 2**: [Path and brief description]

### brAInwav-Specific Context
- **MCP Integration**: [How this relates to existing MCP tools/contracts]
- **A2A Events**: [Relevant event flows or communication patterns]
- **Local Memory**: [How local memory is involved, if applicable]
- **Existing Patterns**: [Similar implementations in the codebase]

---

## External Standards & References

### Industry Standards
1. **[Standard Name]** ([Link or reference])
   - **Relevance**: [Why this matters for our use case]
   - **Key Requirements**: [Bullet points of relevant specs]

2. **[Another Standard]**
   - **Relevance**: [Why this matters]
   - **Key Requirements**: [Important points]

### Best Practices (2025)
- **[Practice Area]**: [Current recommended approach with references]
  - Source: [Link to authoritative source]
  - Application: [How this applies to brAInwav Cortex-OS]

### Relevant Libraries/Frameworks
| Library | Version | Purpose | License | Recommendation |
|---------|---------|---------|---------|----------------|
| [name] | [version] | [use case] | [license] | ✅ Use / ⚠️ Evaluate / ❌ Avoid |

---

## Technology Research

### Option 1: [Approach Name]

**Description**: [How this approach works]

**Pros**:
- ✅ [Advantage 1]
- ✅ [Advantage 2]
- ✅ [Advantage 3]

**Cons**:
- ❌ [Disadvantage 1]
- ❌ [Disadvantage 2]

**brAInwav Compatibility**:
- [How well this aligns with brAInwav Constitution]
- [Impact on MCP/A2A architecture]
- [Security and privacy considerations]

**Implementation Effort**: [Low / Medium / High]

---

### Option 2: [Alternative Approach]

**Description**: [How this approach works]

**Pros**:
- ✅ [Advantage 1]
- ✅ [Advantage 2]

**Cons**:
- ❌ [Disadvantage 1]
- ❌ [Disadvantage 2]

**brAInwav Compatibility**:
- [Alignment assessment]

**Implementation Effort**: [Low / Medium / High]

---

### Option 3: [Third Approach, if applicable]

[Same structure as above]

---

## Comparative Analysis

| Criteria | Option 1 | Option 2 | Option 3 |
|----------|----------|----------|----------|
| **Performance** | [Rating/notes] | [Rating/notes] | [Rating/notes] |
| **Security** | [Rating/notes] | [Rating/notes] | [Rating/notes] |
| **Maintainability** | [Rating/notes] | [Rating/notes] | [Rating/notes] |
| **brAInwav Fit** | [Rating/notes] | [Rating/notes] | [Rating/notes] |
| **Community Support** | [Rating/notes] | [Rating/notes] | [Rating/notes] |
| **License Compatibility** | [Rating/notes] | [Rating/notes] | [Rating/notes] |

---

## Recommended Approach

**Selected**: Option [X] - [Approach Name]

**Rationale**:
[2-3 paragraphs explaining why this option is recommended, addressing:
- How it meets brAInwav Constitution requirements
- Technical advantages over alternatives
- Risk mitigation
- Alignment with existing architecture]

**Trade-offs Accepted**:
- [What we're giving up by choosing this approach]
- [Why the trade-offs are acceptable]

---

## Constraints & Considerations

### brAInwav-Specific Constraints
- ✅ **Local-First**: [How this maintains local-only operation]
- ✅ **Zero Exfiltration**: [Data privacy guarantees]
- ✅ **Named Exports**: [Code structure compliance]
- ✅ **Function Size**: [≤40 lines per function adherence]
- ✅ **Branding**: [Where brAInwav branding appears]

### Technical Constraints
- [Nx monorepo compatibility]
- [Existing dependency limitations]
- [Performance requirements]
- [Platform support (macOS, Linux, Windows)]

### Security Constraints
- [Authentication/authorization requirements]
- [Data encryption needs]
- [Audit logging requirements]
- [Compliance standards (GDPR, etc.)]

### Integration Constraints
- [MCP contract compatibility]
- [A2A event schema requirements]
- [Database/persistence considerations]
- [Backward compatibility needs]

---

## Open Questions

1. **[Question 1]**
   - **Context**: [Why this is uncertain]
   - **Impact**: [What's blocked by this question]
   - **Research Needed**: [What investigation would answer this]
   - **Decision Required By**: [Date or milestone]

2. **[Question 2]**
   - **Context**: [Background]
   - **Impact**: [Consequences of different answers]
   - **Options**: [Potential paths forward]

---

## Proof of Concept Findings

### POC Setup
- **Environment**: [Description of test environment]
- **Code Location**: [Path to POC code, if created]
- **Test Scenarios**: [What was tested]

### Results
- **Scenario 1**: [Test description]
  - **Result**: ✅ Success / ⚠️ Partial / ❌ Failed
  - **Observations**: [What we learned]

- **Scenario 2**: [Test description]
  - **Result**: [Outcome]
  - **Observations**: [Findings]

### Performance Metrics
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| [Metric name] | [Target value] | [Measured value] | ✅/⚠️/❌ |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| [Risk description] | High/Med/Low | High/Med/Low | [How to address] |
| Example: Library abandonment | Low | High | Pin to stable version, maintain fork plan |

---

## Implementation Considerations

### Dependencies to Add
```json
{
  "dependencies": {
    "[package-name]": "[version-or-range]"
  }
}
```

**License Verification Required**:
- [ ] [package-name] - [License type] - ✅ Compatible / ⚠️ Review needed

### Configuration Changes
- **File**: [Path to config file]
- **Changes**: [What needs to be modified]

### Database Schema Changes
- **Migration Required**: Yes / No
- **Impact**: [Description of changes]

### Breaking Changes
- **API Changes**: [List any breaking changes]
- **Migration Path**: [How to upgrade existing code]

---

## Timeline Estimate

| Phase | Effort | Description |
|-------|--------|-------------|
| **Setup** | [X hours/days] | [Initial setup tasks] |
| **Core Implementation** | [X hours/days] | [Main development work] |
| **Testing** | [X hours/days] | [Test creation and validation] |
| **Integration** | [X hours/days] | [MCP/A2A integration] |
| **Documentation** | [X hours/days] | [Docs and examples] |
| **Total** | [X hours/days] | |

---

## Related Research

### Internal Documentation
- [Link to relevant ADRs]
- [Link to related research documents]
- [Link to existing implementations]

### External Resources
- [Link 1]: [Brief description]
- [Link 2]: [Brief description]
- [Link 3]: [Brief description]

### Prior Art in Codebase
- **Similar Pattern**: [Path to code]
  - **Lessons Learned**: [What worked/didn't work]
  - **Reusable Components**: [What can be leveraged]

---

## Next Steps

1. **Immediate**:
   - [ ] [Action item 1]
   - [ ] [Action item 2]

2. **Before Implementation**:
   - [ ] Get stakeholder approval on recommended approach
   - [ ] Create TDD plan based on this research
   - [ ] Verify all dependencies are license-compatible
   - [ ] Document in local memory for future reference

3. **During Implementation**:
   - [ ] Validate assumptions with tests
   - [ ] Monitor for deviations from research findings
   - [ ] Update this document if new information emerges

---

## Appendix

### Code Samples

```typescript
// Example: Proposed API structure
export interface FeatureConfig {
  enabled: boolean;
  options: Record<string, unknown>;
}

export const createFeature = async (
  config: FeatureConfig
): Promise<Feature> => {
  // Implementation would go here
  // Each function ≤40 lines per brAInwav standards
};
```

### Benchmarks

[Include any performance benchmarks, load test results, or comparison data]

### Screenshots/Diagrams

[If applicable, describe or reference visual aids]

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| [YYYY-MM-DD] | [Name] | Initial research |
| [YYYY-MM-DD] | [Name] | Updated with POC findings |

---

**Status**: [Mark as Complete when ready for planning phase]

**Stored in Local Memory**: [Yes/No - Document key findings in local-memory for agent context]

Co-authored-by: brAInwav Development Team
