# PRP Implementation Guide

## Quick Start

### 1. Installation

```bash
cd packages/prp-runner
pnpm install
pnpm build
```

### 2. Basic Usage

```typescript
import { createPRPOrchestrator } from '@cortex-os/prp-runner';

const orchestrator = createPRPOrchestrator();

const blueprint = {
  title: 'Your Project',
  description: 'Project description',
  requirements: ['Requirement 1', 'Requirement 2'],
};

const result = await orchestrator.executePRPCycle(blueprint, './output-dir');
```

## Phase-by-Phase Execution

### Phase 1: Strategy & Design

**Neurons Executed:**

1. `ProductionProductManagerNeuron` - Generates product specs and user stories
2. `ProductionSecurityAnalystNeuron` - Establishes security baseline (OWASP)
3. `ProductionUXDesignerNeuron` - Creates WCAG 2.2 AA design system
4. `ProductionSystemArchitectNeuron` - Designs complete system architecture

**Outputs Generated:**

- Product Requirements Document
- Security baseline and threat model
- Design system with accessibility standards
- System architecture document

**Validation Gates:**

- Blueprint title present
- Security baseline established
- UX design specifications created
- Architecture diagram completed

### Phase 2: Build

**Neurons Executed:**

1. `ProductionBackendEngineerNeuron` - Generates real API code, models, tests
2. `ProductionFrontendEngineerNeuron` - Creates React components with accessibility
3. `ProductionQAAutomationNeuron` - Builds comprehensive test suites

**Outputs Generated:**

- Backend API implementation (Express/TypeScript)
- Frontend React components (WCAG compliant)
- Unit, integration, and E2E tests
- CI/CD pipeline configuration

**Validation Gates:**

- Backend compilation successful
- Frontend compilation successful
- Security scan passes
- Test coverage ≥85%
- Lighthouse score ≥90%

### Phase 3: Evaluation

**Neurons Executed:**

1. `ProductionEvalsNeuron` - Validates TDD cycle completion
2. `ProductionReviewerNeuron` - Performs security and architecture review
3. `ProductionValidationLoopNeuron` - Validates accessibility and performance

**Outputs Generated:**

- TDD compliance report
- Code review report
- Accessibility validation report
- Performance analysis report

**Validation Gates:**

- TDD Red-Green-Refactor cycle complete
- Code review approved (0 blockers)
- Accessibility score ≥95%
- Performance benchmarks met

## Cerebrum Decision Logic

After all phases complete, the Cerebrum evaluates:

```typescript
// Promotion criteria
if (totalBlockers === 0 && totalMajors <= 5) {
  decision = 'promote'; // Ready for production
} else {
  decision = 'recycle'; // Needs more work
}
```

## Tool Integration

### File Operations

- Real file creation and modification
- Directory structure generation
- Template-based code generation

### Build & Compilation

- TypeScript compilation validation
- Package installation and dependency management
- Build process execution

### Testing & Quality

- Unit test execution (Vitest)
- Integration testing (Supertest)
- E2E testing (Playwright)
- Coverage reporting
- Linting and formatting

### Accessibility & Performance

- WCAG 2.2 AA validation (axe-core)
- Lighthouse audits
- Performance metrics collection

### Security

- OWASP compliance checking
- Vulnerability scanning
- Security header validation

## Configuration

### Environment Variables

```bash
NODE_ENV=production
PRP_WORKING_DIR=./workspace
PRP_OUTPUT_DIR=./dist
PRP_TIMEOUT=300000  # 5 minutes per neuron
```

### Blueprint Schema

```typescript
interface Blueprint {
  title: string;
  description: string;
  requirements: string[];
  // Optional overrides
  techStack?: string[];
  constraints?: string[];
}
```

## Error Handling

The system implements comprehensive error handling:

1. **Graceful Degradation**: Failed neurons don't crash the entire cycle
2. **Detailed Logging**: Complete evidence trail for debugging
3. **Rollback Support**: Can retry individual phases
4. **Timeout Protection**: Prevents runaway processes

## Monitoring & Observability

Each neuron execution produces:

- **Evidence**: Detailed execution logs and validation results
- **Artifacts**: Generated files and reports
- **Metrics**: Performance and resource usage data
- **Next Steps**: Recommended follow-up actions

## Best Practices

### Blueprint Design

- Keep requirements specific and testable
- Include both functional and non-functional requirements
- Specify clear acceptance criteria

### Validation Tuning

- Adjust coverage thresholds based on project needs
- Configure accessibility requirements per target audience
- Set appropriate performance benchmarks

### CI/CD Integration

```yaml
# Example GitHub Actions workflow
- name: Run PRP Validation
  run: |
    cd packages/prp-runner
    npm run build
    node -e "
      import('./dist/index.js').then(async ({ runPRPCycle }) => {
        const result = await runPRPCycle(blueprint);
        if (result.phase !== 'completed') process.exit(1);
      })
    "
```

## Troubleshooting

### Common Issues

1. **Compilation Failures**: Check TypeScript configuration
2. **Test Failures**: Verify test environment setup
3. **Accessibility Issues**: Review WCAG implementation
4. **Performance Problems**: Check Lighthouse configuration

### Debug Mode

Enable verbose logging:

```typescript
process.env.DEBUG = 'prp:*';
```

## Production Deployment

The PRP system is designed for production use with:

- Docker containerization support
- Kubernetes deployment readiness
- Comprehensive monitoring integration
- Scalable architecture patterns

Generated: 2025-08-21
Status: Production Ready
