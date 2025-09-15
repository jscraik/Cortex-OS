# TDD Coach MCP Plugin

The TDD Coach plugin integrates the TDD Coach functionality into the Python-based MCP hub, allowing AI systems to access TDD-related tools through the Model Context Protocol.

## Overview

This plugin exposes 5 TDD Coach tools:

1. `analyze_test_coverage` - Analyze test coverage and provide insights
2. `generate_test` - Generate test cases for source code
3. `refactor_test` - Refactor existing tests for better quality
4. `validate_tdd_flow` - Validate TDD red-green-refactor cycle
5. `coach_recommendation` - Get TDD coaching recommendations

## Installation

The plugin requires the TDD Coach Node.js package to be available. Make sure you have the TDD Coach package installed and configured:

```bash
cd /Users/jamiecraik/.Cortex-OS/packages/tdd-coach
npm install
```

## Configuration

The plugin can be configured with the following options:

- `tdd_coach_path`: Path to the TDD Coach package (default: `/Users/jamiecraik/.Cortex-OS/packages/tdd-coach`)

## Usage

The plugin automatically starts the TDD Coach MCP server on port 8007 when initialized. The server exposes the following endpoints:

- `/health` - Health check endpoint
- `/tools/list` - List available tools
- `/tools/call` - Call a specific tool

## Tools

### analyze_test_coverage

Analyze test coverage and provide insights.

Parameters:

- `targetPath` (string, required): Path to analyze
- `includeThreshold` (boolean, default: true): Include threshold information
- `format` (string, enum: summary, detailed, json, default: summary): Output format

### generate_test

Generate test cases for source code.

Parameters:

- `sourceFile` (string, required): Source file to generate tests for
- `testType` (string, enum: unit, integration, e2e, default: unit): Type of tests to generate
- `framework` (string, enum: vitest, jest, mocha, cypress, optional): Test framework to use
- `includeEdgeCases` (boolean, default: true): Include edge cases in generated tests

### refactor_test

Refactor existing tests for better quality.

Parameters:

- `testFile` (string, required): Test file to refactor
- `improvements` (array of strings, required): Improvements to apply (readability, performance, maintainability, coverage)
- `preserveExisting` (boolean, default: true): Preserve existing test behavior

### validate_tdd_flow

Validate TDD red-green-refactor cycle.

Parameters:

- `sessionId` (string, required): Session identifier
- `currentPhase` (string, enum: red, green, refactor, required): Current TDD phase
- `files` (array of strings, required): Files involved in the change

### coach_recommendation

Get TDD coaching recommendations.

Parameters:

- `codebase` (string, required): Codebase to analyze
- `testStrategy` (string, enum: tdd, bdd, mixed, optional): Test strategy to recommend
- `experience` (string, enum: beginner, intermediate, advanced, default: intermediate): Developer experience level

## Integration

The plugin integrates with the MCP hub by registering the TDD Coach tools. When a tool is called, the plugin makes an HTTP request to the TDD Coach MCP server and returns the result.
