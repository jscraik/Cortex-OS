---
title: Contributor Setup
sidebar_label: Contributor Setup
---

# Contributor Setup

1. Clone the repository and install dependencies:
```bash
git clone https://github.com/cortex-os/cortex-os.git
cd cortex-os && pnpm install
```
2. Start local databases for development:
```bash
docker compose up -d neo4j qdrant
```
3. Run type checking and tests:
```bash
pnpm lint packages/memories
pnpm test packages/memories
```
See the root `CONTRIBUTING.md` for global guidelines.
