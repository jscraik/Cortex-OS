# Security Scripts

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

This directory contains scripts related to security fixes, validations, and improvements.

## Categories

- **Fix Scripts**: Scripts that fix specific security vulnerabilities
- **Validation Scripts**: Scripts that validate security improvements
- **Test Scripts**: Scripts that test for security vulnerabilities

## Usage

Most security scripts should be run from the project root directory:

```bash
node scripts/security/fix-db-injection.mjs
```

or

```bash
./scripts/security/fix-security-issues.sh
```

## Best Practices

- Always run security validation after making changes
- Document the purpose and behavior of security fixes
- Include clear error handling and feedback in security scripts
