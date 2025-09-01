# Database Scripts

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

This directory contains scripts related to database management, updates, and cleanup.

## Categories

- **Database Updates**: Scripts that update database managers and implementations
- **Database Cleanup**: Scripts that clean up database entries
- **Manual Updates**: Scripts for manual database operations
- **Security Imports**: Scripts that add secure database imports

## Usage

Database scripts should be run from the project root directory:

```bash
node scripts/database/add-secure-db-import.mjs
```

or

```bash
node scripts/database/cleanup-db-manager.mjs
```

## Best Practices

- Always back up data before running database scripts
- Test database operations in development before running in production
- Document database schema changes
- Include error handling and validation in database scripts
