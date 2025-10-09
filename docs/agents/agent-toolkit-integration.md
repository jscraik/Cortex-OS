# Agent-Toolkit Integration

This document describes how the Agent-Toolkit is integrated with the MCP server and the new memory-core.

## MCP Tools

The Agent-Toolkit exposes its functionality as a set of MCP tools, prefixed with `agent_toolkit_`.

## Delegation

The MCP server acts as a thin adapter, delegating all `agent_toolkit_*` tool calls to the `@cortex-os/agent-toolkit` package.
