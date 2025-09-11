# Architecture

The library exposes a set of Zod schemas grouped by domain.

- `MessageEnvelopeSchema` wraps every payload with id, kind, timestamp, and meta.
- `AgentConfigSchema` defines resource limits for agents.
- `ErrorResponseSchema` standardizes error reporting.
- Domain schemas: `A2AMessageSchema`, `MCPRequestSchema`, `RAGQuerySchema`, `SimlabCommandSchema`.

These modules live in `src/index.ts` and compile to `dist/index.js` using TypeScript.
