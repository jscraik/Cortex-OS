---
title: Migration
sidebar_label: Migration
---

# Migration Guide

## From external RAG tools
- Map existing embeddings to the `Store` interface.
- Implement a thin adapter to reuse current vector databases.
- Replace bespoke chunking with `RAGPipeline`'s built-in chunker.

## Version Upgrades
Future breaking changes will be documented with step-by-step upgrade notes here.
