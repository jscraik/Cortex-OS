AGENTS.md is the canonical authority for agent policy. All model guides MUST defer to AGENTS.md.

## 🔄 Agentic Coding Workflow for Gemini

Gemini agents must follow the 4-phase structured workflow defined in AGENTS.md:

### 0. Tasks - Use semantic task ID slugs, store context in ~/tasks and local memory

### 1. Research - Semantic search + web research → [feature].research.md  

### 2. Planning - TDD plan with software engineering principles → [feature]-tdd-plan.md

### 3. Implementation - Execute plan with brAInwav standards and 100% deployable code

### 4. Verification - Comprehensive testing and quality gates, update status to "verified"

See AGENTS.md for complete workflow specification.

## Agent Toolkit

Refer to `agent-toolkit/tools` for search, codemods, diff review and validation steps.

## Time Freshness Rules

See `_time-freshness.md` for timezone and date handling rules that all agents must follow.
