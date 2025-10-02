---
title: Architecture
sidebar_label: Architecture
---

# Architecture

The system consists of modular layers:

## LangGraph Engine
- Single persona-driven graph execution
- MLX → Ollama → Frontier model selection
- Supports adaptive, parallel, and strategic decisions

## Python Bridges
- JSON over stdio bridge to LangGraph agents
- Checkpoint history for replay and diagnostics

## Providers
<!-- LangGraph-only: non-LangGraph model adapters removed -->
- Extensible provider interface for new frameworks

## Observability
- Structured logging and audit trails
- Performance metrics for each workflow
