# Cortex-OS Packages

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

</div>

This document outlines product specifications and technical summaries for every package under the `packages/` directory.

| Package       | Version | Description                                                                        | Tech Highlights                |
| ------------- | ------- | ---------------------------------------------------------------------------------- | ------------------------------ |
| a2a           | 0.0.1   | Agent-to-agent communication primitives and utilities.                             | TypeScript modules             |
| a2a-services  | N/A     | Shared services for the A2A layer, including common utilities and schema registry. | TypeScript services            |
| asbr          | 1.0.0   | Agentic Second-Brain Runtime for brain-only orchestration and knowledge runtime.   | Node/TypeScript                |
| contracts     | 0.0.1   | Shared schemas and contracts for inter-package communication.                      | TypeScript definitions         |
| evals         | 0.0.1   | Evaluation harness for measuring agent and system behavior.                        | Node/TypeScript                |
| gateway       | 0.0.1   | External request routing and gateway service.                                      | Node server                    |
| kernel        | 1.0.0   | Deterministic kernel using LangGraph for state management.                         | LangGraph, TypeScript          |
| mcp           | 0.0.1   | Model Context Protocol client utilities.                                           | Node/TypeScript                |
| mcp-bridge    | 0.1.0   | MCP plugin management and marketplace system.                                      | Node/TypeScript                |
| mcp-registry  | 1.0.0   | MCP Server Registry with schema validation and signing.                            | Node/TypeScript                |
| mcp-server    | 0.1.1   | MCP protocol server implementation.                                                | Node/TypeScript                |
| memories      | 0.1.0   | Memory services for persistent and ephemeral context.                              | Node/TypeScript                |
| model-gateway | 0.1.0   | Unified interface for model provider routing.                                      | Node/TypeScript                |
| mvp           | 1.0.0   | CLI and supporting tooling for MVP workflows.                                      | Node/TypeScript                |
| mvp-core      | 0.1.0   | Core libraries supporting MVP features.                                            | Node/TypeScript                |
| mvp-server    | 0.1.1   | Server harness for MVP deployments.                                                | Node/TypeScript                |
| observability | 1.0.0   | OTEL spans, metrics, and logs with ULID propagation.                               | Node/TypeScript, OpenTelemetry |
| orchestration | 0.1.0   | Workflow orchestration utilities for agents.                                       | Node/TypeScript                |
| prp-runner    | 1.0.0   | Production-grade PRP neural orchestration engine.                                  | Node/TypeScript                |
| rag           | 0.0.1   | Retrieval-augmented generation components.                                         | Node/TypeScript                |
| registry      | 1.0.0   | Schema registry service for Cortex-OS contracts.                                   | Node/TypeScript                |
| security      | 0.1.0   | SPIFFE/SPIRE security with mTLS and workload identity management.                  | Node/TypeScript, SPIFFE/SPIRE  |
| simlab        | 0.1.0   | Simulation harness for Cortex-OS with deterministic evaluation.                    | Node/TypeScript                |
