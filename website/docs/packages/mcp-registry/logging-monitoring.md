---
title: Logging Monitoring
sidebar_label: Logging Monitoring
---

# Logging & Monitoring

The library logs only critical file I/O errors to `stderr`.
Integrate your own logging by wrapping calls to `upsert` and `remove` and capturing exceptions.
