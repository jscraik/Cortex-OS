# Project Structure

Understanding the Cortex-OS codebase organization and architecture.

## Repository Layout

```text
Cortex-OS/
├── apps/                    # Applications & Entry Points
│   ├── cortex-os/          # Main ASBR runtime
│   ├── cortex-cli/         # Command line interface
│   ├── cortex-webui/       # Web interface
│   └── cortex-code/        # Terminal UI (Rust)
├── packages/               # Feature Packages
│   ├── a2a/               # Agent-to-Agent communication
│   ├── agents/            # Agent implementations
│   ├── mcp/               # Model Context Protocol tools
│   ├── memories/          # State management
│   ├── orchestration/     # Multi-agent coordination
│   └── rag/               # Retrieval Augmented Generation
├── libs/                  # Shared Libraries
│   ├── typescript/        # TypeScript utilities & contracts
│   └── python/           # Python integrations
├── docs/                 # Documentation
├── .cortex/             # Governance & Rules
└── scripts/             # Development & deployment scripts
```

## Core Principles

1. **Governed Monorepo** – Strict import boundaries enforced via ESLint + Nx
2. **Event-Driven Interactions** – Agent-to-agent (A2A) bus for async workflows
3. **Contract-First Design** – Shared schemas/types in `libs/typescript/contracts`
4. **Separation of Concerns** – No direct feature-package cross-imports
5. **Security by Default** – OWASP + LLM security scanning integrated into CI

## Package Categories

| Category           | Purpose                 | Examples                                                 |
| ------------------ | ----------------------- | -------------------------------------------------------- |
| Applications       | Entry points & UX       | `cortex-os`, `cortex-webui`, `cortex-code`, `cortex-cli` |
| Communication      | Messaging + tool bridge | `a2a`, `mcp`, `orchestration`                            |
| Intelligence       | AI / reasoning          | `agents`, `rag`                                          |
| Data & State       | Persistence & retrieval | `memories`, `registry`                                   |
| Security & Quality | Hardening + simulation  | `security`, `simlab`                                     |
| Governance         | Structural enforcement  | `.cortex/`, root configs                                 |

## Configuration Files

- `package.json` - Root workspace configuration
- `turbo.json` - Build pipeline and caching
- `nx.json` - Nx workspace configuration
- `tsconfig.json` - TypeScript configuration
- `.cortex/rules/` - Governance and validation rules

## Development Workflow

```bash
# Development commands
pnpm dev                # Start all services
pnpm build             # Build all packages
pnpm test              # Run test suite
pnpm lint              # Code quality checks
pnpm format            # Auto-format code
```

## Next Steps

- [Quick Start](./quick-start) - Start building
- [Architecture Overview](../architecture/overview) - Deep dive into design
