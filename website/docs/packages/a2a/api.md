---
title: Api
sidebar_label: Api
---

# API Reference / SDK Overview

## Bus

`createBus(transport)` creates an event bus bound to a transport.

## Envelope

`createEnvelope({ type, source, data })` builds a CloudEvents-compliant message with optional tracing fields.

## Handlers

Handlers define `type` and `handle(envelope)` to process messages.

No authentication is required for in-process transports. Remote transports should implement their own auth layers.

