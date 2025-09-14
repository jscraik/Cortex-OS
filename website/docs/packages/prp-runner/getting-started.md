---
title: Getting Started
sidebar_label: Getting Started
---

# Getting Started

## Prerequisites
- Node.js 18 or later
- pnpm 8+

## Installation
```bash
pnpm add @cortex-os/prp-runner
```

## First Run
Execute the semantic search demo to verify setup:

```bash
pnpm -C packages/prp-runner demo:semsearch -- --dir ../../docs --query "What is Cortex-OS?"
```

The demo indexes markdown files and returns semantically relevant passages.
