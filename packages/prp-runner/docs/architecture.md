# Architecture

PRP Runner is composed of:

- **Orchestrator** – schedules neuron execution and maintains state.
- **Neurons** – pluggable modules that perform atomic tasks.
- **Adapters** – bridge to external models such as Ollama or MLX.
- **Enforcement Hooks** – validate inputs and outputs before execution.

The runner exposes TypeScript APIs in `src/` for extension.
