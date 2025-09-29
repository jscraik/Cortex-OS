# Cortex-OS Packages

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

</div>

This document outlines product specifications and technical summaries for every package under the `packages/` directory.

## Core Packages

| Package           | Version | Description                                                                        | Tech Highlights                |
| ----------------- | ------- | ---------------------------------------------------------------------------------- | ------------------------------ |
| a2a               | 0.0.1   | Agent-to-agent communication primitives and utilities.                             | NATS, SQLite, TypeScript       |
| a2a-services      | N/A     | Shared services for the A2A layer, including common utilities and schema registry. | TypeScript services            |
| agent-toolkit     | 0.1.0   | Agent-friendly toolkit for code search, transformation, and validation             | MCP, Zod, TypeScript           |
| agents            | 0.1.0   | brAInwav Cortex-OS Native Agent System                                             | LangGraph, Hono, SQLite        |
| asbr              | N/A     | Agentic Second-Brain Runtime for brain-only orchestration and knowledge runtime.   | Node/TypeScript                |
| commands          | 0.1.0   | Slash command loader/parser/runner for Cortex-OS                                   | YAML, Markdown, TypeScript     |
| cortex-mcp        | N/A     | Cortex MCP integration and utilities                                               | MCP Protocol, TypeScript       |
| evals             | 0.0.1   | Evaluation harness for measuring agent and system behavior.                        | Node/TypeScript                |
| gateway           | 0.0.1   | External request routing and gateway service.                                      | Fastify, A2A, TypeScript       |
| hooks             | 0.1.0   | Deterministic lifecycle hooks for agents, orchestration, prp-runner, and kernel    | File watching, YAML, TypeScript|
| kernel            | 1.0.0   | Deterministic kernel using LangGraph for state management.                         | LangGraph, Zod, TypeScript     |
| mcp               | 0.0.1   | Model Context Protocol client utilities.                                           | MCP Protocol, TypeScript       |
| mcp-bridge        | N/A     | MCP plugin management and marketplace system.                                      | Node/TypeScript                |
| mcp-core          | 0.1.0   | Core MCP protocol implementation with client/server support                        | WebSocket, Zod, TypeScript     |
| mcp-registry      | N/A     | MCP Server Registry with schema validation and signing.                            | Node/TypeScript                |
| memories          | 0.1.0   | Memory services with vector search and persistent context                          | Qdrant, SQLite, TypeScript     |
| model-gateway     | 0.1.0   | Unified interface for model provider routing.                                      | Fastify, MCP, TypeScript       |
| mvp               | N/A     | CLI and supporting tooling for MVP workflows.                                      | Node/TypeScript                |
| mvp-core          | N/A     | Core libraries supporting MVP features.                                            | Node/TypeScript                |
| mvp-group         | N/A     | MVP group management utilities                                                      | Node/TypeScript                |
| mvp-server        | N/A     | Server harness for MVP deployments.                                                | Node/TypeScript                |
| observability     | 1.0.0   | OTEL spans, metrics, and logs with ULID propagation.                               | OpenTelemetry, Pino, TypeScript|
| orchestration     | 0.1.0   | Workflow orchestration with LangGraph and agent coordination                       | LangGraph, Express, Redis      |
| policy            | 0.1.0   | Policy definitions and enforcement utilities                                        | Zod, TypeScript                |
| prp-runner        | N/A     | Production-grade PRP neural orchestration engine.                                  | Node/TypeScript                |
| rag               | 0.0.1   | Retrieval-augmented generation with document ingestion and search                  | Vector search, PostgreSQL      |
| registry          | N/A     | Schema registry service for Cortex-OS contracts.                                   | Node/TypeScript                |
| security          | 0.1.0   | SPIFFE/SPIRE security with mTLS and workload identity management.                  | SPIFFE/SPIRE, mTLS, TypeScript |
| services          | N/A     | Shared service utilities and implementations                                        | Node/TypeScript                |
| simlab            | 0.1.0   | Simulation harness for Cortex-OS with deterministic evaluation.                    | Kernel, PRP, TypeScript        |
| tdd-coach         | 0.1.0   | Universal TDD coaching system for developers and AI models                         | WebSocket, File watching       |

## GitHub Integration Packages

| Package                    | Version | Description                                        | Tech Highlights      |
| -------------------------- | ------- | -------------------------------------------------- | --------------------- |
| cortex-ai-github           | N/A     | AI-powered GitHub integration and automation       | GitHub API, AI        |
| cortex-semgrep-github      | N/A     | Semgrep security scanning integration for GitHub   | Semgrep, GitHub API   |
| cortex-structure-github    | N/A     | GitHub repository structure analysis and tooling   | GitHub API, Analysis  |
| github                     | N/A     | Core GitHub API integration utilities              | GitHub API, TypeScript|

## Development Utilities

| Package           | Version | Description                                          | Tech Highlights        |
| ----------------- | ------- | ---------------------------------------------------- | ----------------------- |
| agui              | N/A     | Agent UI components and interfaces                   | UI Components           |
| cortex-logging    | N/A     | Centralized logging utilities for Cortex-OS         | Logging, Observability  |
| cortex-rules      | N/A     | Rule engine and validation system                    | Rules, Validation       |
| cortex-sec        | N/A     | Security utilities and enforcement                   | Security, Enforcement   |
| evidence-runner   | N/A     | Evidence collection and validation runner            | Evidence, Validation    |
| integrations      | N/A     | Third-party service integrations                     | Integration, APIs       |
