---
title: Getting Started
sidebar_label: Getting Started
---

# Getting Started

## Prerequisites
- Node.js 18+
- pnpm 8+

## Installation
```bash
pnpm install
```

## First Simulation
```typescript
import { SimRunner } from '@cortex-os/simlab';
import type { SimScenario } from '@cortex-os/schemas';


const scenario: SimScenario = {
  id: 'demo-001',
  goal: 'User creates an account',
  persona: {
    locale: 'en-US',
    tone: 'friendly',
    tech_fluency: 'low'
  },
  initial_context: {},
  sop_refs: ['account-setup'],
  kb_refs: ['account-guide'],
  success_criteria: ['account created']
};

const runner = new SimRunner({ deterministic: true, seed: 42 });
const result = await runner.runScenario(scenario);
console.log(result.passed ? 'PASS' : 'FAIL');
```

Run the example with:
```bash
pnpm tsx demo.ts

```