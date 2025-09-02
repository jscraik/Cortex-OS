# Update Scripts

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

This directory contains scripts that update components and configurations in the Cortex-OS system.

## Categories

- **Agent Updates**: Scripts that update agent-related functionality
- **Memory Updates**: Scripts that update memory-related functionality
- **MCP Server Updates**: Scripts that update MCP server implementations
- **Database Updates**: Scripts that update database managers and implementations

## Usage

Update scripts should be run from the project root directory:

```bash
node scripts/updates/update-neo4j-secure.mjs
```

or

```bash
python scripts/updates/update-mcp-server-secure.py
```

## Best Practices

- Always test updates in development before applying to production
- Document the changes made by update scripts
- Include error handling and rollback capabilities where possible
