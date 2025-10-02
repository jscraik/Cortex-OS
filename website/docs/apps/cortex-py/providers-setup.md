---
title: Providers Setup
sidebar_label: Providers Setup
---

# Providers & Setup

Cortex-py integrates with Hugging Face model repositories.

Set the following environment variables to use external caches or providers:
- `HF_HOME` – base directory for Hugging Face data
- `TRANSFORMERS_CACHE` – explicit transformers cache path
- `OLLAMA_BASE_URL` – URL for an Ollama-compatible service when using `MLXUnified` chat mode

Ensure network access is permitted only when fetching models intentionally.
