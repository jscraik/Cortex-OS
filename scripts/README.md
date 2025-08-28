# Cortex-OS Scripts Directory

This directory contains utility scripts, templates, and fixes for the Cortex-OS project.

## Directory Structure

- `/scripts/fixes/` - Scripts that fix specific issues or perform one-time corrections
- `/scripts/templates/` - Template files used for code generation or injection
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
