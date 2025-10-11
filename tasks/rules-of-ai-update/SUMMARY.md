# RULES_OF_AI.md Update - Governance Alignment

**Date**: 2025-10-11  
**Status**: Complete  
**Maintainer**: brAInwav Development Team

---

## Executive Summary

Updated `/.cortex/rules/RULES_OF_AI.md` to align with current governance documents and incorporate latest standards from AGENTS.md, CODESTYLE.md, constitution.md, agentic-coding-workflow.md, and supporting governance pack files.

**File Size**: Expanded from ~577 lines to 665 lines (+88 lines, +15%)  
**Version**: Updated to 1.1.0  
**Last Updated**: 2025-10-11

---

## Key Changes

### 1. Added Hierarchy of Authority Section (NEW)

**Location**: Lines 7-26  
**Purpose**: Explicitly define document precedence to resolve conflicts

```markdown
1. Governance Pack (/.cortex/rules/) — binding
2. CODESTYLE.md — enforced by CI
3. AGENTS.md — operational rules
4. Package-level AGENTS.md — may tighten, not weaken
5. Model guides — adapter specifics only
```

**Includes**: Links to all Governance Pack files:
- Time Freshness Guard
- Vision Document
- Agentic Coding Workflow
- Task Folder Structure
- Code Review Checklist
- CI Review Checklist
- Constitution

### 2. Expanded Agentic Coding Workflow (5 → 7 Phases)

**Location**: Lines 107-280  
**Changes**:
- Updated from 5-phase to 7-phase workflow
- Added **Phase 6: Monitoring, Iteration & Scaling** (NEW)
- Renumbered Archive to **Phase 7**
- Added comprehensive Task Folder Structure diagram
- Referenced mandatory TASK_FOLDER_STRUCTURE.md

**New Phase 6 Requirements**:
- Active monitoring with deployment dashboards
- Track performance, cost, user metrics
- Rapid response to feedback/incidents/drift
- Model updates and retraining documentation
- Scale and optimize with documentation

**Updated Phase 7 (Archive)**:
- **MANDATORY**: Update CHANGELOG.md
- **MANDATORY**: Update README.md for user-facing changes
- Update website documentation
- Comprehensive SUMMARY.md requirements
- Full traceability in `~/tasks/[feature]/` folder

### 3. Added Time Freshness & Date Handling Section (NEW)

**Location**: Lines 539-556  
**Purpose**: Enforce timezone/date handling per _time-freshness.md

**Requirements**:
- Anchor to user's current timezone and date
- Treat dates correctly (past vs. future)
- Verify freshness for "latest", "most recent" queries
- Use ISO-8601 format exclusively
- Separate past/future clearly to prevent timeline drift

**Example**:
```markdown
❌ "The latest version was released recently"
✅ "The latest version (v2.1.0) was released on 2025-10-08"
```

### 4. Enhanced Reality Filter Section

**Location**: Lines 558-605  
**Changes**:
- Expanded from simple checklist to comprehensive guidance
- Added Core Principles with checkboxes
- Added "When Uncertain" protocol
- Added "Dangerous Claims" list (Prevent, Guarantee, Will never, etc.)
- Added "LLM Behavior Claims" requirements
- Added Self-Correction Protocol
- **NEW**: Integration with Phase 5 verification

**Key Addition**:
> **Integration with Verification Phase**: During Phase 5 verification, validate that all documentation and code comments comply with Reality Filter requirements.

### 5. Added Integration Points & System Boundaries (NEW)

**Location**: Lines 338-386  
**Purpose**: Document allowed interfaces per vision.md

**Allowed Surfaces**:
1. MCP (Model Context Protocol) - HTTP/SSE/STDIO
2. A2A (Agent-to-Agent Hub) - intra-runtime messaging
3. REST API - programmatic control
4. Frontier Model Adapters - OpenAI/Anthropic/Google/ChatGPT/Perplexity

**Non-Goals (Prohibited)**:
- Multiple MCP servers per package
- Unbounded interfaces
- Opaque AI actions
- Side channels or undocumented ports

**Package Vision Alignment**:
- References vision.md section 4 for "Done Means" criteria
- Lists key package purposes and boundaries
- Requires verification before claiming completion

### 6. Updated Quality Gates & Coverage Thresholds

**Location**: Lines 607-633  
**Changes**: Aligned with CODESTYLE.md §10

**PR Merge Gates** (Updated):
- Branch coverage ≥ **65%** (was implied 90%)
- Mutation score ≥ **75%**
- Changed-lines coverage ≥ **95%** (NEW requirement)

**Aspirational Baselines** (Maintained):
- Statements 90% • Branches 90% • Functions 90% • Lines 95%

**TDD Coach Integration**:
- Dev watch mode for feedback
- Pre-commit validation
- CI status check blocks non-compliant PRs
- Required for Phase 2 TDD plan creation

### 7. Enhanced TypeScript Configuration Standards (NEW)

**Location**: Lines 377-401  
**Purpose**: Document mandatory tsconfig requirements per CODESTYLE.md §3.1

**Required Fields**:
```json
{
  "compilerOptions": {
    "composite": true,      // REQUIRED - incremental builds
    "outDir": "dist",       // REQUIRED - standard output
    "noEmit": false,        // REQUIRED when composite: true
    "module": "NodeNext",   // REQUIRED - ESM support
    "moduleResolution": "NodeNext"  // REQUIRED - ESM resolution
  }
}
```

**Template System**:
- `.cortex/templates/tsconfig/tsconfig.lib.json`
- `.cortex/templates/tsconfig/tsconfig.spec.json`
- Migration script: `pnpm tsx scripts/migrate-tsconfig.ts`
- Validation: `pnpm structure:validate`

### 8. Expanded Memory Management Requirements

**Location**: Lines 456-473  
**Changes**: Added dual-mode operation and verification requirements

**New Requirements**:
- **Dual-mode operation**: Follow `docs/local-memory-fix-summary.md` for MCP/REST parity
- **Memory entry verification**: PR reviewers must confirm entries exist
- **Operate per `.github/instructions/memories.instructions.md`**: Document evidence in TDD plan

**At Every Decision**:
1. Append rationale to `.github/instructions/memories.instructions.md`
2. Persist via Local Memory MCP/REST dual mode
3. Tag with task name
4. Reference `LocalMemoryEntryId` in task files

### 9. Updated Verification Checklist

**Location**: Lines 233-247  
**Changes**: Expanded checklist with constitutional compliance

**New Items**:
- [ ] Reality Filter applied - no unverified claims as fact
- [ ] brAInwav branding verification in all outputs/errors/logs
- [ ] Mock production claims audit (no fake data/TODOs/placeholders)
- [ ] Coverage gates: ≥90% global, ≥65% branch for PR merge
- [ ] Code follows CODESTYLE.md (≤40 lines/function, named exports, async/await)

### 10. Added CODESTYLE.md Cross-References

**Throughout document**: Added section references to CODESTYLE.md

**Examples**:
- "Function Length Limits (CODESTYLE.md Enforcement)"
- "Class Usage Restrictions (CODESTYLE.md §3)"
- "TypeScript Project Configuration (CODESTYLE.md §3.1)"
- "Quality Gates (CODESTYLE.md §10)"
- "Automation & Agent-Toolkit (CODESTYLE.md §11)"

---

## Structural Improvements

### Document Organization

1. **Header**: Added version, last updated date, maintainer
2. **Hierarchy Section**: NEW - establishes precedence
3. **Governance Pack Links**: Comprehensive reference list
4. **Workflow**: Expanded from 5 to 7 phases with detailed requirements
5. **Integration Points**: NEW - system boundaries and package vision
6. **Time Freshness**: NEW - date handling requirements
7. **Reality Filter**: Expanded with protocols and examples
8. **Quality Gates**: Updated thresholds and TDD coach integration

### Cross-Document Alignment

| Document | Integration Point | Lines |
|----------|------------------|-------|
| AGENTS.md | Hierarchy of authority, memory management | 7-26, 456-473 |
| CODESTYLE.md | Function limits, TypeScript config, coverage gates | 351-401, 607-633 |
| constitution.md | Reality Filter, brAInwav branding, verification | 558-605 |
| agentic-coding-workflow.md | 7-phase workflow, task structure | 107-280 |
| vision.md | Integration surfaces, package boundaries | 338-386 |
| TASK_FOLDER_STRUCTURE.md | Folder organization, required files | 114-142 |
| _time-freshness.md | Date/timezone handling | 539-556 |

---

## Compliance Verification

### Constitutional Requirements Met

- [x] brAInwav branding in all sections
- [x] No mock production claims in examples
- [x] Function size limits ≤40 lines referenced
- [x] Named exports only requirement stated
- [x] Reality Filter properly integrated
- [x] CHANGELOG.md update requirement added
- [x] README.md update requirement added
- [x] Co-authored commit requirement maintained

### CODESTYLE.md Alignment

- [x] Coverage thresholds updated (65% branch, 75% mutation)
- [x] TypeScript configuration standards documented
- [x] TDD Coach integration referenced
- [x] Agent-toolkit requirements maintained
- [x] Quality gates explicitly defined
- [x] Async/await requirements restated

### AGENTS.md Consistency

- [x] Hierarchy of authority matches section 1
- [x] Memory management details from section 14
- [x] Time freshness rules from section 22
- [x] Port registry references
- [x] Environment loading standards

---

## Impact Analysis

### For AI Agents

**Benefits**:
1. Clear precedence hierarchy eliminates document conflicts
2. Comprehensive workflow prevents phase skipping
3. Explicit task folder structure requirements
4. Updated coverage thresholds align with CI reality
5. Time freshness rules prevent outdated responses
6. Reality Filter prevents unverified claims

**Changes Required**:
1. Follow 7-phase workflow (was 5 phases)
2. Create all required task folder files
3. Label unverified content with `[Inference/Speculation/Unverified]`
4. Use ISO-8601 dates instead of relative language
5. Update CHANGELOG.md and README.md in Archive phase
6. Verify package vision alignment before claiming completion

### For Developers

**Benefits**:
1. Single source of truth for AI governance
2. Clear integration boundaries
3. Explicit quality gates
4. TypeScript configuration templates
5. Reality Filter prevents misleading documentation

**Actions Required**:
1. Review updated workflow phases
2. Use task folder structure for all features
3. Verify RULES_OF_AI compliance in code reviews
4. Apply Reality Filter to documentation
5. Reference CODESTYLE.md for technical standards

### For Reviewers

**Benefits**:
1. Checklist expanded with constitutional compliance
2. Clear criteria for verification phase
3. Reality Filter validation requirements
4. CHANGELOG/README update requirements explicit

**Review Checklist Additions**:
- [ ] Reality Filter applied - content labeled properly
- [ ] brAInwav branding present in outputs/errors
- [ ] No mock production claims
- [ ] CHANGELOG.md updated
- [ ] README.md updated (if user-facing)
- [ ] Task folder structure complete

---

## Testing & Validation

### Structure Validation

```bash
# Verify file placement
pnpm structure:validate

# Check against allowedRootEntries
grep -q "RULES_OF_AI.md" .cortex/structure-guard.config.json
```

### Link Validation

All internal links verified:
- [x] `/_time-freshness.md`
- [x] `/vision.md`
- [x] `/agentic-coding-workflow.md`
- [x] `/TASK_FOLDER_STRUCTURE.md`
- [x] `/code-review-checklist.md`
- [x] `/CHECKLIST.cortex-os.md`
- [x] `/constitution.md`
- [x] `../../AGENTS.md`
- [x] `../CODESTYLE.md`

### Content Validation

- [x] All sections properly formatted
- [x] Code blocks use correct syntax highlighting
- [x] Checklists use proper markdown
- [x] brAInwav branding throughout
- [x] No placeholder content
- [x] No TODOs in production sections
- [x] Version and date updated

---

## Future Considerations

### Potential Enhancements

1. **Automation**: Create validation script for Reality Filter compliance
2. **Templates**: Add `.cortex/templates/task-folder/` with starter files
3. **Examples**: Add real-world task folder examples in appendix
4. **Metrics**: Track Reality Filter violations in CI
5. **Training**: Create onboarding guide referencing this document

### Maintenance Plan

**Quarterly Reviews**:
- Verify alignment with AGENTS.md, CODESTYLE.md, constitution.md
- Update coverage thresholds if CI gates change
- Refresh examples with current best practices
- Add new Governance Pack files to hierarchy

**Trigger Updates**:
- When workflow phases change
- When quality gates are adjusted
- When new integration surfaces are added
- When package vision changes

---

## Lessons Learned

### What Went Well

1. **Comprehensive Analysis**: Reviewed all governance documents before updates
2. **Cross-References**: Added explicit CODESTYLE.md section numbers
3. **Backwards Compatible**: Existing workflows still work, just more detailed
4. **Clear Priorities**: Hierarchy of authority resolves conflicts
5. **Practical Examples**: Reality Filter examples prevent confusion

### Challenges Overcome

1. **Document Length**: Balanced comprehensiveness with readability
2. **Workflow Renumbering**: Carefully updated all phase references
3. **Link Paths**: Ensured relative paths work from `.cortex/rules/`
4. **Terminology Consistency**: Aligned with vision.md and constitution.md
5. **Threshold Updates**: Verified against actual CI configuration

### Recommendations

1. **For Future Updates**: Use `search_replace` for precise changes
2. **Version Control**: Update version number with each significant change
3. **Cross-Validation**: Always check AGENTS.md and CODESTYLE.md alignment
4. **Link Testing**: Verify all internal links after updates
5. **Reality Filter**: Apply to this document - no unverified claims

---

## Conclusion

The updated `RULES_OF_AI.md` is now fully aligned with all governance documents and incorporates the latest standards from:

- ✅ AGENTS.md (hierarchy, memory, time freshness)
- ✅ CODESTYLE.md (coverage, TypeScript, quality gates)
- ✅ constitution.md (Reality Filter, branding, verification)
- ✅ agentic-coding-workflow.md (7-phase workflow, task structure)
- ✅ vision.md (integration surfaces, package boundaries)
- ✅ TASK_FOLDER_STRUCTURE.md (folder organization)
- ✅ code-review-checklist.md (verification criteria)
- ✅ CHECKLIST.cortex-os.md (CI requirements)
- ✅ _time-freshness.md (date/timezone handling)

**Result**: A comprehensive, authoritative governance document that provides clear guidance for all AI agents working on brAInwav Cortex-OS while maintaining compatibility with existing workflows and tooling.

---

**Co-authored-by: brAInwav Development Team <dev@brainwav.dev>**
