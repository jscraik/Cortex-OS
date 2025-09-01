# Cortex-OS Scripts Directory

[![CI Status](https://github.com/Cortex-OS/Cortex-OS/actions/workflows/ci.yml/badge.svg)](https://github.com/Cortex-OS/Cortex-OS/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](../LICENSE)

This directory contains utility scripts, templates, fixes, tests, and other development tools for the Cortex-OS project.

## Table of Contents

- [Directory Structure](#directory-structure)
- [Best Practices](#best-practices)
- [Usage](#usage)
- [Available Scripts](#available-scripts)

## Directory Structure

- `cleanup/` – remove legacy code.
- `code-quality/` – formatting and static analysis helpers.
- `compliance/` – license and governance tooling.
- `database/` – database management utilities.
- `deploy/` – deployment helpers.
- `dist/` – distribution and packaging scripts.
- `fixes/` – one-off fixes.
- `license/` – license scanning and management.
- `security/` – security validations and improvements.
- `temp/` – temporary configuration files and snippets.
- `templates/` – code generation templates.
- `tests/` – scripts for testing components.
- `updates/` – configuration and dependency updates.
- `utils/` – miscellaneous development helpers.

## Best Practices

1. **Script organization** – use descriptive file names, place scripts in the correct subdirectory, and include shebang lines for executables.
2. **Template files** – store in `scripts/templates/`, use the `.template` extension, and document usage within the file.
3. **Script documentation** – include a header comment, document required arguments or environment variables, and add usage examples.
4. **TypeScript exclusion** – template and standalone TypeScript files are excluded from compilation (`scripts/**/*template*.ts`, `scripts/**/*-class.ts`, `scripts/**/*-standalone.ts`).

## Usage

To run a script:

```bash
# Node.js scripts
node scripts/utils/example-script.mjs

# Bash scripts
./scripts/fixes/fix-terminal.sh
```

## Available Scripts

### Fixes

- `fix-mlx-test.sh` – fixes MLX test files.
- `fix-terminal.sh` – resolves sudo terminal issues.

### Templates

- `neo4j-secure-class.template` – Neo4j secure class template.
- `neo4j-secure-standalone.ts` – standalone TypeScript implementation of the secure Neo4j class.

### Utils

- `example-template-usage.mjs` – demonstrates template usage.
- `verify-template-setup.mjs` – verifies template configuration.
