---
title: Configuration
sidebar_label: Configuration
---

# Configuration

Both services accept environment variables via `.env` files or the host environment.

## Model Gateway

- `PORT` - HTTP port (default `3000`).
- Provider credentials such as `OPENAI_API_KEY` are read at runtime.

## Orchestration

- `LOG_LEVEL` - set logging verbosity.

Configuration files live alongside each service and may be extended with custom settings.
