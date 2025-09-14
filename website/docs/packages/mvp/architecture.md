---
title: Architecture
sidebar_label: Architecture
---

# Architecture

- **Validator** - wraps Zod schemas for runtime data enforcement.
- **FileManager** - provides glob-based file operations.
- **ID Generator** - exposes `generateId()` powered by nanoid.
- **Determinism** - utilities for seed-based reproducible tests.
