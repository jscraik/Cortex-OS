# TDD Guard Implementation Roadmap

## Overview

This document provides a detailed implementation roadmap for the TDD Guard system based on the engineering specification. It breaks down the implementation into concrete, testable milestones with clear acceptance criteria.

## Implementation Phases

### Phase 1: Foundation Components (Weeks 1-2)

#### Milestone 1.1: Core State Machine

**Duration**: 3 days  
**Owner**: Core Team  
**Priority**: Critical Path

**Deliverables**:

- [x] `TDDStateMachine` class with RED/GREEN/REFACTOR states
- [x] State transition validation logic
- [x] Persistence layer for state management
- [x] Unit tests with >95% coverage

**Acceptance Criteria**:

```typescript
// Must support these transitions
RED → GREEN: when all tests pass && change is minimal
GREEN → REFACTOR: when tests pass && lint clean
REFACTOR → RED: when new test added || behavior changed
```

**Test Requirements**:

- State persistence across system restarts
- Concurrent state access safety
- Invalid transition rejection
- State history audit trail

#### Milestone 1.2: Multi-Language Test Reporters

**Duration**: 4 days  
**Owner**: Integration Team  
**Priority**: Critical Path

**Deliverables**:

1. **Vitest Reporter** (`packages/tdd-guard/reporters/vitest/`)

   ```typescript
   export class TDDGuardVitestReporter implements Reporter {
     async onFinished(files: File[], errors: unknown[]): Promise<void>;
     private normalizeResults(files: File[]): NormalizedTestResults;
     private publishToGuard(results: NormalizedTestResults): Promise<void>;
   }
   ```

2. **Pytest Reporter** (`packages/tdd-guard/reporters/pytest/`)

   ```python
   class TDDGuardPytestPlugin:
       def pytest_runtest_logreport(self, report: TestReport) -> None
       def pytest_sessionfinish(self, session: Session) -> None
       def _normalize_results(self, session: Session) -> NormalizedTestResults
   ```

3. **Rust Reporter** (`apps/tdd-guard-rust/`)

   ```rust
   pub struct TDDGuardRustReporter {
       project_root: PathBuf,
       state_dir: PathBuf,
   }

   impl TDDGuardRustReporter {
       pub fn new(project_root: PathBuf) -> Self
       pub async fn process_test_output(&self, output: &str) -> Result<()>
   }
   ```

**Acceptance Criteria**:

- All reporters emit identical JSON schema to `.tdd-guard/test-results.json`
- Real-time result updates during test execution
- Support for test file path mapping in monorepos
- Error handling for malformed test output

#### Milestone 1.3: Git Hooks Integration

**Duration**: 2 days  
**Owner**: DevOps Team  
**Priority**: High

**Deliverables**:

- Pre-commit hook that validates TDD compliance
- Pre-push hook that ensures clean state
- Installation script for hook setup
- Bypass mechanism for emergency situations

**Implementation**:

```bash
#!/bin/bash
# .githooks/pre-commit
set -euo pipefail

if ! command -v tdd-guard &> /dev/null; then
    echo "❌ TDD Guard not installed. Run: npm install -g @cortex-os/tdd-guard"
    exit 1
fi

# Check if we're in a valid TDD state for commit
if ! tdd-guard validate --staged; then
    echo "❌ Commit blocked: TDD policy violation detected"
    echo "Run 'tdd-guard status' for details"
    exit 1
fi

echo "✅ TDD Guard: Commit approved"
```

### Phase 2: Filesystem Overlay (Weeks 3-4)

#### Milestone 2.1: FUSE Driver Core

**Duration**: 5 days  
**Owner**: Systems Team  
**Priority**: Critical Path

**Deliverables**:

- Cross-platform FUSE driver (macOS/Linux/Windows)
- Permission management system
- File operation interception
- Performance optimization layer

**Technical Architecture**:

```rust
// apps/tdd-guard-fs/src/main.rs
use fuse3::{Filesystem, Result};
use std::collections::HashMap;
use tokio::sync::{RwLock, Mutex};

pub struct TDDGuardFilesystem {
    original_root: PathBuf,
    state_machine: Arc<Mutex<TDDStateMachine>>,
    permissions: Arc<RwLock<HashMap<PathBuf, FilePermission>>>,
    change_validator: Arc<ChangeValidator>,
}

impl Filesystem for TDDGuardFilesystem {
    async fn write(
        &self,
        _req: Request,
        path: &Path,
        fh: u64,
        offset: u64,
        data: &[u8],
        write_flags: u32,
        flags: i32,
    ) -> Result<u32> {
        // 1. Load current TDD state
        let state = self.state_machine.lock().await;

        // 2. Validate write permission
        let permission = self.check_write_permission(path, data, &state).await?;

        match permission {
            WritePermission::Granted { change_id, justification } => {
                // 3. Apply change through original filesystem
                let result = self.passthrough_write(path, offset, data).await?;

                // 4. Log the approved change
                self.audit_change(change_id, path, justification).await;

                Ok(result)
            },
            WritePermission::Denied { reason, suggestion } => {
                // 5. Block the change and provide feedback
                self.log_blocked_change(path, reason.clone()).await;

                Err(fuse3::Error::from(std::io::Error::new(
                    std::io::ErrorKind::PermissionDenied,
                    format!("TDD Guard: {}\nSuggestion: {}", reason, suggestion)
                )))
            }
        }
    }
}
```

**Performance Requirements**:

- <10ms latency for permission checks
- <100ms latency for change validation
- <5% CPU overhead during normal operation
- Support for 1000+ concurrent file operations

#### Milestone 2.2: Change Validation Engine

**Duration**: 4 days  
**Owner**: Core Team  
**Priority**: Critical Path

**Deliverables**:

- Minimality checker algorithm
- Coverage-based validation
- Diff analysis engine
- Change justification system

**Algorithm Implementation**:

```typescript
interface ChangeValidator {
  validateChange(
    change: ChangeSet,
    state: TDDState,
    context: ValidationContext,
  ): Promise<ValidationResult>;
}

class CoverageBasedValidator implements ChangeValidator {
  async validateChange(
    change: ChangeSet,
    state: TDDState,
    context: ValidationContext,
  ): Promise<ValidationResult> {
    switch (state.current) {
      case 'RED':
        return this.validateRedPhaseChange(change, state.failingTests);
      case 'GREEN':
        return this.validateGreenPhaseChange(change, state.failingTests);
      case 'REFACTOR':
        return this.validateRefactorChange(change, context.lintResults);
    }
  }

  private async validateRedPhaseChange(
    change: ChangeSet,
    failingTests: TestResult[],
  ): Promise<ValidationResult> {
    // RED phase: Only test files should be modified
    const testFilePattern = /\.(test|spec)\.(ts|js|py|rs)$/;
    const nonTestFiles = change.modifiedFiles.filter((file) => !testFilePattern.test(file.path));

    if (nonTestFiles.length > 0) {
      return {
        approved: false,
        reason: 'RED phase: Cannot modify implementation files',
        suggestion: 'Write failing tests first, then implement',
        blockedFiles: nonTestFiles.map((f) => f.path),
      };
    }

    // Validate that new tests actually fail
    const testValidation = await this.validateTestsActuallyFail(change);
    return testValidation;
  }

  private async validateGreenPhaseChange(
    change: ChangeSet,
    failingTests: TestResult[],
  ): Promise<ValidationResult> {
    // GREEN phase: Implementation changes must be minimal and targeted
    const targetLines = this.extractFailingTestTargets(failingTests);
    const changedLines = this.extractChangedLines(change);

    const coverage = this.calculateCoverageOverlap(targetLines, changedLines);
    const minimality = this.checkMinimality(change, failingTests);

    if (coverage < 0.9) {
      return {
        approved: false,
        reason: 'GREEN phase: Changes not covered by failing tests',
        suggestion: 'Only change code that makes current failing tests pass',
        coverage: { required: 0.9, actual: coverage },
      };
    }

    if (!minimality.isMinimal) {
      return {
        approved: false,
        reason: 'GREEN phase: Change is not minimal',
        suggestion: minimality.suggestion,
        overImplementation: minimality.excessLines,
      };
    }

    return { approved: true, reason: 'Minimal implementation change' };
  }
}
```

### Phase 3: AI Tool Integration (Weeks 5-6)

#### Milestone 3.1: MCP Proxy Development

**Duration**: 4 days  
**Owner**: AI Integration Team  
**Priority**: High

**Deliverables**:

- MCP protocol interceptor
- Tool request validation
- Response filtering system
- Multi-tool compatibility layer

**Architecture**:

```typescript
// packages/tdd-guard/mcp-proxy/src/proxy.ts
export class MCPProxy {
  private tddGuard: TDDGuardCore;
  private toolValidators: Map<string, ToolValidator>;

  async interceptToolRequest(request: MCPToolRequest): Promise<MCPToolResponse> {
    // 1. Identify the tool being used
    const toolType = this.identifyTool(request);

    // 2. Validate against TDD state
    const validation = await this.validateToolRequest(request, toolType);

    if (!validation.approved) {
      return {
        error: {
          code: 'TDD_VIOLATION',
          message: validation.reason,
          data: {
            suggestion: validation.suggestion,
            currentState: await this.tddGuard.getCurrentState(),
            requiredAction: validation.requiredAction,
          },
        },
      };
    }

    // 3. Execute the validated request
    const response = await this.executeRequest(request);

    // 4. Log the successful action
    await this.auditToolUsage(request, response, validation);

    return response;
  }

  private async validateToolRequest(
    request: MCPToolRequest,
    toolType: ToolType,
  ): Promise<ToolValidationResult> {
    const validator = this.toolValidators.get(toolType);
    if (!validator) {
      throw new Error(`Unsupported tool: ${toolType}`);
    }

    return await validator.validate(request, await this.tddGuard.getCurrentState());
  }
}

// Tool-specific validators
export class FileEditValidator implements ToolValidator {
  async validate(request: MCPToolRequest, state: TDDState): Promise<ToolValidationResult> {
    if (request.method === 'file/edit') {
      const changeSet = this.extractChangeSet(request.params);
      return await this.changeValidator.validateChange(changeSet, state);
    }

    return { approved: true, reason: 'Non-edit operation' };
  }
}
```

#### Milestone 3.2: AI Tool Adapters

**Duration**: 5 days  
**Owner**: AI Integration Team  
**Priority**: High

**Deliverables**:

- Claude Code adapter
- GitHub Copilot adapter
- VS Code extension integration
- Codex CLI wrapper
- Gemini/Qwen CLI integration

**Implementation Strategy**:

```typescript
// packages/tdd-guard/adapters/claude/src/adapter.ts
export class ClaudeCodeAdapter implements AIToolAdapter {
  async interceptHookExecution(
    hookType: 'PreToolUse' | 'PostToolUse',
    toolName: string,
    args: unknown[],
  ): Promise<HookResult> {
    if (hookType === 'PreToolUse' && this.isFileModificationTool(toolName)) {
      const validation = await this.tddGuard.validateProposedChange({
        tool: toolName,
        args: args,
        context: await this.extractContext(),
      });

      if (!validation.approved) {
        return {
          block: true,
          message: this.formatUserFriendlyMessage(validation),
          suggestedAction: validation.suggestion,
        };
      }
    }

    return { block: false };
  }

  private formatUserFriendlyMessage(validation: ValidationResult): string {
    const state = validation.context.currentState;

    switch (state) {
      case 'RED':
        return `🔴 TDD Guard: You're in the RED phase. Write a failing test first before implementing.\n\nCurrent failing tests: none\nNext action: Write a test that fails for the feature you want to implement.`;

      case 'GREEN':
        return `🟢 TDD Guard: You're in the GREEN phase. Make minimal changes to pass failing tests.\n\nFailing tests: ${validation.context.failingTests.length}\nBlocked reason: ${validation.reason}\nSuggestion: ${validation.suggestion}`;

      case 'REFACTOR':
        return `🔄 TDD Guard: You're in the REFACTOR phase. Clean up code while keeping tests green.\n\nCurrent status: All tests passing\nBlocked reason: ${validation.reason}\nSuggestion: ${validation.suggestion}`;
    }
  }
}
```

### Phase 4: Production Hardening (Weeks 7-8)

#### Milestone 4.1: Performance Optimization

**Duration**: 3 days  
**Owner**: Performance Team  
**Priority**: Medium

**Deliverables**:

- Caching layer for permission checks
- Asynchronous validation pipeline
- Memory usage optimization
- Benchmark suite

**Performance Targets**:

```typescript
interface PerformanceTargets {
  permissionCheck: {
    p50: '< 5ms';
    p95: '< 25ms';
    p99: '< 100ms';
  };
  changeValidation: {
    p50: '< 50ms';
    p95: '< 200ms';
    p99: '< 500ms';
  };
  memoryUsage: {
    baseline: '< 50MB';
    perProject: '< 10MB';
    maxTotal: '< 200MB';
  };
  cpuOverhead: {
    idle: '< 1%';
    activeValidation: '< 10%';
    peak: '< 25%';
  };
}
```

#### Milestone 4.2: Security Audit

**Duration**: 3 days  
**Owner**: Security Team  
**Priority**: High

**Security Requirements**:

- No privilege escalation vulnerabilities
- Secure handling of file permissions
- Audit trail integrity
- Protection against bypass attempts

**Security Tests**:

```bash
# Security test suite
./scripts/security-audit.sh --comprehensive

# Test categories:
# 1. Privilege escalation attempts
# 2. Filesystem permission bypasses
# 3. State machine manipulation
# 4. Audit log tampering
# 5. Resource exhaustion attacks
```

#### Milestone 4.3: Monitoring and Alerting

**Duration**: 2 days  
**Owner**: DevOps Team  
**Priority**: Medium

**Deliverables**:

- Prometheus metrics integration
- Grafana dashboard templates
- Alert rule configurations
- Health check endpoints

**Key Metrics**:

```typescript
interface TDDGuardMetrics {
  // Compliance metrics
  tddComplianceRate: Gauge;
  violationAttempts: Counter;
  successfulEnforcements: Counter;

  // Performance metrics
  validationLatency: Histogram;
  filesystemOperations: Counter;
  permissionChecks: Counter;

  // System health
  activeProjects: Gauge;
  errorRate: Gauge;
  systemUptime: Counter;
}
```

## Risk Mitigation Strategies

### Technical Risks

**Risk**: Filesystem overlay performance impact
**Mitigation**:

- Implement write-through caching for permission checks
- Use memory-mapped files for frequently accessed data
- Provide fallback mode that disables overlay if performance degrades >10%

**Risk**: Cross-platform compatibility issues  
**Mitigation**:

- Comprehensive CI/CD testing matrix (macOS, Linux, Windows)
- Platform-specific optimization paths
- Docker-based testing environments for consistency

**Risk**: AI tool evolution breaks integration
**Mitigation**:

- Plugin architecture with versioned APIs
- Community contribution guidelines for new tool support
- Automatic compatibility testing against tool updates

### Operational Risks

**Risk**: Developer resistance to TDD enforcement
**Mitigation**:

- Gradual rollout with opt-in periods
- Comprehensive documentation and training materials
- Clear value demonstration through metrics and testimonials
- Emergency bypass procedures for critical situations

**Risk**: System reliability concerns
**Mitigation**:

- 99.9% uptime target with automatic failover
- Graceful degradation when components are unavailable
- Real-time health monitoring and alerting
- Automated recovery procedures

## Success Metrics

### Quantitative KPIs

| Metric                 | Current Baseline | 6-Month Target | Measurement Method       |
| ---------------------- | ---------------- | -------------- | ------------------------ |
| TDD Compliance Rate    | 30%              | 95%            | Automated state tracking |
| Development Velocity   | 100% (baseline)  | 120%           | Story points/sprint      |
| Bug Density            | 2.3 bugs/kloc    | 0.5 bugs/kloc  | Defect tracking          |
| AI Code Quality        | 60% usable       | 90% usable     | Manual review sampling   |
| Developer Satisfaction | TBD (survey)     | >4.0/5.0       | Quarterly surveys        |

### Qualitative Success Indicators

- Developers report TDD feels "natural and automatic"
- AI tools consistently generate test-driven code
- Code review discussions focus on design rather than missing tests
- New team members achieve TDD proficiency in <1 week
- Zero production incidents caused by untested code paths

## Conclusion

This implementation roadmap provides a concrete path to realizing the TDD Guard vision outlined in the engineering specification. By following this phased approach, we can systematically build a robust, tool-agnostic TDD enforcement system while minimizing risk and maximizing learning opportunities.

The key to success will be maintaining focus on developer experience while ensuring uncompromising enforcement of TDD principles. Each milestone includes specific success criteria and rollback procedures to ensure we can adapt quickly based on real-world feedback.

**Next Steps**:

1. Assemble cross-functional implementation teams for each phase
2. Set up project tracking and communication channels
3. Begin Phase 1 implementation with Milestone 1.1
4. Establish weekly progress reviews and risk assessment meetings

---

_This roadmap will be updated based on implementation learnings and stakeholder feedback._
