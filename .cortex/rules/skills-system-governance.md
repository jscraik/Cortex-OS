---
title: "Skills System Governance"
description: "Standards and guidelines for creating, managing, and utilizing skills in brAInwav Cortex-OS"
version: "1.0.0"
maintainer: "brAInwav Development Team"
last_updated: "2025-10-15"
status: "authoritative"
applies_to: ["all agents", "all packages", "all skills"]
enforcement: "CI validation + code review"
---

# Skills System Governance

**Authority**: This document is part of the Governance Pack (`/.cortex/rules/`) and is binding for all agent and human activities involving skills.

**Scope**: Standards for creating, validating, storing, discovering, and utilizing skills within the brAInwav Cortex-OS ecosystem.

---

## 1. Purpose & Principles

### 1.1 Purpose

The Skills System provides structured reference knowledge that:
- Complements experiential learning (Local Memory)
- Increases agent compliance with best practices
- Accelerates agent skill development
- Ensures consistency across agent implementations
- Captures and shares organizational knowledge

### 1.2 Core Principles

1. **Quality Over Quantity**: Few excellent skills > many mediocre skills
2. **Evidence-Based**: Skills must be proven effective through usage tracking
3. **Accessible**: Clear, practical guidance with concrete examples
4. **Measurable**: Success criteria and effectiveness tracking required
5. **Ethical**: Persuasive framing must be honest and beneficial
6. **Maintainable**: Regular updates, deprecation, and version control
7. **brAInwav Compliant**: All skills follow Cortex-OS standards

---

## 2. Skill Lifecycle

### 2.1 Creation

**Who Can Create Skills**:
- ✅ Human developers (after research and validation)
- ✅ AI agents (after demonstrating pattern effectiveness)
- ✅ Teams (collaborative skill development)

**Creation Requirements**:
1. **Research Phase**: Document the pattern/practice being captured
2. **Validation Phase**: Prove effectiveness through at least 5 successful applications
3. **Documentation Phase**: Follow skill template with all required fields
4. **Review Phase**: Peer review for quality, accuracy, and completeness
5. **Testing Phase**: Validate YAML frontmatter and content structure
6. **Approval Phase**: Merge only after passing all gates

**Evidence Required**:
- Minimum 5 successful applications stored in Local Memory
- Effectiveness rate ≥80% (track via `relationships` and `analysis`)
- Clear problem statement and solution approach
- Concrete examples from real implementations

### 2.2 Validation Standards

All skills MUST pass:

**Schema Validation** (Automated):
```typescript
// Zod schema validation from @cortex-os/contracts
- id: /^skill-[\w-]+$/ (kebab-case with skill- prefix)
- name: 3-100 characters
- description: 10-500 characters
- content: 50-50,000 characters
- version: Semantic versioning (e.g., "1.0.0")
- category: One of 9 predefined categories
- tags: 1-20 tags, each 1-50 characters
- difficulty: beginner|intermediate|advanced|expert
- estimatedTokens: 1-10,000
- persuasiveFraming: Optional, validated structure
```

**Content Quality** (Manual Review):
- ✅ Clear "When to Use" section
- ✅ Step-by-step "How to Apply" with examples
- ✅ Specific "Success Criteria" (1-20 items)
- ✅ "Common Pitfalls" guidance
- ✅ Code examples (if applicable)
- ✅ brAInwav branding in examples
- ✅ No malicious patterns or antipatterns

**Security Validation** (Automated):
```typescript
// Reject skills containing:
- SQL injection patterns
- Command injection patterns
- Path traversal patterns
- Hardcoded secrets/credentials
- Malicious code examples
```

**Ethical Validation** (Manual Review):
- ✅ Honest persuasive framing (no manipulation)
- ✅ Evidence-based claims (cite sources)
- ✅ Beneficial guidance (improves outcomes)
- ✅ Respects user autonomy (guidance, not coercion)
- ✅ Inclusive language and examples

### 2.3 Storage

**Directory Structure**:
```
skills/
├── README.md              # System overview and guide
├── examples/              # Example skills for reference
├── coding/                # Category: coding patterns
├── security/              # Category: security practices
├── testing/               # Category: testing strategies
├── documentation/         # Category: documentation standards
├── automation/            # Category: automation workflows
├── communication/         # Category: communication guidelines
├── analysis/              # Category: analysis techniques
└── integration/           # Category: integration patterns
```

**File Naming**:
- Format: `skill-{descriptive-name}.md`
- Must match ID in frontmatter
- Kebab-case only
- Descriptive and unique

**Version Control**:
- All skills tracked in Git
- Semantic versioning for updates
- Change log in commit messages
- Deprecated skills marked with `deprecated: true`

### 2.4 Discovery

Agents discover skills through:

1. **Direct File Search** (Current):
```bash
find skills/ -name "*.md" -exec grep -l "search-term" {} \;
```

2. **MCP Tools** (Planned):
```typescript
skill_search({
  query: "authentication best practices",
  category: "security",
  difficulty: "intermediate",
  topK: 5,
  similarityThreshold: 0.7
})
```

3. **RAG-Based Semantic Search** (In Progress):
- Skills indexed in Qdrant vector database
- Semantic similarity matching
- Natural language queries
- Ranked results with relevance scores

### 2.5 Application

**Standard Application Flow**:

1. **Search** for relevant skills
2. **Read** skill content and examples
3. **Apply** guidance to current task
4. **Store** outcome in Local Memory:
```javascript
memoryStore({
  content: "Applied skill-X to task Y. Outcome: success/failure with details",
  importance: 7-10,
  tags: ["skill-applied", "skill-id", "outcome"],
  metadata: { skillUsed: "skill-id", outcome: "success|failure" }
})
```
5. **Link** skill to memory for tracking:
```javascript
relationships({
  relationship_type: "create",
  source_memory_id: "memory-id",
  target_memory_id: "skill-id",
  relationship_type_enum: "applies",
  strength: 0.0-1.0  // Based on effectiveness
})
```

### 2.6 Updates

**When to Update**:
- Bug fixes in examples or guidance
- New best practices emerge
- Improved clarity or examples
- Deprecation of old approaches
- Feedback from effectiveness tracking

**Update Process**:
1. Increment version following semver
2. Update `updatedAt` timestamp in frontmatter
3. Document changes in commit message
4. Maintain backward compatibility where possible
5. If breaking changes, create new skill and deprecate old

**Deprecation Process**:
1. Set `deprecated: true` in frontmatter
2. Add `replacedBy: "skill-new-id"` reference
3. Keep file for historical reference (6 months minimum)
4. Remove from primary search results
5. Delete after deprecation period with proper notice

### 2.7 Retirement

Skills are retired when:
- No usage in 12 months (tracked via Local Memory)
- Effectiveness rate drops below 50%
- Replaced by better alternatives
- Practices become obsolete or harmful

**Retirement Process**:
1. Mark as deprecated for 6 months
2. Notify via change log and documentation
3. Archive to `skills/archived/` directory
4. Remove from active indices
5. Keep for historical/research purposes

---

## 3. Effectiveness Tracking

### 3.1 Metrics

Track skill effectiveness through Local Memory:

**Success Rate**:
```javascript
analysis({
  analysis_type: "question",
  question: "What is the success rate for skill-{id}?",
  session_filter_mode: "all"
})
```

**Application Frequency**:
- Count memories with `metadata.skillUsed: "skill-id"`
- Track temporal patterns of usage
- Identify trending vs declining skills

**Relationship Strength**:
- Average strength of `applies` relationships
- High strength (>0.8) = highly effective
- Low strength (<0.5) = needs improvement or retirement

### 3.2 Quality Gates

Skills must maintain:
- ✅ Success rate ≥80% (minimum 10 applications)
- ✅ Usage frequency ≥1 per month
- ✅ Average relationship strength ≥0.7
- ✅ Positive feedback in memory notes

Falling below thresholds triggers:
1. Review for improvement opportunities
2. Possible deprecation
3. Retirement if not improvable

### 3.3 Continuous Improvement

**Feedback Loop**:
1. Agents store outcomes after skill application
2. Analysis reveals effectiveness patterns
3. Low-performing skills flagged for review
4. Updates improve guidance and examples
5. Re-validation confirms improvements

**Innovation Tracking**:
- Monitor for agents creating skill variations
- Identify emerging patterns in memories
- Extract new skills from successful innovations
- Update existing skills with new insights

---

## 4. Persuasive Framing Standards

### 4.1 Purpose

Persuasive framing increases agent compliance under pressure using ethical psychological principles.

### 4.2 Elements

**Authority** - Expert endorsement or standards:
```yaml
authority: "OWASP Top 10 requirement"
authority: "IEEE recommended practice"
authority: "Industry standard used by Fortune 500 companies"
```

**Commitment** - Evidence and research:
```yaml
commitment: "Reduces bugs by 40-80% (Microsoft Research Study 2019)"
commitment: "Improves code maintainability by 60% (IBM DevOps Report)"
```

**Scarcity** - Critical importance:
```yaml
scarcity: "Required for brAInwav production deployment"
scarcity: "Critical security control - no exceptions"
```

**Social Proof** - Adoption and usage:
```yaml
socialProof: "Used by 10,000+ production systems"
socialProof: "Standard practice in 92% of elite teams"
```

**Reciprocity** - Benefits and time savings:
```yaml
reciprocity: "Saves 3-5 hours of debugging per feature"
reciprocity: "Reduces code review cycles by 60%"
```

### 4.3 Ethical Requirements

Persuasive framing MUST be:
- ✅ **Honest**: Only use verified facts and statistics
- ✅ **Beneficial**: Guidance improves outcomes
- ✅ **Cited**: Include sources for claims (when possible)
- ✅ **Proportional**: Strength matches actual importance
- ✅ **Respectful**: No manipulation or coercion

❌ **Prohibited**:
- False claims or made-up statistics
- Manipulation through fear
- Misrepresentation of importance
- Pressure without benefit
- Deceptive framing

### 4.4 Effectiveness Research

Studies show persuasive framing increases compliance:
- Baseline: ~45% compliance under time pressure
- With authority: ~75% compliance (+67%)
- With commitment: ~80% compliance (+78%)
- With combined framing: 90-135% effective compliance (+200-300%)

---

## 5. Integration with Cortex-OS

### 5.1 Agentic Coding Workflow

Skills integrate at these phases:

**Phase 1 - Research**:
- Search skills for existing patterns
- Review related skills for context
- Document skill-based approach in research.md

**Phase 2 - Planning**:
- Reference specific skills in implementation plan
- Include skill success criteria as quality gates
- Plan for skill effectiveness tracking

**Phase 3 - Implementation**:
- Apply skill guidance during development
- Follow TDD patterns from testing skills
- Store TDD progress referencing skill ID

**Phase 4 - Review**:
- Verify implementation meets skill criteria
- Document deviations with rationale
- Store review findings linked to skill

**Phase 5 - Verification**:
- Confirm quality gates from skills
- Track success/failure of skill application
- Update effectiveness metrics

**Phase 7 - Archive**:
- Store final skill effectiveness data
- Update relationship strengths
- Contribute learnings to skill improvements

### 5.2 Local Memory Integration

**Storage Pattern**:
```javascript
// When applying skill
memoryStore({
  content: "Applied {skill-id} to {task}. {Outcome details}",
  importance: 7-10,
  tags: ["skill-applied", "{skill-id}", "{outcome}"],
  domain: "{domain}",
  metadata: {
    skillUsed: "{skill-id}",
    skillVersion: "1.0.0",
    outcome: "success|partial|failure",
    effectivenessScore: 0.0-1.0,
    branding: "brAInwav"
  }
})
```

**Relationship Pattern**:
```javascript
relationships({
  relationship_type: "create",
  source_memory_id: "{outcome-memory-id}",
  target_memory_id: "{skill-id}",
  relationship_type_enum: "applies",
  strength: 0.0-1.0,  // 0.8-1.0 = highly effective
  context: "Brief description of application and outcome"
})
```

**Analysis Pattern**:
```javascript
// Track effectiveness over time
analysis({
  analysis_type: "temporal_patterns",
  concept: "{skill-id} effectiveness",
  temporal_timeframe: "quarter"
})

// Find best skills for domain
analysis({
  analysis_type: "question",
  question: "Which skills are most effective for {domain} implementations?",
  session_filter_mode: "all"
})
```

### 5.3 Testing Standards

Skills related to testing MUST align with `.cortex/rules/testing-standards.md`:
- Coverage requirements (≥90% global, ≥95% changed lines)
- Test organization patterns
- TDD methodology
- Mutation testing (≥90% where enabled)
- Performance benchmarks

### 5.4 Code Style Compliance

All code examples in skills MUST follow `CODESTYLE.md`:
- Named exports only (no default exports)
- Functions ≤40 lines
- Async/await (no .then() chains)
- brAInwav branding in outputs
- TypeScript strict mode
- Comprehensive error handling

---

## 6. CI/CD Integration

### 6.1 Automated Validation

CI MUST validate:
```bash
# Skill schema validation
pnpm skills:validate

# Security scanning
pnpm skills:security-scan

# Frontmatter parsing
pnpm skills:parse-all
```

### 6.2 Pre-commit Hooks

```bash
# Validate changed skills
pnpm skills:validate --changed

# Check for malicious patterns
pnpm skills:security-scan --changed
```

### 6.3 Pull Request Requirements

PRs adding/modifying skills MUST include:
1. **Evidence**: Links to Local Memory entries showing effectiveness
2. **Review**: At least one peer review approval
3. **Tests**: Validation passes for all changed skills
4. **Documentation**: Updates to README if needed
5. **Changelog**: Description of changes in PR description

---

## 7. Governance Enforcement

### 7.1 Review Checklist

Before merging skill changes:
- [ ] Schema validation passes
- [ ] Security scan clean
- [ ] Frontmatter complete and valid
- [ ] Content quality reviewed
- [ ] Examples tested and work
- [ ] Persuasive framing is ethical
- [ ] brAInwav branding present
- [ ] Success criteria defined
- [ ] Evidence of effectiveness (for new skills)
- [ ] Proper category and tags
- [ ] Version updated (for changes)
- [ ] Commit message descriptive

### 7.2 Quality Metrics

Track governance compliance:
- Schema validation pass rate: Target 100%
- Security scan pass rate: Target 100%
- Average effectiveness rate: Target ≥85%
- Skill usage rate: Target ≥1 per skill per month
- Update frequency: Target quarterly review

### 7.3 Escalation

Issues escalate per `.cortex/rules/constitution.md`:
1. Reviewer feedback → Author fixes
2. Persistent issues → Team discussion
3. Governance violations → Block merge
4. Repeated violations → Access review

---

## 8. Future Enhancements

**Planned Features**:
- [ ] Automatic skill effectiveness analytics dashboard
- [ ] ML-based skill recommendation engine
- [ ] Cross-skill relationship mapping
- [ ] Skill difficulty progression paths
- [ ] Automated skill generation from patterns
- [ ] A/B testing for skill variations
- [ ] Multi-language skill support

**Research Areas**:
- Optimal persuasive framing combinations
- Skill complexity vs effectiveness correlation
- Temporal effectiveness decay patterns
- Cross-domain skill transfer efficiency

---

## 9. References

- `skills/README.md` - User guide for skills system
- `AGENTS.md §24.1` - Skills system operational guide
- `.cortex/rules/agentic-coding-workflow.md` - Integration points
- `.cortex/rules/testing-standards.md` - Testing skill standards
- `.cortex/rules/CODESTYLE.md` - Code example standards
- `.cortex/rules/RULES_OF_AI.md` - AI ethics and compliance
- `@cortex-os/contracts/skill-events.ts` - Schema definitions
- `packages/memory-core/src/skills/` - Implementation

---

**Maintained by**: brAInwav Development Team  
**Version**: 1.0.0  
**Last Updated**: 2025-10-15  
**Status**: Authoritative - Binding for all agents and packages
