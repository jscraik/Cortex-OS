---
title: Api Reference
sidebar_label: Api Reference
---

# API Reference

TDD Coach exposes a simple programmatic API.

## `createTDDCoach(options)`
Creates a coach instance.

### Parameters
- `workspaceRoot` (string): project root.
- `config` (object): behavioral options.
- `testConfig` (object): test runner settings.

### Returns
- Coach object with methods:
  - `validateChange(changeSet)`
  - `getStatus()`

No authentication is required for local usage.
