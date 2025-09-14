---
title: Getting Started
sidebar_label: Getting Started
---

# Getting Started

## Prerequisites
- Node.js 18+
- npm or pnpm

## Installation
```bash
npm install -g @cortex-os/tdd-coach
```

## First Launch
1. Navigate to your project root.
2. Run `tdd-coach status` to initialize state.
3. Begin validating files:
   ```bash
   tdd-coach validate --files src/example.test.ts src/implementation.ts
```

```