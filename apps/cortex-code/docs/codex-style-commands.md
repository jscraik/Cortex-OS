# Codex-Style Commands for Cortex Code

This document describes the new Codex-style slash commands that have been added to Cortex Code, providing developers with powerful AI-assisted coding capabilities directly in the terminal.

## Overview

Cortex Code now includes 13 new Codex-style slash commands that integrate with AI providers and MCP tools to deliver contextual assistance for common development tasks. These commands are accessible through both the input auto-completion system (typing `/` in the chat input) and the command palette (Ctrl+P).

## Available Commands

### 1. /explain - Explain Code

**Description**: Explain selected code or concept in plain English
**Parameters**:

- `code_selection` (optional): Selected code to explain
- `explanation_depth` (default: "detailed"): Level of detail (brief, detailed, comprehensive)
  **MCP Tool**: ai_code_explanation
  **Shortcut**: Ctrl+E

### 2. /refactor - Refactor Code

**Description**: Suggest code improvements for selected code
**Parameters**:

- `code_selection` (required): Selected code to refactor
- `refactoring_type` (default: "readability"): Type of refactoring (performance, readability, structure)
  **MCP Tool**: ai_code_refactoring
  **Shortcut**: Ctrl+R

### 3. /test - Generate Tests

**Description**: Generate unit tests for selected code
**Parameters**:

- `code_selection` (required): Selected code to test
- `test_framework` (default: "default"): Test framework to use
  **MCP Tool**: ai_test_generation
  **Shortcut**: Ctrl+T

### 4. /document - Document Code

**Description**: Create documentation for selected code
**Parameters**:

- `code_selection` (required): Selected code to document
- `documentation_format` (default: "auto"): Documentation format (JSDoc, RustDoc, etc.)
  **MCP Tool**: ai_documentation_generation
  **Shortcut**: Ctrl+D

### 5. /find - Find Code Patterns

**Description**: Search for code patterns in project
**Parameters**:

- `search_pattern` (required): Pattern to search for
- `file_types` (default: "all"): File types to search in
  **MCP Tool**: code_pattern_search
  **Shortcut**: Ctrl+F

### 6. /fix - Fix Code Issues

**Description**: Suggest bug fixes for error messages
**Parameters**:

- `error_message` (required): Error message to fix
- `code_context` (optional): Relevant code context
  **MCP Tool**: ai_bug_fixing
  **Shortcut**: Ctrl+X

### 7. /optimize - Optimize Code

**Description**: Optimize performance of selected code
**Parameters**:

- `code_selection` (required): Selected code to optimize
- `optimization_target` (default: "speed"): Optimization target (speed, memory, etc.)
  **MCP Tool**: ai_performance_optimization
  **Shortcut**: Ctrl+O

### 8. /security - Security Scan

**Description**: Scan selected code for vulnerabilities
**Parameters**:

- `code_selection` (required): Selected code to scan
- `scan_depth` (default: "deep"): Scan depth (shallow, deep, comprehensive)
  **MCP Tool**: ai_security_scanning
  **Shortcut**: Ctrl+S

### 9. /complexity - Analyze Complexity

**Description**: Analyze code complexity metrics
**Parameters**:

- `code_selection` (required): Selected code to analyze
- `metrics_type` (default: "cyclomatic"): Type of metrics (cyclomatic, cognitive, etc.)
  **MCP Tool**: code_complexity_analysis
  **Shortcut**: Ctrl+C

### 10. /dependencies - Analyze Dependencies

**Description**: Analyze project dependencies
**Parameters**:

- `dependency_type` (default: "all"): Type of dependencies (all, direct, transitive)
- `analysis_depth` (default: "deep"): Analysis depth (shallow, deep)
  **MCP Tool**: dependency_analysis
  **Shortcut**: Ctrl+Y

### 11. /review - Code Review

**Description**: Perform code review on selected code
**Parameters**:

- `code_selection` (required): Selected code to review
- `review_aspect` (default: "comprehensive"): Aspect to review (style, security, performance)
  **MCP Tool**: ai_code_review
  **Shortcut**: Ctrl+V

### 12. /suggest - AI Suggestions

**Description**: Get AI suggestions for improving code
**Parameters**:

- `code_selection` (optional): Selected code for suggestions
- `suggestion_type` (default: "all"): Type of suggestions (all, style, performance)
  **MCP Tool**: ai_suggestions
  **Shortcut**: Ctrl+U

### 13. /debug - Debug Code

**Description**: Help debug issues with code
**Parameters**:

- `error_message` (optional): Error message or issue description
- `code_context` (optional): Relevant code context
  **MCP Tool**: ai_debugging
  **Shortcut**: Ctrl+B

### 14. /model - Show Current Model

**Description**: Show the current AI model and provider
**Parameters**: None
**MCP Tool**: None
**Shortcut**: Ctrl+M M

### 15. /model switch - Switch AI Model

**Description**: Interactively switch between available AI models
**Parameters**: None
**MCP Tool**: None
**Shortcut**: Ctrl+M S

## Usage

### Through Input Auto-Completion

1. Type `/` in the chat input field
2. Start typing the command name (e.g., `/explain`)
3. Use arrow keys to select from the auto-complete suggestions
4. Press Enter to accept the command
5. Provide any required parameters when prompted

### Through Command Palette

1. Press Ctrl+P to open the command palette
2. Type the command name or browse the AI category
3. Select the command using arrow keys and press Enter
4. Provide any required parameters when prompted

## Integration with AI Providers

All commands integrate with the existing AI provider system through the ModelProvider trait, allowing them to work with:

- GitHub Copilot models
- OpenAI models
- Anthropic models
- Local MLX models

## Integration with MCP Tools

Each command is associated with a specific MCP tool that provides the specialized functionality. The MCP system allows for extensibility and customization of these tools.

## Context Awareness

The commands are designed to be context-aware, automatically detecting:

- Current file and project information
- Selected code snippets
- Project technology stack
- User preferences and history

## Security and Privacy

All commands follow privacy-first design principles:

- Code context is processed according to configured privacy levels
- No plaintext secret storage
- Secure handling of sensitive information
- Optional local processing for sensitive code

## Future Enhancements

Planned improvements include:

- Natural language command interpretation
- Command chaining and workflows
- Custom command creation
- AI-suggested commands based on context
- Voice command support

## Examples

### Explaining Code

```
/explain
// Then provide the code snippet when prompted
```

### Generating Tests

```
/test
// Then select the function to test when prompted
```

### Finding Code Patterns

```
/find error_handler
// Finds all instances of error_handler in the codebase
```

### Security Scanning

```
/security
// Then select the code to scan when prompted
```

### Viewing Current Model

```
/model
// Shows the current AI provider and model
```

### Switching Models

```
/model switch
// Interactively switch between available providers and models
```
