---
title: Configuration
sidebar_label: Configuration
---

# Configuration

Environment variables control exporters:

- `TRACE_EXPORTER`: `otlp` (default), `jaeger`, `console`
- `METRIC_EXPORTER`: `otlp` (default), `console`

Example `.env`:
```env
TRACE_EXPORTER&#61;jaeger
METRIC_EXPORTER&#61;otlp
```
