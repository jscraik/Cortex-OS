---
title: Configuration
sidebar_label: Configuration
---

# Configuration

TDD Coach reads options from a configuration object or JSON file.

## Locations
- `tdd-coach.config.json` in project root (optional).
- CLI flags override file settings.

## Format
```json
{
  "universalMode": true,
  "defaultInterventionLevel": "coaching",
  "adaptiveLearning": true
}
```

## Environment Variables
- `LOCAL_MEMORY_BASE_URL` for persistent coaching context.
