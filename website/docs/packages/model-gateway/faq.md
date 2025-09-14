---
title: Faq
sidebar_label: Faq
---

# FAQ

**Why are no models available?**
Check that MLX models are installed or that `OLLAMA_AVAILABLE&#61;true` is set.

**How do I enable privacy mode?**
POST `{ "enabled": true }` to `/privacy` or set `CORTEX_PRIVACY_MODE&#61;true` before start.

**Where are logs stored?**
If `CORTEX_AUDIT_LOG` is set, audit events append to that file. Otherwise only standard output is used.
