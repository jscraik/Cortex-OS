---
title: Python Integration
sidebar_label: Python Integration
---

# Cortex-py Documentation

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Overview

Cortex-py provides an MLX-accelerated embedding service and utilities for generating text embeddings locally or in CI. It powers the `/embed` API used by Cortex-OS components and offers command line tools for embeddings, chat, and reranking workflows.

## Features

### Current
- FastAPI server exposing `/embed` for on-demand vector generation
- MLX-backed Qwen embedding models with optional normalization
- CLI tools for batch embeddings, chat completions, and reranking
- Configurable cache and model paths for offline or reproducible runs

### Planned
- Extended API endpoints for chat and reranking
- Additional model presets and quantization options
- Pre-built Docker images for streamlined deployment

## Table of Contents

- [Introduction](./introduction.md)
- [Getting Started](./getting-started.md)
- [Configuration](./configuration.md)
- [Architecture](./architecture.md)
- [CLI Reference](./cli-reference.md)
- [API Reference](./api-reference.md)
- [User Guide](./user-guide.md)
- [Best Practices](./best-practices.md)
- [Providers & Setup](./providers-setup.md)
- [Security](./security.md)
- [Policy & Terms](./policy-terms.md)
- [FAQ](./faq.md)
- [Roadmap](./roadmap.md)
- [Troubleshooting](./troubleshooting.md)
- [Changelog](./changelog.md)
- [Migration Guide](./migration.md)
- [Testing & QA](./testing.md)
- [Deployment](./deployment.md)
- [Examples & Tutorials](./examples.md)
- [Performance & Benchmarking](./performance.md)
- [Logging & Monitoring](./logging-monitoring.md)
- [Glossary](./glossary.md)
- [Contributor Setup](./contributor-setup.md)
- [Accessibility Guidelines](./accessibility.md)
