---
title: Getting Started
sidebar_label: Getting Started
---

# Getting Started

## Prerequisites

- Node.js 20+
- pnpm 8+

## Installation

```bash
pnpm add @cortex-os/evals
```

## First Run

```ts
import { runGate } from '@cortex-os/evals';
import myDeps from './deps';
import config from './gate.config.json' with { type: 'json' };

const result = await runGate(config, myDeps);
console.log(result.pass ? 'passed' : 'failed');
```

Create a `gate.config.json` with the suites you want to execute and provide the required dependencies.
