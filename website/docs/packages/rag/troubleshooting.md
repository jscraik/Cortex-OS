---
title: Troubleshooting
sidebar_label: Troubleshooting
---

# Troubleshooting Guide

## Embedding Errors
- **Connection refused**: verify the Python service is running and reachable.
- **Timeouts**: increase `PY_EMBED_TIMEOUT` or reduce `batchSize`.

## Retrieval Issues
- **Low scores**: lower `minScore` or improve document coverage.
- **Missing documents**: ensure `ingest` resolved without errors.

## Performance
- Enable debug logging (`RAG_LOG_LEVEL=debug`) to inspect pipeline stages.
