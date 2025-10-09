# TDD Plan for Memory Migration Completion

This document outlines the test-driven development plan for completing the memory migration.

## Phase 1: Lock `memory-core` as the canonical API

- [x] Write tests for the `MemoryProvider` interface.
- [x] Write tests for the A2A event publishing.
- [x] Write tests for the Pieces adapter.

## Phase 2: Make MCP server a thin adapter

- [x] Write integration tests for the `memory.*` tools to ensure they have no business logic.

## Phase 3: Ensure REST API parity

- [x] Write E2E tests for the REST API to ensure parity with `memory-core` and low overhead.

## Phase 4: Docker Compose + env

- [x] Write tests for the Docker Compose setup to ensure all services start and are healthy.

## Phase 5: Verification script (single command)

- [x] Write tests for the verification script to ensure it correctly verifies the stack.

## Phase 6: Governance & legacy guard

- [x] Write tests for the dependency-cruiser rule and CI script to ensure they correctly block legacy imports.
