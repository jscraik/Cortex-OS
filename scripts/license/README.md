# License Tools

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

This directory contains scripts for license management and compliance.

## Contents

- `license-scanner.mjs` - Scans project dependencies for license information and generates reports

## Usage

To run the license scanner:

```bash
node scripts/license/license-scanner.mjs
```

The scanner will analyze all project dependencies and generate a report of their licenses, helping to ensure compliance with open-source licensing requirements.
