---
title: Api Reference
sidebar_label: Api Reference
---

# API Reference / SDK Overview

The runtime exposes REST and event APIs.

- **REST API** - served from `apps/api`, default port 3000.
  - Authentication via bearer tokens (`AUTH_TOKEN`).
  - Key endpoints: `/health`, `/agents`, `/events`.
- **SDKs**
  - TypeScript packages in `packages/*` provide typed clients.
  - Python integration in `python/` via `cortex_ml.instructor_client`.
