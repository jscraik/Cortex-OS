# Cortex-OS Scripts Directory

This directory contains utility scripts, templates, fixes, tests, and other development tools for the Cortex-OS project.

## Directory Structure

- `/scripts/cleanup/` - Scripts for cleaning up and removing legacy code
- `/scripts/code-quality/` - Scripts related to code quality, formatting, and static analysis
- `/scripts/compliance/` - Scripts related to licensing, compliance, and governance
- `/scripts/database/` - Scripts related to database management and operations
- `/scripts/deploy/` - Scripts for deploying Cortex-OS to various environments
- `/scripts/dist/` - Distribution and packaging scripts
- `/scripts/fixes/` - Scripts that fix specific issues or perform one-time corrections
- `/scripts/license/` - Scripts for license scanning and management
- `/scripts/security/` - Scripts related to security fixes, validations, and improvements
- `/scripts/temp/` - Temporary configuration files and snippets
- `/scripts/templates/` - Template files used for code generation or injection
- `/scripts/tests/` - Scripts for testing various components of the system
- `/scripts/updates/` - Scripts that update components and configurations
- `/scripts/utils/` - Utility scripts that help with common development tasks

## Best Practices

1. **Script Organization**:
   - Place scripts in the appropriate subdirectory based on their function
   - Use descriptive filenames that indicate the script's purpose
   - Include proper shebang lines for executable scripts

2. **Template Files**:
   - Store all template files in `/scripts/templates/`
   - Use `.template` extension for non-executable templates
   - Provide proper documentation in template files

3. **Script Documentation**:
   - Include a header comment explaining the script's purpose
   - Document any required arguments or environment variables
   - Add usage examples where appropriate

4. **TypeScript Exclusion**:
   - Template files and standalone TypeScript files used as templates are excluded from compilation in tsconfig.json
   - Patterns: `scripts/**/*template*.ts`, `scripts/**/*-class.ts`, `scripts/**/*-standalone.ts`

## Usage

To run a script:

```bash
# For Node.js scripts
node scripts/utils/example-script.mjs

# For bash scripts
./scripts/fixes/fix-terminal.sh
```

## Available Scripts

### Fixes

- `fix-mlx-test.sh` - Fixes MLX test files
- `fix-terminal.sh` - Resolves sudo terminal issues

### Templates

- `neo4j-secure-class.template` - Template for Neo4j secure class implementation
- `neo4j-secure-standalone.ts` - Standalone TypeScript implementation of secure Neo4j class

### Utils

- `example-template-usage.mjs` - Example of how to use template files
- `verify-template-setup.mjs` - Verifies template configuration is correct
