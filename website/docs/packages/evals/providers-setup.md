---
title: Providers Setup
sidebar_label: Providers Setup
---

# Provider Setup

Evaluation suites rely on external services such as embedders or LLM routers. Configure providers using environment variables:

| Service | Variables |
|---------|-----------|
| OpenAI embeddings | `OPENAI_API_KEY`
| Router service    | `ROUTER_API_URL`, `ROUTER_API_KEY`
| Vector store      | `STORE_URL`, `STORE_TOKEN`

Ensure secrets are injected via your CI/CD platform rather than hard‑coded.
