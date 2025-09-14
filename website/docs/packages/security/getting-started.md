---
title: Getting Started
sidebar_label: Getting Started
---

# Getting Started

## Prerequisites

- Node.js 18+
- Running [SPIRE](https://spiffe.io/spire/) agent with Unix socket access

## Installation

```bash
pnpm add @cortex-os/security
```

## First Use

```typescript
import { SpiffeClient } from '@cortex-os/security';

const client &#61; new SpiffeClient({
  socketPath: '/tmp/spire-agent/public/api.sock',
  trustDomain: 'cortex-os.local',
});

const identity &#61; await client.fetchWorkloadIdentity();
console.log(identity.spiffeId);
```
