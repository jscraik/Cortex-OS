# GEMINI.md - brAInwav Cortex-OS Development Guide

## 🏛️ GOVERNANCE: brAInwav Project Structure Standards

**CRITICAL**: This repository operates under strict governance standards for file organization and architectural integrity. Only approved, comprehensive documentation belongs at the repository root level per brAInwav development policies.

### Root-Level File Governance

- **Authoritative Agent Instructions**: Complete, comprehensive instruction files (AGENTS.md, CLAUDE.md, QWEN.md, GEMINI.md) at root
- **Foundation Standards**: Core project documents (CODESTYLE.md, README.md, CHANGELOG.md) belong at root level
- **Structure Guard Enforcement**: Automated validation of root entries against approved `allowedRootEntries` governance list
- **brAInwav Identity**: All root documentation must maintain brAInwav branding and organizational standards

**Gemini Agent Compliance**: When creating, modifying, or suggesting file placement, ensure adherence to governance standards. Specialized configurations, partial documents, and working files belong in appropriate subdirectories (`.cortex/rules/`, `config/`, package-specific `/docs`).

---

## 🚨 CRITICAL: brAInwav Production Standards

**ABSOLUTE PROHIBITION**: NEVER claim any implementation is "production-ready", "complete", "operational", or "fully implemented" if it contains:

- `Math.random()` calls for generating fake data
- Hardcoded mock responses like "Mock adapter response - adapters not yet implemented"
- TODO comments in production code paths
- Placeholder implementations with notes like "will be wired later"
- Disabled features with `console.warn("not implemented")`
- Fake system metrics or thermal data

**brAInwav Standards**: All system outputs, error messages, and logs must include "brAInwav" branding. Status claims must be verified against actual code implementation.

**Reference**: See `/Users/jamiecraik/.Cortex-OS/.cortex/rules/RULES_OF_AI.md` for complete production standards.

## 🔄 Agentic Coding Workflow

All Gemini agents working on brAInwav Cortex-OS must follow this structured 5-phase workflow:

### 0. Tasks

- **Operate on a task basis** - Each feature/bugfix/enhancement is a discrete task
- **Store intermediate context** in Markdown files in the `~/tasks` folder
- **Store all context** in the local memory MCP and/or REST API for persistence
- **Use semantic task ID slugs** - descriptive identifiers like `gemini-agent-optimization` or `ai-workflow-enhancement`

### 1. Research

- **Utilize semantic search** to identify existing patterns within this codebase
- **Use Web-Search** to access the internet for the most relevant and up-to-date information
- **Begin with follow-up questions** to establish the direction of the research
- **Report findings** in `[feature].research.md` within the tasks folder

**Gemini-Specific Research Focus:**

- Google AI integration patterns and best practices
- Multi-modal AI capabilities and implementation strategies
- Performance optimization for large language model inference
- Integration with existing Cortex-OS AI agent framework
- brAInwav-specific AI workflow requirements

### 2. Planning

- **Read the research file** `[feature].research.md` from tasks folder
- **Develop a TDD plan** based on software engineering principles:
  - **Reuse existing patterns** - leverage Cortex-OS AI agent architecture
  - **Separation of concerns** - maintain clear domain/app/infra boundaries
  - **Single Responsibility Principle (SRP)** - maximum 40 lines per function
  - **Don't Repeat Yourself (DRY)** - use shared AI utilities and patterns
  - **Keep it Simple, Stupid (KISS)** - avoid unnecessary AI complexity
  - **You Aren't Gonna Need It (YAGNI)** - implement only required AI capabilities
  - **Encapsulation** - hide AI model implementation details
  - **Modularity** - loosely coupled AI agent components
  - **Open/Closed Principle** - extend AI capabilities via configuration
  - **Testability** - design for deterministic AI agent testing
  - **Principle of Least Astonishment (POLA)** - predictable AI behavior
  - **Fail Fast** - validate AI inputs and outputs early
  - **High Cohesion, Low Coupling** - related AI functions together, minimal dependencies
- **Ask clarifying questions** if needed to ensure clear understanding of AI requirements
- **Write comprehensive plan** to `[feature]-tdd-plan.md` with all AI integration context
- **Create implementation checklist**: Develop specific, trackable checklist items that break down the TDD plan for systematic execution in Phase 3

**Gemini Planning Requirements:**

- Include brAInwav branding in all AI outputs and error messages
- Plan for multi-modal AI capabilities where applicable
- Design for performance optimization and resource efficiency
- Consider integration with existing MCP and A2A frameworks
- Plan for comprehensive AI agent testing and validation

### 3. Implementation

- **Read the TDD plan** `[feature]-tdd-plan.md` and create a to-do list
- **Execute the plan** systematically with strict TDD approach (red-green-refactor)
- **Go for as long as possible** - group ambiguous questions for the end
- **Implementation must be 100% deployable** unless explicitly stated otherwise
- **Follow brAInwav coding standards** and Cortex-OS architectural patterns
- **Update implementation checklist**: Mark completed tasks as you progress through the AI implementation plan

**Gemini Implementation Standards:**

- Include brAInwav branding in all AI-generated outputs and error messages
- Follow CODESTYLE.md requirements (named exports, ≤40 lines, async/await)
- Implement comprehensive error handling for AI operations
- Use proper TypeScript typing and Zod validation for AI inputs/outputs
- Integrate with existing agent toolkit and MCP frameworks
- Ensure deterministic behavior for AI agent testing

### 4. Verification

- **Verify requirements** are met and AI implementation is bug-free
- **Run comprehensive quality gates** including AI-specific testing
- **Validate AI performance** and resource usage
- **Check brAInwav branding** is included in all AI outputs
- **Test multi-modal capabilities** where applicable
- **Return to implementation** if issues arise and make necessary adjustments
- **Update task status** to **"verified"** once complete
- **Store AI insights** in local memory for future Gemini development

### 5. Archive

- **Archive completed TDD plan**: Move `[feature]-tdd-plan.md` and AI-specific documentation to appropriate locations:
  - AI agent documentation: `packages/agents/docs/` or `apps/cortex-os/docs/`
  - System-wide AI architecture: root `docs/` or `project-documentation/`
  - Gemini-specific configurations: relevant package `docs/` directories
- **Update AI documentation**: Ensure all AI performance reports, multi-modal capability documentation, and brAInwav AI integration notes are properly placed
- **MANDATORY: Update change documentation**:
  - **CHANGELOG.md**: Add entry documenting what was completed, files changed, and impact
  - **README.md**: Update relevant sections if new features or significant changes were made
  - **Website documentation**: Update `/Users/jamiecraik/.Cortex-OS/website/README.md` for user-facing changes
- **Complete AI implementation checklist**: Mark all remaining AI-specific checklist items as complete and archive in local memory
- **AI knowledge preservation**: Store comprehensive AI task summary including Gemini-specific optimizations, performance metrics, brAInwav AI integration patterns, and lessons learned for future AI agent development

**Gemini Verification Checklist:**

- [ ] All AI functionality tested with deterministic inputs
- [ ] Performance benchmarks meet requirements
- [ ] brAInwav branding present in all AI outputs
- [ ] Multi-modal capabilities working as expected
- [ ] Error handling robust for AI edge cases
- [ ] Integration with Cortex-OS frameworks validated
- [ ] Documentation updated to reflect AI capabilities

## Project Overview

Cortex-OS is a production-ready **Autonomous Software Behavior Reasoning (ASBR) Runtime** that enables AI agents to collaborate through event-driven architecture and Model Context Protocol (MCP) integrations. This is a governed monorepo with strict architectural boundaries and comprehensive quality gates.

### Key AI Integration Points

- **AI Agents**: Multi-modal agent coordination via A2A events
- **LangGraph Integration**: Workflow orchestration with AI decision nodes
- **MCP Tools**: Standardized AI tool integration and validation
- **Performance Optimization**: Efficient AI inference with resource management
- **brAInwav Branding**: Consistent company identity in all AI outputs

## Development Environment

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 10.3.0
- Python ≥ 3.11 with uv
- Rust (for CLI/TUI components)
- Access to Gemini AI APIs (where applicable)

### Setup

```bash
# Clone and setup
git clone https://github.com/cortex-os/cortex-os.git
cd cortex-os

# Automated setup (installs deps, sets up hooks, validates structure)
./scripts/dev-setup.sh

# Verify installation
pnpm readiness:check
```

### Core Development Commands

```bash
# Build affected projects only (preferred)
pnpm build:smart

# Run tests with smart affected detection
pnpm test:smart

# Lint with smart affected detection
pnpm lint:smart

# Type checking with smart affected detection
pnpm typecheck:smart

# Run security scans
pnpm security:scan

# Validate structure and governance
pnpm structure:validate
```

## AI-Specific Quality Standards

### Gemini Integration Requirements

1. **Deterministic Testing**: All AI functionality must be testable with reproducible results
2. **Performance Monitoring**: Track AI inference latency and resource usage
3. **Error Resilience**: Robust error handling for AI service failures
4. **Multi-modal Support**: Leverage Gemini's text, image, and video capabilities where applicable
5. **brAInwav Context**: Include company branding in all AI-generated content

### AI Development Patterns

```typescript
// Example Gemini agent integration
import { createGeminiAgent } from '@cortex-os/ai-agents';

const geminiAgent = createGeminiAgent({
  model: 'gemini-pro',
  branding: {
    company: 'brAInwav',
    context: 'Cortex-OS AI Assistant'
  },
  capabilities: ['text-generation', 'code-analysis', 'multi-modal'],
  validation: {
    inputSchema: InputSchema,
    outputSchema: OutputSchema
  }
});
```

## Anti-Patterns to Avoid

1. **Non-deterministic AI behavior** in testing environments
2. **Missing brAInwav branding** in AI-generated outputs
3. **Unvalidated AI inputs/outputs** without proper schema validation
4. **Resource-intensive AI operations** without proper optimization
5. **AI functionality without fallback mechanisms** for service failures

## Memory Management & Context

### AI Context Storage

```typescript
// Store AI-specific insights in local memory
await memory.store({
  content: 'Gemini multi-modal integration optimized for performance',
  importance: 9,
  tags: ['ai', 'gemini', 'optimization', 'brainwav'],
  domain: 'ai-development',
  metadata: {
    modelVersion: 'gemini-pro-1.5',
    performanceGains: '40% latency reduction',
    capabilitiesAdded: ['image-analysis', 'code-generation']
  }
});
```

## Authority Hierarchy

When conflicts arise, follow this precedence order:

1. `.cortex/rules/RULES_OF_AI.md` - AI behavior governance
2. `AGENTS.md` - Developer workflow rules
3. This `GEMINI.md` file
4. `.cortex/rules/GEMINI.md` - Gemini-specific guidelines
5. Individual package documentation

Always escalate ambiguities via PR description comments rather than making assumptions.

## Phase 6: Reality Filter

Ensure you update the instructional documentation and README.md

**NEW**

# Reality Filter –

- [ ] Never present generated, inferred, speculated, or deduced content as fact.

- [ ] If you cannot verify something directly, say:  
  - "I cannot verify this."
  - "I do not have access to that information."
  - "My knowledge base does not contain that."

- [ ] Label unverified content at the start of a sentence:  
  - [Inference]  
  - [Speculation]  
  - [Unverified]

- [ ] Ask for clarification if information is missing. Do not guess or fill gaps.

- [ ] If any part is unverified, label the entire response.

- [ ] Do not paraphrase or reinterpret input unless requested.

- [ ] Label claims with these words unless sourced:  
  - Prevent, Guarantee, Will never, Fixes, Eliminates, Ensures that

- [ ] For LLM-behavior claims (including yourself), include:  
  - [Inference] or [Unverified], with a note that it's based on observed patterns

- [ ] If directive is broken, say:  
  > Correction: I previously made an unverified claim. That was incorrect and should have been labeled.

- [ ] Never override or alter input unless asked.

---

**Maintained by: brAInwav Development Team**
