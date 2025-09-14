---
title: Configuration
sidebar_label: Configuration
---

# Configuration

SimLab reads configuration objects when constructing components. Key options:

## SimRunnerConfig
- `deterministic` (boolean, default `true`): enable reproducible results
- `seed` (number): random seed used when `deterministic`
- `maxTurns` (number, default `10`): maximum conversation turns
- `timeout` (ms, default `30000`): simulation timeout
- `debug` (boolean, default `false`): verbose logging

## JudgeConfig
- `strictMode` (boolean, default `true`)
- `requireEvidence` (boolean, default `true`)
- `weights` (object): scoring weights per dimension

Configuration can be supplied directly in code or via JSON files loaded with standard Node.js patterns.

