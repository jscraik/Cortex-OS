---
title: Architecture
sidebar_label: Architecture
---

# Architecture

ASBR is composed of modular layers:

- **API Server** - Express-based HTTP server exposing `/v1` endpoints and Socket.IO events.
- **SDK Client** - Typed client for creating tasks and subscribing to events.
- **Cerebrum Layer** - Meta-agent planning and critique utilities.
- **Diff & Evidence Engines** - Normalize, validate and store artifacts.
- **Security** - Token auth, OWASP LLM guard and sandboxed MCP tools.
- **Accessibility** - ARIA announcer and keyboard navigation manager.

Components communicate through an internal event manager enabling decoupled features.
