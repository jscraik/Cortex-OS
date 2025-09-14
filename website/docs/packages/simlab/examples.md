---
title: Examples
sidebar_label: Examples
---

# Examples & Tutorials

## Minimal Scenario
```typescript
import { SimRunner } from '@cortex-os/simlab';

await new SimRunner().runScenario({
  id: 'ping',
  goal: 'Say hello',
  persona: { locale: 'en-US', tone: 'neutral', tech_fluency: 'med' },
  initial_context: {},
  sop_refs: [],
  kb_refs: [],
  success_criteria: ['hello received']
});
```

## Tutorial
1. Create a set of scenarios in `scenarios/`.
2. Run `pnpm simlab:smoke` to validate basic behavior.
3. Inspect generated reports for areas of improvement.

