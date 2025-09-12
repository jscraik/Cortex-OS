# MCP Bridge Documentation

![CI](https://img.shields.io/github/actions/workflow/status/cortexso/Cortex-OS/ci.yml?style=flat-square) ![PyPI](https://img.shields.io/pypi/v/cortex-mcp-bridge?style=flat-square)

## Overview
`cortex-mcp-bridge` converts Machine Control Protocol (MCP) JSON lines from **stdin** into HTTP POST requests and optionally listens to Server-Sent Events (SSE) to emit back to **stdout**. It offers rate limiting and queue backpressure for stable transport.

### Current Features
- Forward stdin JSON lines to an HTTP endpoint.
- Subscribe to SSE and print events to stdout.
- Basic rate limiting and queue bounds.

### Planned Features
- Authentication headers for outbound requests.
- Advanced drop strategies and metrics.
- Persistent retry storage.

## Documentation
- [Introduction](./introduction.md)
- [Getting Started](./getting-started.md)
- [Configuration](./configuration.md)
- [Architecture](./architecture.md)
- [CLI Reference](./cli-reference.md)
- [API Reference](./api-reference.md)
- [User Guide](./user-guide.md)
- [Best Practices](./best-practices.md)
- [Providers & Setup](./providers-setup.md)
- [Security](./security.md)
- [Policy & Terms](./policy-terms.md)
- [FAQ](./faq.md)
- [Roadmap](./roadmap.md)
- [Troubleshooting](./troubleshooting.md)
- [Changelog](./changelog.md)
- [Migration Guide](./migration-guide.md)
- [Testing & QA](./testing.md)
- [Deployment](./deployment.md)
- [Examples & Tutorials](./examples.md)
- [Performance & Benchmarking](./performance.md)
- [Logging & Monitoring](./logging-monitoring.md)
- [Glossary](./glossary.md)
- [Contributor Setup](./contributor-setup.md)
- [Accessibility Guidelines](./accessibility.md)
