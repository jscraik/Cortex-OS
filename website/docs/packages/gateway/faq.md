---
title: Faq
sidebar_label: Faq
---

# FAQ

**Why does the server fail to start?**
Ensure all required environment variables are set and the port is free.

**How do I regenerate the OpenAPI spec?**
Run `pnpm --filter @cortex-os/gateway test` to rebuild `openapi.json`.

**Where are metrics exposed?**
Enable `ENABLE_METRICS&#61;true` and GET `/metrics`.
