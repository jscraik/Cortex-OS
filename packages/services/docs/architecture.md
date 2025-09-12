# Architecture

## Model Gateway
- **Fastify core** handles HTTP requests.
- **Provider adapters** abstract specific model APIs.
- **Zod schemas** validate request and response payloads.

## Orchestration Engine
- **DAG executor** runs steps in topological order.
- **Hook manager** exposes lifecycle events.
- **Compensation engine** rolls back failed steps.
- **Cancellation controller** supports timeouts and manual aborts.
