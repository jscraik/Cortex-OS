# Cortex-OS System Architecture

```mermaid
graph TB
    subgraph "Cortex-OS Architecture"
        ASBR[ASBR Runtime<br/>apps/cortex-os/]

        subgraph "Feature Packages"
            AGENTS[Agents<br/>packages/agents/]
            MVP[MVP Components<br/>packages/mvp/]
            WEB[Web Interface<br/>packages/web/]
        end

        subgraph "Shared Services"
            A2A[A2A Bus<br/>packages/a2a/]
            MCP[MCP Tools<br/>packages/mcp/]
            MEM[Memories<br/>packages/memories/]
            ORCH[Orchestration<br/>packages/orchestration/]
        end

        subgraph "Contracts & Types"
            CONTRACTS[Contracts<br/>libs/typescript/contracts/]
            UTILS[Utils<br/>libs/typescript/utils/]
        end

        subgraph "External Systems"
            GITHUB[GitHub API]
            OPENAI[OpenAI API]
            CLAUDE[Claude API]
            DATABASE[(Database)]
        end
    end

    %% Main connections
    ASBR --> AGENTS
    ASBR --> MVP
    ASBR --> WEB

    %% Service connections
    AGENTS --> A2A
    MVP --> A2A
    WEB --> A2A

    AGENTS --> MCP
    MVP --> MCP

    AGENTS --> MEM
    MVP --> MEM

    ORCH --> A2A
    ORCH --> MCP
    ORCH --> MEM

    %% Contract usage
    AGENTS -.-> CONTRACTS
    MVP -.-> CONTRACTS
    A2A -.-> CONTRACTS
    MCP -.-> CONTRACTS

    AGENTS -.-> UTILS
    MVP -.-> UTILS

    %% External connections
    MCP --> GITHUB
    MCP --> OPENAI
    MCP --> CLAUDE
    MEM --> DATABASE

    %% Styling
    classDef runtime fill:#ff6b6b,stroke:#c0392b,stroke-width:2px,color:#fff
    classDef feature fill:#3498db,stroke:#2980b9,stroke-width:2px,color:#fff
    classDef service fill:#2ecc71,stroke:#27ae60,stroke-width:2px,color:#fff
    classDef contract fill:#f39c12,stroke:#e67e22,stroke-width:2px,color:#fff
    classDef external fill:#9b59b6,stroke:#8e44ad,stroke-width:2px,color:#fff

    class ASBR runtime
    class AGENTS,MVP,WEB feature
    class A2A,MCP,MEM,ORCH service
    class CONTRACTS,UTILS contract
    class GITHUB,OPENAI,CLAUDE,DATABASE external
```

## System Overview

This diagram shows the high-level architecture of the Cortex-OS system:

### Core Components

1. **ASBR Runtime** - The main application coordinator that mounts feature packages
2. **Feature Packages** - Domain-specific functionality (agents, MVP components, web interface)
3. **Shared Services** - Cross-cutting concerns (messaging, tools, memory, orchestration)
4. **Contracts & Types** - Shared interfaces and utilities
5. **External Systems** - Third-party APIs and storage

### Communication Patterns

- **Solid arrows**: Direct dependencies and service calls
- **Dotted arrows**: Contract/interface usage
- **No direct feature-to-feature connections**: Features communicate via A2A events or shared services

### Key Principles

- Domain separation through message contracts
- No direct imports between feature packages
- Dependency injection via ASBR runtime
- Event-driven architecture via A2A bus
