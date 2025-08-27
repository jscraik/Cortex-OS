<!--
file_path: ".github/instructions/file-size-standards.md"
description: "Mandatory file size standards and enforcement guidelines for Cortex OS to prevent monolithic code violations"
maintainer: "@jamiescottcraik"
last_updated: "2025-08-20"
version: "1.0.0"
status: "active"
-->

# File Size Standards & Enforcement

⚠️ **CRITICAL VIOLATION PREVENTION**: This document establishes mandatory file size limits and enforcement mechanisms to prevent the creation of monolithic code files that violate project standards.

## Overview

### Purpose

Ensure all code files remain maintainable, readable, and comply with the **500-line hard cap** specified in `copilot-codeReview.instructions.md`.

### Recent Violation Analysis

**2025-08-20**: Two system.ts files exceeded limits by **500%+**:

- `resources/prompts/system.ts`: 1,020 lines (504% over limit)
- `prompts/system.ts`: 1,002 lines (500% over limit)

**Root Cause**: Lack of automated enforcement and clear modularization guidelines.

---

## Mandatory File Size Limits

### Hard Limits (Per copilot-codeReview.instructions.md §5)

| File Type          | Hard Cap  | Enforcement |
| ------------------ | --------- | ----------- |
| **All Code Files** | 500 lines | CI blocking |
| Functions          | 40 lines  | ESLint rule |
| Components         | 40 lines  | ESLint rule |

### Recommended Targets

| File Type                 | Target    | Rationale              |
| ------------------------- | --------- | ---------------------- |
| **TypeScript/JavaScript** | 300 lines | Optimal cognitive load |
| **Python**                | 300 lines | PEP 8 alignment        |
| **React Components**      | 200 lines | Single responsibility  |
| **Configuration**         | 100 lines | Simple maintenance     |

---

## Enforcement Mechanisms

### 1. Pre-commit Hooks

```bash
#!/bin/bash
# .git/hooks/pre-commit
# Check file sizes before commit

MAX_LINES=500
EXIT_CODE=0

while IFS= read -r -d '' file; do
    if [[ "$file" =~ \\.(ts|tsx|js|jsx|py)$ ]]; then
        line_count=$(wc -l < "$file")
        if [ "$line_count" -gt $MAX_LINES ]; then
            echo "❌ VIOLATION: $file has $line_count lines (max: $MAX_LINES)"
            EXIT_CODE=1
        fi
    fi
done < <(git diff --cached --name-only --diff-filter=ACM -z)

if [ $EXIT_CODE -ne 0 ]; then
    echo ""
    echo "🚨 COMMIT BLOCKED: Files exceed 500-line limit"
    echo "📖 See: .github/instructions/file-size-standards.md"
    echo "🔧 Consider splitting large files into modules"
fi

exit $EXIT_CODE
```

### 2. CI Pipeline Check

```yaml
# .github/workflows/file-size-check.yml
name: File Size Enforcement
on: [push, pull_request]

jobs:
  check-file-sizes:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check file sizes
        run: |
          find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" | while read file; do
            lines=$(wc -l < "$file")
            if [ "$lines" -gt 500 ]; then
              echo "❌ $file: $lines lines (exceeds 500 limit)"
              exit 1
            fi
          done
```

### 3. ESLint Rule Configuration

```json
// .eslintrc.json - Add to rules
{
  "max-lines": ["error", {
    "max": 500,
    "skipBlankLines": true,
    "skipComments": true
  }],
  "max-lines-per-function": ["error", {
    "max": 40,
    "skipBlankLines": true,
    "skipComments": true
  }]
}
```

---

## Modularization Guidelines

### When to Split Files

**Immediate Split Required (>500 lines):**

- System/configuration files
- Large component files
- Utility collections
- API route handlers

**Recommended Split (>300 lines):**

- Complex components
- Service classes
- Helper modules
- Test suites

### How to Split Files

#### 1. **Single Responsibility Extraction**

```
Original: user-management.ts (600 lines)
Split into:
├── user-service.ts (150 lines) - API calls
├── user-validation.ts (100 lines) - Validation logic
├── user-types.ts (80 lines) - Type definitions
└── user-utils.ts (120 lines) - Helper functions
```

#### 2. **Feature-Based Modules**

```
Original: dashboard.tsx (800 lines)
Split into:
├── dashboard-container.tsx (100 lines) - Main container
├── dashboard-header.tsx (80 lines) - Header component
├── dashboard-sidebar.tsx (120 lines) - Navigation
├── dashboard-content.tsx (150 lines) - Main content
└── dashboard-widgets/ (multiple files)
```

#### 3. **Layer-Based Separation**

```
Original: api-handlers.ts (700 lines)
Split into:
├── handlers/
│   ├── auth-handler.ts (150 lines)
│   ├── user-handler.ts (180 lines)
│   └── data-handler.ts (200 lines)
└── middleware/
    ├── validation.ts (100 lines)
    └── error-handling.ts (70 lines)
```

---

## Project Integration

### Required Updates

1. **Add pre-commit hook** (blocking)
2. **Update CI pipeline** (blocking)
3. **Enable ESLint rules** (blocking)
4. **Document all exceptions** (with justification)

### Exception Process

**Rare cases** where 500+ lines are justified:

1. **Document reasoning** in file header
2. **Get explicit approval** from maintainer
3. **Add `// Reason: [justification]` comment**
4. **Plan for future refactoring**

Example:

```typescript
/**
 * EXCEPTION: This file exceeds 500 lines due to legacy API compatibility
 * Reason: Generated code from OpenAPI spec - manual splitting would break tooling
 * Planned refactoring: Q2 2025 when API v2 is stable
 * Approved by: @jamiescottcraik
 */
```

---

## Monitoring & Reporting

### Weekly File Size Report

Generate automated reports of largest files:

```bash
#!/bin/bash
# scripts/file-size-report.sh
echo "📊 FILE SIZE REPORT - $(date)"
echo "Files approaching 500-line limit:"
find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" | \
  xargs wc -l | \
  sort -nr | \
  head -20 | \
  awk '$1 > 400 { printf "⚠️  %s: %d lines\\n", $2, $1 }'
```

### Dashboard Integration

Add file size metrics to project dashboards:

- Track largest files over time
- Monitor trends and violations
- Alert on threshold breaches

---

## Success Metrics

### Target Outcomes

- **Zero files >500 lines** (hard requirement)
- **<5% files >300 lines** (recommended target)
- **Average file size <200 lines** (optimal)

### Enforcement Success

- Pre-commit hook blocks 100% of violations
- CI catches any bypassed violations
- Regular audits maintain compliance

---

## Implementation Checklist

### Immediate (Critical)

- [ ] Install pre-commit hooks across all dev environments
- [ ] Enable ESLint max-lines rules
- [ ] Add CI file size checks
- [ ] Audit existing files >500 lines
- [ ] Document approved exceptions

### Short-term (1-2 weeks)

- [ ] Split any remaining oversized files
- [ ] Train team on modularization patterns
- [ ] Establish file size monitoring
- [ ] Create refactoring guidelines

### Long-term (1-3 months)

- [ ] Integrate with code quality metrics
- [ ] Automate refactoring suggestions
- [ ] Track and reduce average file sizes
- [ ] Establish architecture review process

---

## Related Documentation

- [copilot-codeReview.instructions.md](./copilot-codeReview.instructions.md) - Source of 500-line hard cap
- [copilot-testGeneration.instructions.md](./copilot-testGeneration.instructions.md) - Test file standards
- [Project Architecture Guidelines](../../docs/architecture/) - High-level design patterns

---

**Remember**: Every large file is a maintenance debt. Keep files focused, modular, and under the 500-line hard cap.

© 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
