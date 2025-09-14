---
title: Architecture
sidebar_label: Architecture
---

# Architecture

```text
┌───────────────┐
│ GithubClient  │
└──────┬────────┘
       │
   ┌───▼────────────┐
   │ Modules        │
   └─┬──────────────┘
     │
┌────▼────┐ ┌──────▼────────┐
│Auth     │ │RateLimiter    │
└─────────┘ └───────────────┘
```

Components:

- **GithubClient**: top-level facade wiring auth, modules, and rate limits.
- **Modules**: structured APIs such as `repos`, `pull_requests`, and `actions`.
- **Auth**: token provider and webhook verifier.
- **RateLimiter**: throttles requests according to GitHub headers.
