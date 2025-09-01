# CLI Comparison

| Project & Language | Key CLI Traits | Notable Differentiators / Potential Value |
| --- | --- | --- |
| Cortex CLI (TypeScript, commander) | Modular commands for MCP registry, A2A messaging, RAG pipelines, SimLab simulations, and TUI integration. Marketplace-aware MCP server addition with signature verification and transport flexibility | Existing focus on agent networking and evaluation; could gain interactive agent scaffolding or binary distribution insights from other projects. |
| OpenCode CLI (TypeScript, yargs, @clack/prompts) | Interactive agent creation with tool selection, mode presets, and YAML front‑matter generation. Rich ANSI‑styled UI helpers for status/log output | Provides lightweight UX for generating/configuring agents. Value: adopt similar prompt-based workflows or styled UI utilities for better developer experience. |
| OpenAI Codex CLI (Rust core + Node wrapper) | Node wrapper selects platform-specific binary and forwards signals for safe termination. Rust clap-driven multitool with subcommands for Exec, login/logout, MCP, protocol streaming, debug sandboxes, and patch apply | Demonstrates high-performance, sandboxed execution and rich subcommand ecosystem. Value: consider binary distribution for performance and sandbox tooling for security. |

## Latest Issues & PRs (Enhancement/Extension)

| Repo | Label | Items |
| --- | --- | --- |
| openai/codex | enhancement | Add Esc shortcut, custom prompts args, status-line customization, conversation dump/resume, project-scope MCP |
| openai/codex | extension | VS Code extension: conversation startup error, voice dictation, secondary sidebar view, SSH plugin task failure, truncated colon-prefixed output |
| sst/opencode | enhancement/extension | none found |
