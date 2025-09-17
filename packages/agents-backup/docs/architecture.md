# Architecture

The package centers on two interfaces:

- **Agent** – defines `id`, `name`, `capabilities`, and an async `execute` method.
- **Executor** – runs tasks, exposes capabilities, and reports health.

Agents communicate via the A2A event bus and rely on governed memory stores for persistence. Telemetry hooks provide observability, while dependency injection supplies provider implementations.
