# MCP "Everything" Server - Development Guidelines

# brAInwav Cortex-OS Server Development Guidelines

## 🚨 CRITICAL: brAInwav Production Standards

**ABSOLUTE PROHIBITION**: NEVER claim any implementation is "production-ready", "complete", "operational", or "fully implemented" if it contains:
- `Math.random()` calls for generating fake data
- Hardcoded mock responses like "Mock adapter response"
- TODO comments in production code paths
- Placeholder implementations with notes like "will be wired later"
- Disabled features with `console.warn("not implemented")`
- Fake system metrics or data generation

**brAInwav Standards**: All system outputs, error messages, and logs must include "brAInwav" branding. Status claims must be verified against actual code implementation.

**Reference**: See `/Users/jamiecraik/.Cortex-OS/.cortex/rules/RULES_OF_AI.md` for complete production standards.

## 🔄 Agentic Coding Workflow for MCP Server Development

All MCP server development for brAInwav Cortex-OS must follow this structured 4-phase workflow:

### 0. Tasks

- **Operate on a task basis** - Each MCP server feature/tool/enhancement is a discrete task
- **Store intermediate context** in Markdown files in the `~/tasks` folder
- **Store all context** in the local memory MCP and/or REST API for persistence
- **Use semantic task ID slugs** - descriptive identifiers like `mcp-tool-validation` or `server-transport-optimization`

### 1. Research

- **Utilize semantic search** to identify existing MCP patterns within this codebase
- **Use Web-Search** to access MCP specification and best practices
- **Begin with follow-up questions** to establish MCP tool requirements
- **Report findings** in `[feature].research.md` within the tasks folder

**MCP Server Research Focus:**
- Existing MCP tool patterns and schemas
- Transport mechanisms (stdio, SSE, HTTP)
- Zod validation patterns for tool inputs
- Error handling and response formatting
- Server lifecycle and resource management

### 2. Planning

- **Read the research file** `[feature].research.md` from tasks folder
- **Develop a TDD plan** for MCP server development:
  - **Reuse existing patterns** - leverage MCP server utilities and schemas
  - **Separation of concerns** - isolate tool logic from transport concerns
  - **Single Responsibility Principle (SRP)** - one purpose per MCP tool
  - **Don't Repeat Yourself (DRY)** - share validation schemas and utilities
  - **Keep it Simple, Stupid (KISS)** - straightforward MCP tool implementations
  - **You Aren't Gonna Need It (YAGNI)** - implement only required MCP capabilities
  - **Encapsulation** - hide implementation details behind MCP interfaces
  - **Modularity** - loosely coupled MCP tools
  - **Open/Closed Principle** - extend via new tools and schemas
  - **Testability** - design for comprehensive MCP testing
  - **Principle of Least Astonishment (POLA)** - predictable MCP behavior
  - **Fail Fast** - validate MCP inputs with Zod schemas
  - **High Cohesion, Low Coupling** - related MCP functionality together
- **Write comprehensive plan** to `[feature]-tdd-plan.md` with MCP context

**MCP Planning Requirements:**
- Include brAInwav branding in all MCP tool outputs and errors
- Design proper Zod schemas for input validation
- Plan for multiple transport support (stdio, SSE)
- Consider resource cleanup and server shutdown
- Plan for comprehensive MCP tool testing

### 3. Implementation

- **Read the TDD plan** and implement with MCP best practices
- **Follow MCP specification** for tool contracts and responses
- **Implementation must be 100% deployable** with proper error handling
- **Include brAInwav branding** in all MCP tool outputs

**MCP Implementation Standards:**
- Use ES modules with `.js` extension in import paths
- Strict TypeScript typing for all functions and variables
- Zod schema patterns for tool input validation
- Async/await over callbacks and Promise chains
- Descriptive variable names indicating purpose
- Proper cleanup for timers and resources in server shutdown
- brAInwav branding in all tool responses and error messages

### 4. Verification

- **Verify MCP tools** work correctly with various transports
- **Test input validation** with edge cases and invalid inputs
- **Validate error handling** and proper MCP error responses
- **Check brAInwav branding** in all tool outputs
- **Test server lifecycle** including startup and shutdown
- **Update task status** to **"verified"** once complete
- **Store MCP insights** in local memory for future development

**MCP Verification Checklist:**
- [ ] All MCP tools functional with stdio and SSE transports
- [ ] Input validation working with Zod schemas
- [ ] Error responses follow MCP specification
- [ ] brAInwav branding present in tool outputs
- [ ] Server startup and shutdown working correctly
- [ ] Resource cleanup functioning properly
- [ ] Performance meets MCP requirements

## Build, Test & Run Commands
- Build: `npm run build` - Compiles TypeScript to JavaScript
- Watch mode: `npm run watch` - Watches for changes and rebuilds automatically
- Run server: `npm run start` - Starts the MCP server using stdio transport
- Run SSE server: `npm run start:sse` - Starts the MCP server with SSE transport
- Prepare release: `npm run prepare` - Builds the project for publishing

## Code Style Guidelines
- Use ES modules with `.js` extension in import paths
- Strictly type all functions and variables with TypeScript
- Follow zod schema patterns for tool input validation
- Prefer async/await over callbacks and Promise chains
- Place all imports at top of file, grouped by external then internal
- Use descriptive variable names that clearly indicate purpose
- Implement proper cleanup for timers and resources in server shutdown
- Follow camelCase for variables/functions, PascalCase for types/classes, UPPER_CASE for constants
- Handle errors with try/catch blocks and provide clear error messages
- Use consistent indentation (2 spaces) and trailing commas in multi-line objects

## Agent Toolkit

During development, use `agent-toolkit` scripts for code search, codemods, diff review and validation (`tools/run_validators.sh`).
