---
title: Troubleshooting
sidebar_label: Troubleshooting
---

# Troubleshooting Guide

- **Message not received**: Ensure the handler is bound before publishing and that types match.
- **Trace context missing**: Check that `traceparent` is forwarded when creating envelopes.
- **Transport errors**: Enable debug logging to capture HTTP/WebSocket failures.

