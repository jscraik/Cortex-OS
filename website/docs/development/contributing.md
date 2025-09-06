# Contributing

Welcome to the Cortex-OS development community! We're excited to have you contribute.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Set up the development environment**
4. **Create a feature branch**
5. **Make your changes**
6. **Submit a pull request**

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/Cortex-OS.git
cd Cortex-OS

# Run automated setup
./scripts/dev-setup.sh

# Verify installation
pnpm readiness:check
```

## Code Standards

### TypeScript/JavaScript

- **ESLint** configuration enforced
- **Prettier** for formatting
- **Biome** for additional linting
- **Import boundaries** via ESLint rules

### Python

- **Ruff** for linting and formatting
- **Type hints** required
- **docstrings** for public APIs
- **pytest** for testing

### Rust

- **rustfmt** for formatting
- **Clippy** for linting
- **cargo test** for testing

## Testing

```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test:unit
pnpm test:integration
pnpm test:security

# Run with coverage
pnpm test:coverage
```

## Pull Request Process

1. **Create descriptive commits** following conventional commits
2. **Write tests** for new functionality
3. **Update documentation** as needed
4. **Ensure CI passes** (linting, testing, security)
5. **Request review** from maintainers

### Commit Message Format

```
type(scope): description

body (optional)

footer (optional)
```

Examples:

- `feat(agents): add memory persistence capability`
- `fix(a2a): resolve event ordering issue`
- `docs(guides): update Python integration examples`

## Architecture Guidelines

### Import Boundaries

- **No direct imports** between feature packages
- **Use A2A events** for cross-package communication
- **Shared utilities** via `libs/typescript`
- **Contracts** defined in `libs/typescript/contracts`

### Security First

- **Input validation** using Zod schemas
- **Security scanning** in CI pipeline
- **Audit trails** for sensitive operations
- **Principle of least privilege**

## Release Process

Releases follow semantic versioning:

- **Major** (1.0.0) - Breaking changes
- **Minor** (0.1.0) - New features (backwards compatible)
- **Patch** (0.0.1) - Bug fixes

## Getting Help

- **GitHub Discussions** for questions
- **GitHub Issues** for bugs and feature requests
- **Discord** for real-time chat (coming soon)

## Recognition

Contributors are recognized in:

- **CONTRIBUTORS.md** file
- **Release notes**
- **Annual contributor highlights**

Thank you for contributing to Cortex-OS! 🚀
