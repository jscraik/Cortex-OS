# brAInwav Policy Enforcement Pack

## Overview

This policy pack implements comprehensive enforcement of brAInwav production standards across the Cortex-OS monorepo using multiple complementary tools:

- **Semgrep**: SAST rules for production code prohibitions and branding requirements
- **AST-Grep**: AST-level pattern matching with auto-fixes for error messages and console outputs
- **GitHub Actions**: CI integration with diff-based scanning and PR comments
- **Pre-commit Hooks**: Local soft-fail checks to catch violations early
- **Agent-Toolkit**: Programmatic prohibition scanning for AI agents

## 🚨 Enforced Prohibitions

### Production Code Anti-Patterns

1. **Math.random() in production** (ERROR)
   - Rule: `brainwav.math-random-in-prod`
   - Rationale: Non-deterministic behavior in production code
   - Alternative: Use crypto-secure random generators or UUIDs

2. **Mock responses in production** (ERROR)
   - Rule: `brainwav.mock-response-in-prod`
   - Pattern: `Mock adapter response`, `Mock response`, etc.
   - Rationale: Placeholder implementations must not reach production

3. **"Will be wired later" comments** (ERROR)
   - Rule: `brainwav.todo-in-prod-path`
   - Pattern: `will be wired later`, `TODO`, `FIXME`
   - Rationale: Indicates incomplete implementation

4. **console.warn("not implemented")** (ERROR)
   - Rule: `brainwav.not-implemented-warn`
   - Rationale: Production code should throw errors, not warnings

### Branding Requirements

5. **[brAInwav] prefix in logs/errors** (WARNING)
   - Rule: `brainwav.branding.missing-in-logs`
   - AST-Grep: `brand-in-throw`, `brand-in-logger`
   - Applies to: `console.log`, `console.error`, `console.warn`, `throw new Error`
   - Auto-fix: Available via `pnpm lint:ast-grep:fix`

### Development Hygiene

6. **Smart Nx wrapper enforcement** (WARNING)
   - Rule: `brainwav.nx.run-many.avoid`
   - Pattern: `nx run-many`
   - Alternative: Use `pnpm *:smart` commands
   - Guard Script: `scripts/guard-nx-smart.sh`

7. **No interactive prompts in CI** (WARNING)
   - Rule: `brainwav.interactive.prompts.in-ci`
   - Pattern: `readline`, `inquirer`, etc. in CI workflows
   - Rationale: CI environments require non-interactive execution

8. **Agent-toolkit required** (WARNING)
   - Rule: `brainwav.agent-toolkit.required`
   - Pattern: Raw usage of `ripgrep`, `semgrep`, `ast-grep` without toolkit
   - Alternative: Use `@cortex-os/agent-toolkit` for unified interface

## 📁 Files Structure

```
.
├── semgrep/
│   └── brainwav.yml              # 10 Semgrep rules
├── ast-grep/
│   └── brainwav.yml              # 3 AST-Grep rules with auto-fixes
├── .semgrepignore                # Exclusions (tests, docs, examples)
├── scripts/
│   └── guard-nx-smart.sh         # Pre-commit guard for Smart Nx
├── tools/agent-checks/
│   └── brainwavChecks.ts         # Agent-toolkit integration
├── .github/workflows/
│   └── security-modern.yml       # CI job: brainwav-policy
└── .husky/
    └── pre-commit                # Updated with AST-Grep checks
```

## 🚀 Usage

### Local Development

```bash
# Run full Semgrep scan (requires semgrep installation)
pnpm security:scan:brainwav

# Run AST-Grep checks
pnpm lint:ast-grep:check

# Auto-fix AST-Grep violations
pnpm lint:ast-grep:fix
```

### CI Pipeline

The `brainwav-policy` job in `.github/workflows/security-modern.yml` runs automatically on:
- Pull requests to `main`
- Pushes to `main`

**Workflow:**
1. Install Semgrep (via pipx) and AST-Grep (via curl)
2. Run diff scan against baseline: `pnpm security:scan:brainwav:diff`
3. Run AST-Grep checks (soft fail with warning)
4. Upload results as artifacts (30-day retention)
5. Comment on PR with first 10 violations + summary

### Pre-commit Hook

The `.husky/pre-commit` hook runs AST-Grep checks automatically on staged files:
- **Soft fail locally**: Shows warnings but doesn't block commits
- **CI enforces strictly**: Violations will fail the build

### Agent Integration

```typescript
import { scanForProhibitions } from './tools/agent-checks/brainwavChecks';

// Scan specific paths
const result = await scanForProhibitions(['apps/cortex-os', 'packages']);

console.log(result.summary);
// [brAInwav] ⚠️  Found 5 policy violation(s):
//   • Math.random() in production code: 2 occurrence(s)
//     - apps/cortex-os/src/utils.ts:15
//     - packages/ai-agents/src/random.ts:42

// Exit with error if violations found
if (result.totalHits > 0) {
  process.exit(1);
}
```

## 🔧 Installation & Setup

### Prerequisites

```bash
# Install Semgrep via uv (Python package manager)
uv pip install semgrep

# Install AST-Grep via cargo (optional for local auto-fixes)
cargo install ast-grep
```

**Note**: All `pnpm security:scan:brainwav*` scripts use `uv run semgrep` internally, so semgrep must be installed in the uv-managed Python environment.

### Generate Baseline

```bash
# Create baseline for diff-based scanning
pnpm security:scan:brainwav:baseline

# Commit the baseline
git add reports/semgrep-brainwav-baseline.json
git commit -m "chore(security): generate brAInwav policy baseline"
```

### Verify Setup

```bash
# Test with example violations
pnpm lint:ast-grep:check examples/policy-violations.example.ts

# Expected output: 5+ violations detected
```

## 📊 Example Violations

See `examples/policy-violations.example.ts` for demonstration of each violation type with correct alternatives.

## 🎯 Exclusions

The following paths are excluded from scanning (`.semgrepignore`):

- `**/__tests__/**`, `**/*.test.ts`, `**/*.spec.ts`
- `**/docs/**`, `**/examples/**`, `**/reports/**`
- `**/*.md`, `**/*.json`, `**/*.yml`
- `**/node_modules/**`, `**/dist/**`, `**/build/**`
- `config/**`, `scripts/**` (config/tooling allowed to use raw tools)

## 🔄 Maintenance

### Adding New Rules

1. **Semgrep**: Edit `semgrep/brainwav.yml`, add rule under appropriate severity
2. **AST-Grep**: Edit `ast-grep/brainwav.yml`, define pattern with optional fix
3. **Agent-Toolkit**: Add pattern to `tools/agent-checks/brainwavChecks.ts`
4. **Regenerate Baseline**: `pnpm security:scan:brainwav:baseline`
5. **Test**: Verify with example files

### Updating Exclusions

Edit `.semgrepignore` to add paths/patterns that should skip policy checks.

## 📚 References

- [Semgrep Documentation](https://semgrep.dev/docs/)
- [AST-Grep Documentation](https://ast-grep.github.io/)
- [brAInwav Production Standards](/.cortex/rules/RULES_OF_AI.md)
- [Cortex-OS Code Style](./CODESTYLE.md)

---

**Maintained by: brAInwav Development Team**  
**Co-authored-by: brAInwav Development Team**
