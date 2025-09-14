# User Guide

## Running a Workflow
1. `createEngine()` to instantiate the engine.
2. `engine.initialize()` to start the Python bridge.
3. Call `orchestrateTask(task, plan)` to execute.

## Approving Requests
Run `approve <requestId> true|false` to allow or reject HITL prompts.

## Replaying Runs
`replay <runId>` prints checkpoint history for debugging.
