---
title: Mcp Tools
sidebar_label: Mcp Tools
---

# Orchestration MCP Tool Contracts

The orchestration package exposes workflow coordination capabilities over the Model Context Protocol (MCP) using a contract-first
approach. Each tool definition includes a Zod input schema, typed result schema, documented error codes, and runtime validation
that surfaces consistent error responses for consuming agents.

## Error Response Format

All orchestration MCP tools emit structured error objects using the shared schema defined in `src/mcp/tools.ts`:

| Field | Type | Notes |
| --- | --- | --- |
| `code` | `TASK_NOT_FOUND \| WORKFLOW_NOT_FOUND \| INVALID_INPUT \| PERMISSION_DENIED \| RATE_LIMITED \| INTERNAL_ERROR` | Enumerated `ToolErrorCode` values |
| `message` | `string` | Human-readable explanation |
| `details` | `string[]` | Optional validation details |
| `retryable` | `boolean` | Indicates whether the caller can safely retry |
| `timestamp` | `string (ISO 8601)` | Automatically populated when the error is created |

## Workflow Orchestration Tools

| Tool | Description | Key Input Fields | Result Snapshot | Error Codes |
| --- | --- | --- | --- | --- |
| `workflow.plan` | Creates a workflow plan for multi-agent orchestration. | `workflowName`, `goal`, `preferredStrategy`, `tasks[]` | Plan metadata containing phases, tasks, and estimated durations. | `INVALID_INPUT`, `INTERNAL_ERROR` |

## Task Management Tools

| Tool | Description | Key Input Fields | Result Snapshot | Error Codes |
| --- | --- | --- | --- | --- |
| `task.update_status` | Update the status of a task in the orchestration system. | `taskId`, `status`, `progress?`, `audit?` | Updated status plus normalized progress payload. | `INVALID_INPUT`, `TASK_NOT_FOUND`, `INTERNAL_ERROR` |

## Process Monitoring Tools

| Tool | Description | Key Input Fields | Result Snapshot | Error Codes |
| --- | --- | --- | --- | --- |
| `process.get_status` | Get the current status of a workflow process. | `workflowId`, `includeTimeline?`, `includeMetrics?` | Progress metrics, risk level, active task roster, optional timeline. | `INVALID_INPUT`, `WORKFLOW_NOT_FOUND`, `INTERNAL_ERROR` |

## Validation Helpers

Tool contracts expose a `validateInput` helper that parses unknown payloads through the respective Zod schema and throws a
`ToolValidationError` with a structured error response when validation fails. Consumers attaching MCP handlers can safely call
`validateInput` prior to executing business logic to ensure consistent error semantics.

## Available Exports

The MCP tools module exports the following components for use in other packages:

- `workflowOrchestrationTools` - Array of workflow orchestration tool contracts
- `taskManagementTools` - Array of task management tool contracts
- `processMonitoringTools` - Array of process monitoring tool contracts
- `ToolErrorCode` - Enum of possible error codes
- `ToolValidationError` - Error class for validation failures
- `toolErrorResponseSchema` - Zod schema for error responses
- `createToolErrorResponse` - Helper function to create standardized error responses
- `orchestrationToolContracts` - Combined array of all orchestration tool contracts
