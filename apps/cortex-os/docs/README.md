# Cortex-OS App Documentation

## 🚨 CRITICAL: brAInwav Production Standards

**ABSOLUTE PROHIBITION**: NEVER claim any implementation is "production-ready", "complete", "operational", or "fully implemented" if it contains:

- `Math.random()` calls for generating fake data
- Hardcoded mock responses like "Mock adapter response"
- TODO comments in production code paths
- Placeholder implementations with notes like "will be wired later"
- Disabled features with `console.warn("not implemented")`
- Fake system metrics or data generation

**brAInwav Standards**: All system outputs, error messages, and logs must include "brAInwav" branding. Status claims must be verified against actual code implementation.

**Reference**: See `/Users/jamiecraik/.Cortex-OS/.cortex/rules/RULES_OF_AI.md` for complete production standards.

---

![status](https://img.shields.io/badge/status-alpha-orange)

## Index / Overview

| Section | Description |
| --- | --- |
| [Introduction](./introduction.md) | Purpose and scope of the Cortex-OS app |
| [Getting Started](./getting-started.md) | Install prerequisites and launch steps |
| [Configuration](./configuration.md) | Environment variables and config files |
| [Architecture](./architecture.md) | Component breakdown and data flow |
| [CLI Reference](./cli.md) | Commands and options |
| [API Reference](./api.md) | Programmatic usage and types |
| [User Guide](./user-guide.md) | Day-to-day tasks and shortcuts |
| [Best Practices](./best-practices.md) | Recommended patterns |
| [Providers & Setup](./providers.md) | External service configuration |
| [Security](./security.md) | Encryption and secrets |
| [Policy & Terms](./policy-terms.md) | Usage policies |
| [FAQ](./faq.md) | Common questions |
| [Roadmap](./roadmap.md) | Planned enhancements |
| [Troubleshooting](./troubleshooting.md) | Error resolution |
| [Changelog](./changelog.md) | Version history |
| [Migration](./migration.md) | Major version upgrades |
| [Testing & QA](./testing.md) | Running tests |
| [Deployment](./deployment.md) | Container and server setups |
| [Examples & Tutorials](./examples.md) | Sample code and walkthroughs |
| [Performance & Benchmarking](./performance.md) | Profiling guidance |
| [Logging & Monitoring](./logging.md) | Observability tips |
| [Glossary](./glossary.md) | Domain definitions |
| [Contributor Setup](./contributor-setup.md) | Local development instructions |
| [Accessibility](./accessibility.md) | WCAG considerations |

### Feature Status

| Feature | Status |
| --- | --- |
| Pluggable storage backends | ✅ Implemented |
| Per-namespace encryption | ✅ Implemented |
| Embedding providers (MLX, Ollama, noop) | ✅ Implemented |
| Memory decay | ✅ Implemented |
| Remote model gateway | ⚠️ Planned |
| Advanced query filters | ⚠️ Planned |
