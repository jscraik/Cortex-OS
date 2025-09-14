---
title: Troubleshooting
sidebar_label: Troubleshooting
---

# Troubleshooting Guide

### Connection Refused
Verify the server is listening on the expected host and port. Use `mcp-server serve --host 0.0.0.0` in containers.

### Plugin Import Errors
Check that plugin dependencies are installed and Python paths are correct.

### High Latency
Enable tracing with OpenTelemetry to locate slow operations and review database indexes.
