# SimLab - Simulation Harness for Cortex-OS

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

SimLab is an internal simulation and testing framework for evaluating Cortex-OS agent interactions. It provides deterministic, local-first simulation capabilities with comprehensive judging and reporting.

## Features

- **Deterministic Simulations**: Reproducible test runs with seeded randomness
- **Local-First**: No external dependencies or cloud services required
- **Comprehensive Evaluation**: Multi-dimensional scoring (goal, SOP, brand, factual)
- **Policy Enforcement**: Evidence-based gating and quality controls
- **CI Integration**: Automated quality gates for pull requests

## Architecture

SimLab consists of four main components:

1. **SimRunner**: Orchestrates the simulation triad (user-sim, agent-adapter, judge)
2. **UserSimulator**: Generates realistic user interactions based on personas
3. **AgentAdapter**: Interfaces with Cortex-OS PRP (Plan-Reason-Perform) system
4. **Judge**: Evaluates conversations against scenarios and SOPs

## Quick Start

```typescript
import { SimRunner } from '@cortex-os/simlab';
import type { SimScenario } from '@cortex-os/schemas';

// Define a scenario
const scenario: SimScenario = {
  id: 'help-basic-001',
  goal: 'User needs help with basic account setup',
  persona: {
    locale: 'en-US',
    tone: 'friendly',
    tech_fluency: 'low',
  },
  initial_context: {},
  sop_refs: ['customer-support-basics'],
  kb_refs: ['account-setup-guide'],
  success_criteria: ['account created', 'user confirmed understanding'],
};

// Run simulation
const runner = new SimRunner({ deterministic: true, seed: 12345 });
const result = await runner.runScenario(scenario);

console.log(`Passed: ${result.passed}`);
console.log(`Goal Score: ${result.scores.goal * 100}%`);
console.log(`Judge Notes: ${result.judgeNotes}`);
```

## Configuration

### SimRunnerConfig

- `deterministic`: Enable reproducible results (default: true)
- `seed`: Random seed for deterministic runs
- `maxTurns`: Maximum conversation turns (default: 10)
- `timeout`: Simulation timeout in ms (default: 30000)
- `debug`: Enable debug logging (default: false)

### JudgeConfig

- `strictMode`: Enable strict evaluation (default: true)
- `requireEvidence`: Require evidence in agent responses (default: true)
- `weights`: Scoring weights for each dimension

## Quality Gates

SimLab enforces quality gates to ensure agent performance:

- **Pass Rate**: ≥90% for critical scenarios
- **Evidence Requirement**: All responses must include supporting evidence
- **SOP Compliance**: Zero tolerance for Standard Operating Procedure violations
- **Critical Failures**: Zero P0 failures allowed

## CLI Commands

```bash
# Run smoke test suite (50-100 scenarios)
pnpm simlab:smoke

# Generate comprehensive report
pnpm simlab:report

# View simulation status and metrics
pnpm sim:status
```

## Scenario Structure

Scenarios are defined using the `SimScenario` type:

```typescript
interface SimScenario {
  id: string;
  goal: string;
  persona: {
    locale: string;
    tone: string;
    tech_fluency: 'low' | 'med' | 'high';
  };
  initial_context: Record<string, unknown>;
  sop_refs: string[];
  kb_refs: string[];
  success_criteria: string[];
  variants?: number;
}
```

## Evaluation Dimensions

The Judge evaluates conversations across four dimensions:

1. **Goal Achievement** (0-1): How well the stated goal was accomplished
2. **SOP Adherence** (0-1): Compliance with Standard Operating Procedures
3. **Brand Consistency** (0-1): Alignment with brand voice and values
4. **Factual Accuracy** (0-1): Correctness of information provided

## Local Development

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Run tests
pnpm test

# Watch mode for development
pnpm dev
```

## CI Integration

SimLab integrates with GitHub Actions for automated quality gates:

```yaml
- name: Run SimLab Smoke Tests
  run: pnpm simlab:smoke

- name: Check Quality Gates
  run: pnpm simlab:report
```

## Best Practices

1. **Seed Scenarios**: Start with 20 critical scenarios covering key user journeys
2. **Deterministic Testing**: Always use seeded random generation for reproducible results
3. **Evidence Requirements**: Ensure all agent responses include supporting evidence
4. **Regular Calibration**: Validate judge accuracy with real conversation samples
5. **Scenario Evolution**: Expand scenario coverage based on real user interactions

## Roadmap

- [ ] Multi-seed ensemble judging for improved accuracy
- [ ] Adversarial scenario generation
- [ ] Multilingual persona support
- [ ] Real-time scenario adaptation
- [ ] Business outcome telemetry integration

## License

MIT - See LICENSE file for details.
