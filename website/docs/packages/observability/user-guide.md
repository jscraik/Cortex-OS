---
title: User Guide
sidebar_label: User Guide
---

# User Guide

1. Call `initializeObservability` when your service starts.
2. Wrap asynchronous work with `withSpan` to capture traces.
3. Use `startConsoleViewer` during development to print spans and metrics to stdout.
4. Set `TRACE_EXPORTER` and `METRIC_EXPORTER` to route data to your observability backend.
5. Run `generateFlamegraph` when investigating CPU bottlenecks.
