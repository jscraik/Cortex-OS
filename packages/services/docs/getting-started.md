# Getting Started

## Prerequisites

- Node.js 20+
- pnpm 9+

## Installation

```bash
pnpm install
```

## Run Services

### Model Gateway
```bash
cd packages/services/model-gateway
pnpm dev
```

### Orchestration
```bash
cd packages/services/orchestration
pnpm build && node dist/index.js
```
