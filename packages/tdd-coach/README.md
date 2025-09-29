# TDD Coach

TDD Coach is an advanced Test-Driven Development enforcement tool that ensures developers and AI agents follow proper TDD practices. It monitors test results and provides contextual coaching to maintain the red-green-refactor cycle.

> **📋 For comprehensive production-ready TDD planning with 95/95 coverage targets and real-time execution, see the [TDD Planning Guide](./docs/tdd-planning-guide.md).**

## Features

- **TDD State Machine**: Automatically detects and enforces proper TDD state transitions
- **Quality Gates Integration**: Enforces 95/95 coverage with mutation testing and operational readiness
- **Multi-Framework Support**: Works with Vitest, Jest, Pytest, Rust tests, and Go tests
- **Contextual Coaching**: Provides adaptive guidance based on developer skill level
- **Real-time Monitoring**: Watches test files and provides immediate feedback
- **Production Readiness**: Operational readiness scoring and brAInwav compliance validation
- **CLI Interface**: Command-line tool for easy integration into development workflows
- **AI Integration**: Works with AI coding assistants like Claude Code, GitHub Copilot, and others

## Installation

```bash
npm install -g @cortex-os/tdd-coach
```

## Usage

### Enhanced CLI Commands

```bash
# Validate specific files against TDD principles
tdd-coach validate --files src/example.test.ts src/implementation.ts

# Validate with quality gates enforcement
tdd-coach validate --files src/example.test.ts --quality-gates

# Get current TDD status
tdd-coach status

# Get operational readiness assessment
tdd-coach status --ops-readiness

# Run tests and update TDD state
tdd-coach run-tests --files src/example.test.ts

# Create TDD plan for package
tdd-coach plan --package <package-name>

# Assess operational criteria
tdd-coach assess --operational-criteria

# Watch for changes continuously
tdd-coach validate --watch
```

### Programmatic Usage

```typescript
import { createTDDCoach } from '@cortex-os/tdd-coach';

const coach = createTDDCoach({
  workspaceRoot: process.cwd(),
  config: {
    universalMode: true,
    defaultInterventionLevel: 'coaching',
    adaptiveLearning: true,
  },
});

// Validate changes
const result = await coach.validateChange({
  proposedChanges: {
    files: [
      {
        path: 'src/example.test.ts',
        status: 'modified',
        diff: '+ it("should work", () => { expect(true).toBe(true); });',
        linesAdded: 1,
        linesDeleted: 0,
      },
    ],
    totalChanges: 1,
    timestamp: new Date().toISOString(),
    author: 'developer',
  },
});

console.log(result.coaching.message);
```

## How It Works

TDD Coach enforces the classic TDD cycle with production-ready quality gates:

1. **RED**: Write a failing test first
2. **GREEN**: Write minimal code to make the test pass
3. **REFACTOR**: Improve the code while keeping tests passing

The tool monitors your test results and provides coaching when you deviate from this cycle, helping both human developers and AI agents maintain proper TDD practices.

### Quality Gates Integration

TDD Coach integrates with comprehensive quality gates that enforce:

- ≥95% line and branch coverage on changed code
- ≥80% mutation score to prevent vacuous tests
- Operational readiness scoring ≥95%
- Security compliance with zero Critical/High vulnerabilities
- Performance SLOs with real-time validation
- brAInwav brand compliance across all outputs

See the [TDD Planning Guide](./docs/tdd-planning-guide.md) for complete methodology and implementation details.

## Configuration

TDD Coach can be configured through the `TDDCoachOptions` interface:

```
{
  workspaceRoot: string;           // Root directory of your project
  config?: {
    universalMode: boolean;        // Enable real-time monitoring
    defaultInterventionLevel: 'silent' | 'coaching' | 'warning' | 'blocking';
    adaptiveLearning: boolean;     // Adapt to developer skill level
    // ... other options
  };
  testConfig?: {
    // Test runner configuration
  };
}
```

## Supported Test Frameworks

- **JavaScript/TypeScript**: Vitest, Jest
- **Python**: Pytest
- **Rust**: Cargo test
- **Go**: Go test
- **PHP**: PHPUnit (planned)
- **Java**: JUnit (planned)

## License

MIT
