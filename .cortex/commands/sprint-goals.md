---
name: sprint-goals
description: Outline upcoming sprint objectives, dependencies, and validation requirements for brAInwav Cortex-OS teams.
argument-hint: optional squad name
model: inherit
allowed-tools:
  - Fs.read(docs/roadmap/**)
  - Fs.read(project-documentation/**)
---
# brAInwav Sprint Goals $ARGUMENTS

## Objectives
- Describe the top three deliverables and acceptance criteria.

## Dependencies
- Cross-team dependencies with owners and timelines.

## Validation
- Required test suites: pnpm test:smart --focus <projects>
- Observability gates: mention perf or telemetry tasks.

## Risks
- Highlight blockers and mitigation plans.
