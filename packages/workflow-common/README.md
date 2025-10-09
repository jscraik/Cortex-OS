# @cortex-os/workflow-common

**brAInwav Cortex-OS shared workflow primitives for PRP Runner and Task Management**

## Overview

This package provides shared validation logic and evidence tracking used by both:

- **PRP Runner**: Quality gate orchestration (G0-G7)
- **Task Management**: Feature development workflow (Phases 0-5)

By centralizing validation logic, we ensure consistency across both systems and eliminate redundancy.

## Features

### Validation Functions

- **Coverage Validation**: Shared between PRP G4 and Task Management Phase 4
- **Performance Validation**: Used by PRP G2, G6 and Task Phase 4
- **Security Validation**: Used by PRP G3, G6 and Task Phase 4
- **Accessibility Validation**: Used by PRP G2, G6 and Task Phase 4

### Evidence Tracking

- **Evidence Index**: Links PRP gate evidence to task management artifacts
- **Cross-referencing**: Enables traceability from ideation through deployment

## Usage

### Coverage Validation

```typescript
import { validateCoverage } from '@cortex-os/workflow-common';

const result = validateCoverage(
  { lines: 96, branches: 94, functions: 95, statements: 96 },
  { lines: 95, branches: 95, functions: 95, statements: 95 }
);

if (!result.passed) {
  console.error('Coverage validation failed:', result.failures);
}
```

### Performance Validation

```typescript
import { validatePerformance } from '@cortex-os/workflow-common';

const result = validatePerformance(
  { lcp: 2400, tbt: 280 },
  { lcp: 2500, tbt: 300 }
);
```

### Security Validation

```typescript
import { validateSecurity } from '@cortex-os/workflow-common';

const result = validateSecurity(
  { critical: 0, high: 0, medium: 2, low: 5, total: 7 },
  { maxCritical: 0, maxHigh: 0, maxMedium: 5, failOnAny: false }
);
```

### Evidence Tracking

```typescript
import {
  createEvidenceIndex,
  addEvidenceToIndex,
  createEvidenceIndexEntry,
  findEvidenceByTask,
} from '@cortex-os/workflow-common';

const index = createEvidenceIndex();

const entry = createEvidenceIndexEntry(
  'feature-name',
  'evidence-id',
  'validation',
  'tasks/feature-name-tdd-plan.md',
  { gateId: 'G2', taskPhase: 'planning' }
);

const updatedIndex = addEvidenceToIndex(index, entry);

const taskEvidence = findEvidenceByTask(updatedIndex, 'feature-name');
```

## Integration with PRP Runner

PRP Runner gates use these validators:

```typescript
// packages/prp-runner/src/gates/g4-verification.ts
import { validateCoverage } from '@cortex-os/workflow-common';

class CoverageValidationCheck implements AutomatedCheck {
  async execute(context: GateContext) {
    const result = validateCoverage(actualCoverage, {
      lines: context.enforcementProfile.budgets.coverageLines,
      branches: context.enforcementProfile.budgets.coverageBranches,
      functions: 95,
      statements: 95,
    });
    
    return {
      status: result.passed ? 'pass' : 'fail',
      output: result.failures.join(', '),
      evidence: [...]
    };
  }
}
```

## Integration with Task Management

Task Management CLI uses these validators:

```typescript
// scripts/cortex-task.mjs (Phase 4: Verification)
import { validateCoverage } from '@cortex-os/workflow-common';

async function verifyQualityGates() {
  const coverageReport = await readCoverageReport();
  const result = validateCoverage(coverageReport, {
    lines: 95,
    branches: 95,
    functions: 95,
    statements: 95,
  });
  
  if (!result.passed) {
    throw new Error(`Quality gate failed: ${result.failures.join(', ')}`);
  }
}
```

## API Reference

### Validation Types

```typescript
interface CoverageRequirements {
  lines: number;
  branches: number;
  functions: number;
  statements: number;
}

interface PerformanceBudget {
  lcp: number;
  tbt: number;
  fcp?: number;
  tti?: number;
}

interface AccessibilityRequirements {
  score: number;
  wcagLevel: 'A' | 'AA' | 'AAA';
  wcagVersion: '2.0' | '2.1' | '2.2';
}

interface SecurityRequirements {
  maxCritical: number;
  maxHigh: number;
  maxMedium: number;
  failOnAny: boolean;
}

interface ValidationResult {
  passed: boolean;
  failures: string[];
  warnings?: string[];
  metadata?: Record<string, unknown>;
}
```

### Evidence Types

```typescript
interface EvidenceIndexEntry {
  id: string;
  taskId: string;
  gateId?: string;
  taskPhase?: string;
  evidenceId: string;
  evidenceType: 'validation' | 'test-result' | 'review' | 'benchmark' | 'analysis';
  artifactPath: string;
  timestamp: string;
  branding: 'brAInwav';
}

interface EvidenceIndex {
  version: string;
  lastUpdated: string;
  entries: EvidenceIndexEntry[];
}
```

## brAInwav Standards

All validation functions include brAInwav branding in their output and metadata:

- Error messages: "✗ brAInwav Coverage validation failed"
- Success messages: "✓ brAInwav Coverage validation passed"
- Metadata: `{ branding: 'brAInwav' }`

## Development

```bash
# Build
pnpm build

# Test
pnpm test

# Type check
pnpm typecheck
```

## Version

1.0.0

## Maintainer

@jamiescottcraik

## Co-authored-by

brAInwav Development Team
