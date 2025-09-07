# Cortex-OS Contracts

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

This directory contains API contracts, schemas, and specifications that define communication interfaces across the Cortex-OS ecosystem.

## Directory Structure

- `/contracts/asyncapi/` - AsyncAPI specifications for event-driven communication
- `/contracts/cloudevents/` - CloudEvents schemas for standardized event formats
- `/contracts/tests/` - Contract validation tests and examples

## Contract Types

### AsyncAPI Specifications

#### Event-Driven Communication

AsyncAPI specifications define:

- Event schemas and formats
- Channel definitions
- Producer/consumer contracts
- Message validation rules

### CloudEvents

#### Standardized Event Format

CloudEvents provide:

- Event metadata standards
- Payload schemas
- Event routing information
- Interoperability specifications

### Validation Tests

#### Contract Testing

Test suites ensure:

- Schema compliance
- Message format validation
- Integration testing
- Backward compatibility

## Architecture Principles

### Contract-First Design

- Define interfaces before implementation
- Ensure consistency across services
- Enable independent development
- Support versioning and evolution

### Schema Validation

- All messages validated against schemas
- Type safety at runtime
- Clear error messages
- Automated validation testing

### Event-Driven Architecture

- Asynchronous communication patterns
- Loose coupling between services
- Event sourcing capabilities
- Scalable message processing

## Usage Patterns

### Service Integration

Services use contracts for:

- API definitions
- Message formats
- Event schemas
- Data validation

### Development Workflow

Contracts support:

- Code generation
- Mock data creation
- Integration testing
- Documentation generation

## Schema Evolution

### Versioning Strategy

- Semantic versioning for contracts
- Backward compatibility requirements
- Migration strategies
- Deprecation policies

### Change Management

- Review process for contract changes
- Impact analysis
- Communication to stakeholders
- Rollout planning

## Validation

### Runtime Validation

- Input/output validation
- Schema compliance checking
- Error handling
- Performance monitoring

### Testing

- Contract testing suites
- Mock service generation
- Integration test automation
- Regression testing

## Tools and Utilities

### Schema Management

- Schema registry integration
- Version control
- Validation utilities
- Documentation generation

### Development Support

- Code generation tools
- Mock data generators
- Test harnesses
- Integration helpers

## Best Practices

- Use semantic versioning
- Maintain backward compatibility
- Document all schema changes
- Test contract evolution
- Monitor contract usage

## Related Documentation

- [A2A Communication](/packages/a2a/README.md)
- [Service Integration](/packages/README.md)
- [Event Architecture](/../AGENTS.md)
- [API Guidelines](/docs/)

## Schema Coverage Guard

This repository enforces a lightweight **schema coverage guard** to ensure every
exported `*Schema` in contract event files has at least one explicit test
reference. The guard:

- Scans `libs/typescript/contracts/**/events.ts` files for `export const <Name>Schema = z.object(...)`
- Fails if any discovered schema name is missing from test sources under `contracts/tests/`
- Provides fast feedback in CI via the dedicated workflow: `.github/workflows/contracts-coverage.yml`

Run locally:

```bash
pnpm vitest run contracts/tests/contracts-coverage.test.ts
```

When adding a new schema export, create or update a test referencing it (a
minimal positive + negative parse test is sufficient). See
`mcp-events.contract.test.ts` for an example covering multiple schemas.

Rationale:

- Catches silent contract drift (schemas added without validation tests)
- Keeps contract surface intentional and observable in PRs
- Encourages minimal characterization tests for each new contract

If a schema is intentionally experimental, wrap its test in `describe.skip`
with a comment and open a tracking issue to avoid accidental removal by future
cleanups.
