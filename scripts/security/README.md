# Security Scripts

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
