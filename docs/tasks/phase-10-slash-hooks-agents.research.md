# phase-10-slash-hooks-agents.research.md

## Research Objective

Map the current slash-command, hook, agent-template, and kernel-tool subsystems to
identify what is already implemented and what gaps block Phase 10 of the LangGraph
integration plan.

## Existing Code Paths

- `packages/commands/src/loader.ts` already loads Markdown commands from both project
  (`.cortex/commands/**`) and user scopes with project overrides. Metadata includes `model`
  and `allowed-tools` but there is no integration test ensuring built-in commands
  short-circuit.
- `packages/commands/src/builtins.ts` exposes `/help`, `/agents`, `/model`, and `/compact`
  along with other built-ins. There is no end-to-end runner test executing these commands
  through the parser → loader → runner pipeline.
- `packages/hooks/src/loaders.ts` merges YAML/JSON configs from user then project
  directories with precedence, but the test suite lacks filesystem-level coverage
  validating hot reload behaviour.
- `packages/agents/src` contains LangGraph agent definitions but no loader that translates
  `.cortex/agents/**` templates into runtime-ready subgraphs.
- `packages/kernel/src/tools` currently exposes individual tool helpers, yet there is no
  consolidated `bindKernelTools()` entry point to stitch shell, filesystem, and fetch tool
  adapters with allow-lists and timeouts.

## Observations

- Precedence rules exist for commands and hooks but need regression tests and orchestration metadata propagation.
- Agent template loading requires new implementation to compile YAML/JSON specs into LangGraph subgraphs with deterministic validation.
- Kernel tool binding must surface brAInwav-branded error handling and respect security policies before LangGraph nodes can trust the bound surface.
- No current Vitest suites cover `/help`, `/agents`, `/model`, `/compact`, so we need
  integration tests that exercise slash parsing, built-ins, and metadata propagation.

## Risks & Considerations

- Tests must avoid `Math.random()` usage; rely on deterministic stubs and `crypto.randomUUID()` which runner already uses.
- File-system watchers or hot reload should use temporary directories during tests to avoid modifying developer environments.
- Tool binding must remain within 40-line function rule; consider helper utilities if configuration grows.
- All logs and errors introduced need `brAInwav` branding per production standards.
