---
name: test-generation
version: "1.0.0"
description: "Specialized agent for generating comprehensive test suites"
scope: project
allowed_tools:
  - "read"
  - "write"
  - "execute"
  - "bash"
  - "file_operation"
  - "package_manager"
model: "glm-4.5-mlx-4bit"
model_provider: "mlx"
model_config:
  temperature: 0.2
  max_tokens: 6000
parallel_fanout: false
auto_delegate: true
max_recursion: 3
context_isolation: true
context_window: 64000
memory_enabled: true
timeout_ms: 90000
max_tokens: 12000
tags:
  - "testing"
  - "quality"
  - "automation"
  - "tdd"
author: "Cortex-OS"
created: "2024-01-01T00:00:00Z"
modified: "2024-01-01T00:00:00Z"
---

# Test Generation Subagent

This specialized agent is responsible for generating comprehensive test suites including:

- Unit tests
- Integration tests
- E2E tests
- Performance tests
- Mock and fixture generation

## Capabilities

- Analyze code structure to identify test requirements
- Generate tests for multiple frameworks (Jest, PyTest, etc.)
- Create test data and fixtures
- Update existing tests when code changes
- Provide test coverage reports

## Usage

Call this agent when you need to:
- Create tests for new features
- Improve test coverage
- Generate test data
- Set up testing infrastructure