---
title: Getting Started
sidebar_label: Getting Started
---

# Getting Started

## Prerequisites
- Node.js 18+
- pnpm 8+
- Git

## Installation

```bash
pnpm install
pnpm build
```

## First Usage

```ts
import { createKernel } from '@cortex-os/kernel';

const kernel = createKernel();
await kernel.run();

```