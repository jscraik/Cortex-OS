---
title: Providers Setup
sidebar_label: Providers Setup
---

# Providers & Setup

Configure external services with environment variables:

| Service | Variable | Example |
| --------- | ---------- | --------- |
| PostgreSQL | `DATABASE_URL` | `postgres://user:pass@host/db` |
| Redis | `REDIS_URL` | `redis://localhost:6379` |
| OpenAI | `OPENAI_API_KEY` | `sk-...` |

Set values in your shell or an `.env` file before starting the server.
