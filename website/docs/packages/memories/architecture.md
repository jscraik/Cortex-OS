---
title: Architecture
sidebar_label: Architecture
---

# Architecture

The system is composed of:

1. **Memory Store** - adapters for Neo4j, Qdrant, SQLite, or in-memory storage.
2. **Embedding Pipeline** - MLX, Ollama, or OpenAI providers wrapped in a composite embedder.
3. **Policy Layer** - per-namespace rules for TTL, size, PII redaction, and encryption.
4. **Services** - `MemoryService` for CRUD operations and `ContextRetrievalService` for semantic search.

These components are modular and can be swapped through environment configuration.
