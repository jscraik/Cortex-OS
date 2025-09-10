# Contributing to Cortex-OS

[![Contributors Welcome](https://img.shields.io/badge/contributors-welcome-brightgreen.svg)](https://github.com/cortex-os/cortex-os/issues)
[![Good First Issues](https://img.shields.io/badge/good%20first%20issues-available-blue.svg)](https://github.com/cortex-os/cortex-os/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Thank you for your interest in contributing to Cortex-OS!**  
_Your contributions help make AI agent systems more accessible and powerful_

---

## 🎯 Quick Start for Contributors

### 1. Set Up Development Environment

```bash
# Clone the repository
git clone https://github.com/cortex-os/cortex-os.git
cd cortex-os

# Install dependencies (requires exact pnpm version)
pnpm install

# Verify installation
pnpm readiness:check

# Run development server
pnpm dev
```

### 2. Choose Your Contribution Type

- **🐛 Bug Fixes** - Fix existing issues or report new ones
- **✨ New Features** - Add functionality following our architecture
- **📚 Documentation** - Improve guides, API docs, or examples
- **🧪 Testing** - Add test coverage or improve test quality
- **🔒 Security** - Security improvements and vulnerability fixes
- **🎨 UI/UX** - Improve user interfaces and experience

### 3. Follow Our Workflow

1. **Fork** the repository and create a feature branch
2. **Code** following our standards and guidelines
3. **Test** thoroughly with our quality gates
4. **Document** your changes and update relevant docs
5. **Submit** a pull request with clear description

### Git Hooks & Node Version

- Git hooks are managed with `husky` and run via `.husky/*` scripts (Husky-only; Python `pre-commit` is not used).
- Supported local Node.js versions for dev tooling: `20.x` or `22.x`. Other versions may work but will print a warning.
- Hooks are installed automatically on `pnpm install` via `core.hooksPath=.husky`.

## 📋 Development Guidelines

### Code Standards

#### TypeScript/JavaScript

```typescript
// ✅ Good: Clear function with type safety
interface ProcessDataRequest {
  data: unknown;
  options: ProcessingOptions;
}

async function processData({ data, options }: ProcessDataRequest): Promise<ProcessedData> {
  const validator = createValidator(options.schema);
  const validatedData = await validator.validate(data);

  return await processor.process(validatedData, options);
}

// ❌ Avoid: Unclear types and parameters
function processData(data: any, opts?: any): any {
  return processor.process(data, opts);
}
```

#### Rust (TUI Components)

```rust
// ✅ Good: Clear struct with documentation
/// Represents a GitHub dashboard view state
#[derive(Debug, Clone)]
pub struct GitHubDashboard {
    /// Current active tab
    active_tab: DashboardTab,
    /// Pull requests data
    pull_requests: Vec<PullRequest>,
    /// Last refresh timestamp
    last_refresh: Option<SystemTime>,
}

impl GitHubDashboard {
    /// Creates a new GitHub dashboard instance
    pub fn new() -> Self {
        Self {
            active_tab: DashboardTab::Overview,
            pull_requests: Vec::new(),
            last_refresh: None,
        }
    }
}

// ❌ Avoid: Unclear naming and no documentation
pub struct GHDash {
    tab: u8,
    prs: Vec<PR>,
    ts: Option<SystemTime>,
}
```

### Architecture Principles

#### 1. **Governed Boundaries**

```typescript
// ✅ Good: Use A2A events for cross-package communication
await eventBus.emit('task.created', {
  taskId: 'task-123',
  type: 'data-processing',
  data: processedData,
});

// ❌ Avoid: Direct imports between feature packages
import { DataProcessor } from '../../../data-processing/src/processor';
```

#### 2. **Security First**

```typescript
// ✅ Good: Input validation and sanitization
const processRequest = z.object({
  data: z.string().max(10000),
  options: ProcessingOptionsSchema,
});

const validatedRequest = processRequest.parse(request);
const sanitizedData = sanitizeInput(validatedRequest.data);

// ❌ Avoid: Direct use of untrusted input
const result = await processor.process(request.data);
```

#### 3. **Type Safety**

```typescript
// ✅ Good: Strict typing with Zod validation
const AgentConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  capabilities: z.array(z.string()),
  settings: z.record(z.unknown()).optional(),
});

type AgentConfig = z.infer<typeof AgentConfigSchema>;

// ❌ Avoid: Loose typing
interface AgentConfig {
  id: string;
  name?: string;
  capabilities?: any[];
  settings?: any;
}
```

## 🧪 Testing Requirements

### Coverage Requirements

- **Minimum Coverage**: 90% for statements, branches, functions, and lines
- **Security Tests**: All security-related code must have dedicated tests
- **Integration Tests**: Multi-package interactions must be tested

### Testing Patterns

#### Unit Tests

```typescript
// Example: Agent communication test
describe('AgentCommunication', () => {
  let eventBus: EventBus;
  let agent: TestAgent;

  beforeEach(async () => {
    eventBus = createTestEventBus();
    agent = new TestAgent({ id: 'test-agent', eventBus });
    await agent.start();
  });

  it('should handle task creation events', async () => {
    const handler = jest.fn();
    agent.on('task.created', handler);

    await eventBus.emit('task.created', {
      taskId: 'test-123',
      type: 'data-processing',
    });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { taskId: 'test-123', type: 'data-processing' },
      }),
    );
  });
});
```

#### Integration Tests

```typescript
// Example: End-to-end workflow test
describe('DataProcessingWorkflow', () => {
  it('should process data from input to output', async () => {
    const workflow = new TestWorkflow();

    const result = await workflow.execute({
      input: testData,
      steps: ['validate', 'transform', 'store'],
    });

    expect(result.status).toBe('completed');
    expect(result.outputs).toHaveLength(3);
    expect(result.outputs[2]).toMatchObject({
      step: 'store',
      status: 'success',
    });
  });
});
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run specific package tests
pnpm test --filter=@cortex-os/a2a

# Run integration tests
pnpm test:integration

# Run security tests
pnpm test:security
```

## 🔒 Security Guidelines

### Security Requirements

- All user inputs must be validated using Zod schemas
- Sensitive data must not appear in logs or error messages
- Network communications must use TLS encryption
- Follow OWASP Top-10 guidelines for web security
- Follow OWASP LLM Top-10 for AI/ML specific security

### Security Testing

```bash
# Run security scans
pnpm security:scan              # OWASP precise rules
pnpm security:scan:llm          # LLM-specific security
pnpm security:scan:comprehensive # All security rulesets
```

### Security Code Examples

#### Input Validation

```typescript
// ✅ Good: Comprehensive validation
const UserInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .max(1000)
    .regex(/^[a-zA-Z0-9\s\-_.,!?]+$/, 'Invalid characters'),
  options: z
    .object({
      format: z.enum(['json', 'xml', 'yaml']),
      maxResults: z.number().min(1).max(100),
    })
    .optional(),
});

// Validate and sanitize
const validatedInput = UserInputSchema.parse(rawInput);
const sanitizedQuery = sanitizeHtml(validatedInput.query);
```

#### Secret Management

```typescript
// ✅ Good: Secure secret handling
const secrets = new SecretManager({
  provider: 'azure-keyvault',
  vaultUrl: process.env.AZURE_KEYVAULT_URL,
});

const apiKey = await secrets.get('github-api-key');

// ❌ Avoid: Hardcoded secrets
const apiKey = 'ghp_1234567890abcdef'; // Never do this
```

## 📚 Documentation Standards

### Code Documentation

- All public APIs must have JSDoc/TSDoc comments
- Complex algorithms need inline comments explaining the logic
- Security-sensitive code requires additional documentation

### Example Documentation

````typescript
/**
 * Processes agent-to-agent messages with validation and tracing
 *
 * @param envelope - CloudEvents-compliant message envelope
 * @param options - Processing options including validation settings
 * @returns Promise resolving to processing result
 *
 * @throws {ValidationError} When envelope fails schema validation
 * @throws {SecurityError} When source authentication fails
 *
 * @example
 * ```typescript
 * const result = await processMessage(envelope, {
 *   validateSource: true,
 *   enableTracing: true
 * });
 * ```
 *
 * @security This function validates all inputs and sanitizes message data
 * @since v1.0.0
 */
async function processMessage(
  envelope: Envelope,
  options: ProcessingOptions = {},
): Promise<ProcessingResult> {
  // Implementation...
}
````

### README Requirements

- All packages must have comprehensive README files
- Include installation instructions, usage examples, and API documentation
- Add status badges for build, coverage, and security
- Follow GitHub's recommended README structure

### Docs Style (Markdown)

Follow these conventions for all `*.md` files:

| Aspect            | Guideline                                                                     |
| ----------------- | ----------------------------------------------------------------------------- |
| Line Length       | Soft wrap allowed; no hard wraps mid-sentence unless improving diff clarity   |
| Headings          | Use `#` through `####`; never skip levels; one H1 per document                |
| Code Fences       | Always specify language (`bash`, `typescript`, `python`, `json`, etc.)        |
| Tables            | Compact, align with single spaces, keep header row concise                    |
| Links             | Prefer relative links within repo; wrap bare external URLs in angle brackets  |
| Badges            | Group at top (README) or inside centered `<div>`; avoid excessive badges      |
| Admonitions       | Use simple blockquotes (`> Note:` / `> Warning:`) instead of HTML             |
| HTML              | Avoid raw HTML except for necessary alignment wrappers or diagrams            |
| Lint Suppressions | Use `<!-- markdownlint-disable rule -->` sparingly with justification comment |
| File Naming       | Kebab-case: `architecture-overview.md`, `quick-start.md`                      |
| Front Matter      | Only when required by docs tooling; keep minimal                              |
| Diagrams          | Prefer Mermaid fenced blocks (` ```mermaid `)                                 |
| Lists             | Use `-` for unordered, `1.` for ordered; keep items concise                   |

#### Examples

```markdown
> Note: This guide assumes Node.js 20+.

# Show how to run coverage (example)

$ pnpm test:coverage
```

#### Linting Locally

```bash
# Lint all markdown
npx markdownlint-cli2 "**/*.md"

# Lint only changed files (simulation of hook)
git diff --name-only --diff-filter=ACM origin/main | grep -E '\.md$' | xargs npx markdownlint-cli2
```

#### Common Pitfalls

| Issue                 | Fix                                              |
| --------------------- | ------------------------------------------------ |
| Bare URL flagged      | Wrap in `< >` or convert to `[text](url)`        |
| Long code block lines | Acceptable if inside fenced block (rule relaxed) |
| HTML tables           | Replace with pure markdown tables                |
| Multiple H1 headings  | Downshift to `##` for subsequent sections        |

## 🚀 Development Workflow

### Branch Strategy

```bash
# Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/awesome-new-feature

# Or for bug fixes
git checkout -b fix/issue-description

# Or for documentation
git checkout -b docs/improve-contributing-guide
```

### Stacked PRs with Graphite (Recommended)

For incremental, reviewable changes, we recommend stacked PRs using the Graphite CLI:

```bash
# Sync and create a new branch on top of your current stack
pnpm graphite:sync
pnpm graphite:branch -- --name "feature/my-change"

# Commit small focused changes and push
git add -A && git commit -m "feat(xyz): small focused change"

# Restack if base changed
pnpm graphite:restack

# Submit your stack as PRs
pnpm graphite:submit:stack

# One-shot combo when you're confident:
pnpm graphite:auto
```

Notes:

- Keep changes small and independent; prefer many small PRs over one large PR.
- Our Graphite config auto-updates PR descriptions and deletes merged branches.
- Protected branches cannot be rebased (`main`, `develop`, `staging`).

### Commit Message Format

We follow [Conventional Commits](https://conventionalcommits.org/) specification:

```bash
# Format: <type>[optional scope]: <description>
#
# Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore

# Examples:
git commit -m "feat(a2a): add message compression support"
git commit -m "fix(tui): resolve dashboard rendering issue"
git commit -m "docs(mcp): update API documentation"
git commit -m "test(agents): add integration tests for workflow"
git commit -m "security(core): implement input sanitization"
```

### Pull Request Process

#### 1. **Before Creating PR**

```bash
# Ensure all tests pass
pnpm test

# Run linting and formatting
pnpm lint
pnpm format

# Run security scans
pnpm security:scan

# Verify build works
pnpm build

# Check structure compliance
pnpm structure:validate
```

#### 2. **PR Title and Description**

```markdown
# Title Format

feat(package): brief description of changes

# Description Template

## Summary

Brief description of what this PR accomplishes.

## Changes

- List of specific changes made
- New features added
- Bug fixes included

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] Security testing performed

## Documentation

- [ ] Code documentation updated
- [ ] README files updated
- [ ] API documentation updated

## Breaking Changes

None / List any breaking changes

## Related Issues

Closes #123
Fixes #456
```

#### 3. **Review Process**

- **Automated Checks**: All CI checks must pass
- **Code Review**: At least one maintainer review required
- **Architecture Review**: For architectural changes
- **Security Review**: For security-related changes

## 🏗️ Package Development

### Creating New Packages

#### 1. **Package Structure**

```bash
packages/new-package/
├── src/
│   ├── index.ts          # Main exports
│   ├── lib/              # Core implementation
│   └── types.ts          # Type definitions
├── tests/
│   ├── unit/             # Unit tests
│   └── integration/      # Integration tests
├── docs/
│   └── api.md            # API documentation
├── package.json          # Package configuration
├── project.json          # Nx project configuration
├── vitest.config.ts      # Test configuration
├── tsconfig.json         # TypeScript configuration
└── README.md             # Package documentation
```

#### 2. **Package Configuration**

```json
// package.json
{
  "name": "@cortex-os/new-package",
  "version": "1.0.0",
  "description": "Brief description of package functionality",
  "type": "module",
  "exports": {
    ".": "./dist/index.js",
    "./types": "./dist/types.js"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest",
    "lint": "eslint src/**/*.ts",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@cortex-os/a2a": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  }
}
```

#### 3. **Nx Project Configuration**

```json
// project.json
{
  "name": "new-package",
  "projectType": "library",
  "sourceRoot": "packages/new-package/src",
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "tsc",
        "cwd": "packages/new-package"
      }
    },
    "test": {
      "executor": "nx:run-commands",
      "options": {
        "command": "vitest run",
        "cwd": "packages/new-package"
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint",
      "outputs": ["{options.outputFile}"],
      "options": {
        "lintFilePatterns": ["packages/new-package/**/*.ts"]
      }
    }
  },
  "tags": ["scope:new-package", "type:library"]
}
```

### Package Integration

- Register package in `pnpm-workspace.yaml`
- Add to Nx workspace configuration
- Update root package.json dependencies if needed
- Add to main exports in root index file

## 🎨 UI/UX Contributions

### TUI Development (Rust)

```rust
// Follow these patterns for TUI components
use ratatui::{
    prelude::*,
    widgets::{Block, Borders, List, ListItem, Paragraph},
};

pub struct ComponentState {
    // State fields
}

impl ComponentState {
    pub fn new() -> Self {
        Self {
            // Initialize state
        }
    }

    pub fn render(&mut self, frame: &mut Frame, area: Rect) {
        // Render implementation
        let block = Block::default()
            .title("Component Title")
            .borders(Borders::ALL);

        frame.render_widget(block, area);
    }

    pub fn handle_key_event(&mut self, key: KeyEvent) -> Result<()> {
        // Key handling implementation
        Ok(())
    }
}
```

### Web UI Development (React)

```typescript
// Follow these patterns for React components
interface ComponentProps {
  data: DataType;
  onAction: (action: ActionType) => void;
  className?: string;
}

export const Component: React.FC<ComponentProps> = ({ data, onAction, className }) => {
  // Use hooks for state management
  const [state, setState] = useState<StateType>(initialState);

  // Event handlers
  const handleAction = useCallback(
    (action: ActionType) => {
      setState((prev) => updateState(prev, action));
      onAction(action);
    },
    [onAction],
  );

  // Render with accessibility
  return (
    <div
      className={cn('component-base', className)}
      role="region"
      aria-label="Component description"
    >
      {/* Component content */}
    </div>
  );
};
```

## 🐛 Bug Reports

### Bug Report Template

When reporting bugs, please include:

```markdown
## Bug Description

Clear description of what the bug is.

## Steps to Reproduce

1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior

What you expected to happen.

## Actual Behavior

What actually happened.

## Environment

- OS: [e.g., macOS 14.0]
- Node.js: [e.g., 20.0.0]
- Package Version: [e.g., 1.2.3]
- Browser (if applicable): [e.g., Chrome 118]

## Additional Context

- Error messages
- Screenshots
- Console output
- Related configuration
```

### Security Vulnerabilities

**DO NOT** create public issues for security vulnerabilities. Instead:

1. Email <security@cortex-os.dev> with details
2. Include "SECURITY" in the subject line
3. Provide detailed reproduction steps
4. Allow us to respond before public disclosure

## 🎯 Feature Requests

### Feature Request Template

```markdown
## Feature Summary

Brief description of the feature.

## Motivation

Why is this feature needed? What problem does it solve?

## Detailed Description

Comprehensive description of the proposed feature.

## Proposed Solution

How should this feature work?

## Alternatives Considered

What other solutions did you consider?

## Additional Context

- Mockups or diagrams
- Related issues or discussions
- Implementation suggestions
```

## 👥 Community Guidelines

### Code of Conduct

We follow the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). In summary:

- **Be respectful** and inclusive
- **Be collaborative** and constructive
- **Be patient** with newcomers and questions
- **Be mindful** of our diverse community

### Communication Channels

- **GitHub Discussions**: For general questions and discussions
- **GitHub Issues**: For bug reports and feature requests
- **Pull Requests**: For code contributions and reviews
- **Security Email**: <security@cortex-os.dev> for security issues

### Getting Help

- Check existing documentation and issues first
- Provide clear, specific questions with context
- Include relevant code snippets and error messages
- Be patient and respectful when asking for help

## 🏆 Recognition

### Contributor Recognition

We recognize contributions in several ways:

- **Contributors List**: All contributors listed in README
- **Release Notes**: Major contributions mentioned in release notes
- **Special Recognition**: Outstanding contributors may be invited to join the maintainer team

### Types of Contributions We Value

- Code contributions (features, fixes, improvements)
- Documentation improvements
- Bug reports and testing
- Community support and mentoring
- Security research and reporting
- Design and user experience improvements

## 📞 Contact

- **General Questions**: [GitHub Discussions](https://github.com/cortex-os/cortex-os/discussions)
- **Bug Reports**: [GitHub Issues](https://github.com/cortex-os/cortex-os/issues)
- **Security Issues**: <security@cortex-os.dev>
- **Maintainer Contact**: <team@cortex-os.dev>

## 📜 License

By contributing to Cortex-OS, you agree that your contributions will be licensed under the same [MIT License](./LICENSE) that covers the project.

---

**Thank you for contributing to Cortex-OS!** 🚀  
_Together, we're building the future of AI agent systems_

[![Contributors](https://img.shields.io/github/contributors/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/graphs/contributors)
[![GitHub Stars](https://img.shields.io/github/stars/cortex-os/cortex-os?style=social)](https://github.com/cortex-os/cortex-os)
