# Orchestration MCP Tool Contracts

The orchestration package exposes workflow coordination capabilities over the Model Context Protocol (MCP) using a contract-first
approach. Each tool definition includes a Zod input schema, typed result schema, documented error codes, and runtime validation
that surfaces consistent error responses for consuming agents.

## Error Response Format

All orchestration MCP tools emit structured error objects using the shared schema defined in `src/mcp/tools.ts`:

| Field | Type | Notes |
| --- | --- | --- |
| `code` | `validation_error \| workflow_not_found \| task_not_found \| task_conflict \| monitoring_unavailable \| internal_error` | Enumerated `ToolErrorCode` values |
| `message` | `string` | Human-readable explanation |
| `details` | `string[]` | Optional validation details, capped at 10 entries |
| `retryable` | `boolean` | Indicates whether the caller can safely retry |
| `timestamp` | `string (ISO 8601)` | Automatically populated when the error is created |

## Workflow Orchestration Tools

| Tool | Description | Key Input Fields | Result Snapshot | Error Codes |
| --- | --- | --- | --- | --- |
| `workflow.plan` | Decomposes a goal into phases and executable tasks. | `workflowName`, `goal`, `preferredStrategy`, `tasks[]` | Plan metadata containing phases, tasks, and estimated durations. | `validation_error`, `workflow_not_found`, `internal_error` |
| `workflow.start` | Starts execution for an existing workflow plan. | `planId`, `workflowId?`, `parameters`, `options` | Identifiers for the run plus initial status and timing estimates. | `validation_error`, `workflow_not_found`, `internal_error` |
| `workflow.review` | Captures human feedback during an active run. | `workflowId`, `runId`, `feedback[]`, `metrics` | Updated workflow status and recommended actions. | `validation_error`, `workflow_not_found`, `internal_error` |

## Task Management Tools

| Tool | Description | Key Input Fields | Result Snapshot | Error Codes |
| --- | --- | --- | --- | --- |
| `task.create` | Registers a new orchestration task with metadata. | `title`, `summary`, `priority`, `dependencies?` | New task identifier and initial status. | `validation_error`, `internal_error` |
| `task.update_status` | Applies progress updates and audit metadata. | `taskId`, `status`, `progress?`, `audit?` | Updated status plus normalized progress payload. | `validation_error`, `task_not_found`, `task_conflict`, `internal_error` |
| `task.assign` | Binds an orchestration task to an agent role. | `taskId`, `agentId`, `role`, `estimatedDurationMinutes?` | Assignment echo showing agent and timestamp. | `validation_error`, `task_not_found`, `internal_error` |

## Process Monitoring Tools

| Tool | Description | Key Input Fields | Result Snapshot | Error Codes |
| --- | --- | --- | --- | --- |
| `process.get_status` | Returns the live status, metrics, and active tasks for a workflow run. | `workflowId`, `includeTimeline?`, `includeMetrics?` | Progress metrics, risk level, active task roster, optional timeline. | `validation_error`, `workflow_not_found`, `monitoring_unavailable`, `internal_error` |
| `process.stream_events` | Streams chronological workflow lifecycle events. | `workflowId`, `since?`, `limit?` | Array of timestamped event payloads. | `validation_error`, `workflow_not_found`, `monitoring_unavailable` |
| `process.record_signal` | Records heartbeats, checkpoints, or anomaly signals. | `workflowId`, `signalType`, `detail`, `timestamp?` | Echo of the recorded signal with timestamp. | `validation_error`, `workflow_not_found`, `internal_error` |

## Validation Helpers

Tool contracts expose a `validateInput` helper that parses unknown payloads through the respective Zod schema and throws a
`ToolValidationError` with a structured error response when validation fails. Consumers attaching MCP handlers can safely call
`validateInput` prior to executing business logic to ensure consistent error semantics.
