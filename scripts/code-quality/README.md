# Code Quality Scripts

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

This directory contains scripts related to code quality, formatting, and static analysis.

## Categories

- **Code Quality Checks**: Scripts that check code quality standards
- **SonarJS Reports**: Scripts that generate and aggregate SonarJS reports
- **Formatting**: Scripts that fix formatting issues
- **Structure Validation**: Scripts that validate project structure

## Usage

Code quality scripts should be run from the project root directory:

```bash
node scripts/code-quality/code-quality-check.mjs
```

or

```bash
node scripts/code-quality/fix-formatting.mjs
```

## Best Practices

- Run code quality checks before committing code
- Fix formatting issues automatically when possible
- Document any ignored or suppressed issues
- Review SonarJS reports regularly to identify areas for improvement
