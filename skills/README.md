# brAInwav Skills Directory

**Purpose**: Structured reference knowledge for agent skill development
**Maintainer**: brAInwav Development Team
**Last Updated**: 2025-10-15

---

## Overview

This directory contains skill files that provide reference knowledge and best practices for agents. Skills complement experiential learning (Local Memory) with structured guidance.

> **Skills Registry Initiative (skills-registry-v1)**  
> The next iteration of this directory will be managed by the machine-validated registry described in `tasks/skills-registry-v1/implementation-plan.md`. Contributors SHOULD review that plan before authoring new skills to ensure upcoming schema and tooling requirements are met. Track execution progress via the checklist in `tasks/skills-registry-v1/implementation-checklist.md`.

### Skills vs Local Memory

| Component | Purpose | Storage | Usage |
|-----------|---------|---------|-------|
| **Skills** | Reference guides | `skills/*.md` files | Read when needed |
| **Local Memory** | Experience tracking | SQLite + Qdrant | Cross-session learning |
| **Combined** | Expert performance | Both systems | Informed decisions |

---

## Directory Structure

```
skills/
├── README.md                    # This file
├── examples/                    # Example skill files
│   ├── skill-tdd-cycle.md      # TDD best practices
│   └── skill-code-review.md    # Code review guidelines
├── coding/                      # Coding skills
├── security/                    # Security skills
├── testing/                     # Testing skills
├── documentation/               # Documentation skills
├── automation/                  # Automation skills
└── communication/               # Communication skills
```

---

## Skill File Format

Skills are markdown files with YAML frontmatter:

```markdown
---
id: skill-example-pattern
name: "Example Pattern Name"
description: "Brief description of when and how to use this skill"
version: "1.0.0"
author: "brAInwav Development Team"
category: "coding"
tags: ["pattern", "best-practice", "example"]
difficulty: "intermediate"
estimatedTokens: 2500
persuasiveFraming:
  authority: "Industry standard pattern used by 87% of teams"
  commitment: "Reduces bugs by 40-80% (Research citation)"
  scarcity: "Critical for production-ready brAInwav compliance"
---

# Skill Name

## When to Use
- Clear trigger conditions
- Specific scenarios
- Problem indicators

## How to Apply

### Step-by-step instructions with examples

\`\`\`typescript
// Code examples
\`\`\`

## Success Criteria
- Measurable outcomes
- Quality indicators
- Completion markers

## Common Pitfalls
- What to avoid
- Frequent mistakes
- Warning signs
```

---

## Creating New Skills

### 1. Follow the Template

Use the format above with all required fields:
- `id`: Must start with `skill-` and use kebab-case
- `name`: Clear, descriptive name (3-100 chars)
- `description`: What the skill teaches (10-500 chars)
- `version`: Semantic versioning (e.g., "1.0.0")
- `author`: Your name or team
- `category`: One of: coding, communication, security, analysis, automation, integration, testing, documentation, other
- `tags`: 1-20 relevant tags
- `difficulty`: beginner, intermediate, advanced, or expert
- `estimatedTokens`: Approximate token count (1-10000)

### 2. Add Persuasive Framing (Optional but Recommended)

Increase agent compliance with psychological elements:
- `authority`: Expert endorsement or standard reference
- `commitment`: Data/research supporting the approach
- `scarcity`: Why this is critical/non-negotiable
- `socialProof`: Adoption statistics or peer usage
- `reciprocity`: Benefits/time savings from following

### 3. Include Practical Examples

Agents learn best from concrete examples:
- Show before/after code
- Include common scenarios
- Provide step-by-step guidance
- Add troubleshooting tips

### 4. Define Success Criteria

Clear markers for correct application:
- Measurable outcomes
- Quality indicators
- Performance benchmarks
- Compliance checks

### 5. Store in Appropriate Category

Place skills in category subdirectories:
- `skills/coding/` - Programming patterns
- `skills/security/` - Security practices
- `skills/testing/` - Testing strategies
- `skills/documentation/` - Documentation standards
- `skills/automation/` - Automation workflows
- `skills/communication/` - Communication guidelines

---

## Using Skills

### MCP Tools (When Implemented)

```javascript
// Search for relevant skills
skill_search({
  query: "authentication best practices",
  category: "security",
  difficulty: "intermediate",
  topK: 5
})

// Get specific skill
skill_get({
  skillId: "skill-jwt-authentication"
})

// Apply skill with tracking
skill_apply({
  skillId: "skill-tdd-cycle",
  context: "Implementing user validation"
})
```

### Direct File Access

Skills are regular markdown files - agents can:
1. Read files directly from `skills/` directory
2. Parse YAML frontmatter for metadata
3. Extract content for guidance
4. Store outcomes in Local Memory

### Integration with Local Memory

After applying a skill, agents should store the experience:

```javascript
// Store skill application outcome
await memoryStore({
  content: "Applied skill-tdd-cycle to user validation. Tests passed first time, implementation clean.",
  importance: 8,
  tags: ["skill-applied", "tdd", "success"],
  domain: "user-validation",
  metadata: {
    skillUsed: "skill-tdd-cycle",
    outcome: "success",
    branding: "brAInwav"
  }
})

// Link skill to outcome
await relationships({
  relationship_type: "create",
  source_memory_id: "outcome-memory-id",
  target_memory_id: "skill-tdd-cycle",
  relationship_type_enum: "applies",
  strength: 0.95,
  context: "Skill guidance was accurate and effective"
})
```

---

## Skill Effectiveness Tracking

Analyze which skills work best:

```javascript
analysis({
  analysis_type: "question",
  question: "Which skills have been most effective for testing implementations?",
  session_filter_mode: "all"
})
```

Track skill evolution over time:

```javascript
analysis({
  analysis_type: "temporal_patterns",
  concept: "skill-tdd-cycle effectiveness",
  temporal_timeframe: "quarter"
})
```

---

## Best Practices

1. **Be Specific**: Write clear, actionable guidance
2. **Use Examples**: Include real code examples
3. **Tag Consistently**: Use standard tags for discoverability
4. **Update Regularly**: Mark deprecated skills and create replacements
5. **Measure Impact**: Track skill effectiveness through Local Memory
6. **Persuade Wisely**: Use persuasive framing ethically
7. **Version Properly**: Follow semantic versioning for updates

---

## Quality Standards

All skills must meet brAInwav standards:
- ✅ Complete YAML frontmatter
- ✅ Valid skill ID format (`skill-*`)
- ✅ Clear success criteria
- ✅ Practical examples
- ✅ brAInwav branding
- ✅ Accessibility considerations
- ✅ Security validation (no malicious patterns)

---

## Contributing

See `.cortex/rules/agentic-coding-workflow.md` for the complete workflow.

1. Research the skill topic
2. Create skill file following template
3. Test with actual agents
4. Measure effectiveness
5. Iterate based on feedback
6. Store learnings in Local Memory

---

**brAInwav Development Team**
**Last Updated**: 2025-10-15
