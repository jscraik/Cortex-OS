---
title: Architecture
sidebar_label: Architecture
---

# Architecture

The system consists of modular layers:

## Coordination Engine
- Plans and executes multi-agent workflows
- Supports adaptive, parallel, and strategic decisions

## Python Bridges
- JSON over stdio bridge to LangGraph and CrewAI agents
- Checkpoint history for replay and diagnostics

## Providers
- MLX and Ollama adapters for model execution
- Extensible provider interface for new frameworks

## Observability
- Structured logging and audit trails
- Performance metrics for each workflow
