---
title: Getting Started
sidebar_label: Getting Started
---

# Getting Started

## Prerequisites
- Node.js 18+
- Python 3.10+
- pnpm or npm
- Optional: external embedding providers (configure via your app)

## Installation
```bash
pnpm add @cortex-os/orchestration
# Python dependencies
cd packages/python-agents
pip install -r requirements.txt
```

## First Launch
```typescript
import { createEngine } from '@cortex-os/orchestration';
const engine = await createEngine();
await engine.initialize();
```
