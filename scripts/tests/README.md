# Test Scripts

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

This directory contains scripts for testing various components of the Cortex-OS system.

## Categories

- **Security Tests**: Scripts that test for security vulnerabilities
- **Integration Tests**: Scripts that test integration between components
- **Database Tests**: Scripts that test database functionality
- **MLX Tests**: Scripts that test MLX integration

## Usage

Test scripts should be run from the project root directory:

```bash
node scripts/tests/test-neo4j-security.mjs
```

or

```bash
./scripts/tests/test-command-security.sh
```

## Best Practices

- Run tests frequently during development
- Document expected outcomes and test coverage
- Include clear error reporting and feedback
