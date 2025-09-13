# RULES_OF_AI.md

## 🔧 Agent Toolkit (MANDATORY)

The `packages/agent-toolkit` provides a **unified, contract-driven interface** for all development  
operations. This toolkit is **REQUIRED** for maintaining monorepo uniformity and code quality.

### Core Integration Pattern

```typescript
import { createAgentToolkit } from '@cortex-os/agent-toolkit';

const toolkit = createAgentToolkit();
// Use TypeScript interface for programmatic access
await toolkit.multiSearch('pattern', './src');
await toolkit.validateProject(['*.ts', '*.py', '*.rs']);
```

### Shell Interface (Just Recipes)

- `just scout "pattern" path` - Multi-tool search (ripgrep + semgrep + ast-grep)
- `just codemod 'find(:[x])' 'replace(:[x])' path` - Structural modifications
- `just verify changed.txt` - Auto-validation based on file types

### When Agents MUST Use Agent-Toolkit

1. **Code Search Operations** - Instead of raw grep/rg commands
2. **Structural Modifications** - For any refactoring or codemod operations  
3. **Quality Validation** - Before commits, PRs, or code changes
4. **Cross-Language Tasks** - Unified interface for TypeScript/Python/Rust
5. **Pre-Commit Workflows** - Automated validation pipelines

### Architecture Compliance

Agent-toolkit follows Cortex-OS principles:

- **Contract-first**: Zod schemas ensure type safety
- **Event-driven**: A2A integration ready
- **MCP compatible**: Tool exposure for agent consumption
- **Layered design**: Clean domain/app/infra separation

---

## AI/Agent Rules and Guidelines

This document outlines the fundamental rules and guidelines for AI agents operating within the Cortex-OS ecosystem.

## 1. Primary Directive

The AI must prioritize human welfare and safety above all else, while respecting human autonomy and dignity.

## 2. Transparency Requirements

- All AI decision-making processes must be explainable and auditable
- Users must be informed when interacting with AI systems
- AI systems must not masquerade as humans without explicit disclosure

## 3. Privacy and Data Protection

- User data must be collected only with explicit consent
- Data minimization principles must be followed
- Strong encryption must protect all personal data
- Users must have the right to access, correct, and delete their data

## 4. Fairness and Non-Discrimination

- AI systems must not discriminate based on protected characteristics
- Regular bias auditing must be conducted
- Equal access to AI benefits must be ensured

## 5. Security and Robustness

- AI systems must be designed with security as a core principle
- Regular vulnerability assessments must be performed
- Systems must gracefully degrade when operating outside their capabilities

## 6. Human Oversight

- Critical decisions must involve meaningful human review
- AI systems must provide mechanisms for human intervention
- Clear lines of accountability must be established

## 7. Compliance with Law and Ethical Standards

- AI systems must comply with all applicable laws and regulations
- Ethical considerations must inform technical design decisions
- Regular ethical impact assessments must be conducted

## 8. Continuous Monitoring and Improvement

- AI systems must be continuously monitored for unintended consequences
- Feedback loops must enable ongoing improvement
- Incident response procedures must be established and tested

These rules form the foundation of responsible AI development and deployment in Cortex-OS.
