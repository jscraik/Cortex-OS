---
title: Architecture
sidebar_label: Architecture
---

# Architecture

## Graph Engine
Controls node execution using a deterministic LangGraph implementation.

## State Manager
Validates and records `PRPState` transitions.

## Nodes
Built-in nodes include `runBuildNode`, `runEvaluationNode`, and `runStrategyNode`.

## MCP Adapter
Provides access to external tools through the Model Context Protocol.

## Teaching Layer
Supports behavior extensions and example capture for continual learning.
