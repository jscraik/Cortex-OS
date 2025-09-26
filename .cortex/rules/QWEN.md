AGENTS.md is the canonical authority for agent policy. All model guides MUST defer to AGENTS.md.

## 🔄 Agentic Coding Workflow for Qwen

Qwen agents must follow the 4-phase structured workflow defined in AGENTS.md:

### 0. Tasks - Use semantic task ID slugs, store context in ~/tasks and local memory

### 1. Research - Semantic search + web research → [feature].research.md

### 2. Planning - TDD plan with software engineering principles → [feature]-tdd-plan.md

### 3. Implementation - Execute plan with brAInwav standards and 100% deployable code

### 4. Verification - Comprehensive testing and quality gates, update status to "verified"

See AGENTS.md for complete workflow specification.

## Time Freshness Rules

See `_time-freshness.md` for timezone and date handling rules that all agents must follow.

## Agent Context

For detailed context about working with Cortex-OS as an AI agent, refer to the main QWEN.md file in the repository root. This file contains comprehensive information about:

- Project overview and architecture
- Development environment setup
- Code quality standards and requirements
- Agent-specific guidelines and mandatory tooling
- Package structure and organization
- Quality gates and testing requirements
- Security practices and accessibility requirements
- Contributing workflow and anti-patterns to avoid

All agents must follow the guidelines in AGENTS.md, CODESTYLE.md, and RULES_OF_AI.md as the primary sources of truth for development practices.
