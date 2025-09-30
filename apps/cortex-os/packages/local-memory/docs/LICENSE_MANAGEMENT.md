# brAInwav License Management System

## Overview

The brAInwav Cortex-OS License Management System provides secure storage and retrieval of license data using 1Password CLI as the primary method, with secure fallbacks for other environments.

## Features

- **1Password CLI Integration**: Primary secure storage method
- **Environment Variable Override**: For CI/CD and container environments
- **Encrypted Fallback Storage**: Local file fallback with encryption
- **License Validation**: Automatic expiration checking and feature validation
- **CLI Management Tools**: Command-line interface for license operations
- **Caching**: Performance optimization with secure in-memory caching

## Installation

The license management system is included in the `@cortex-os/local-memory` package:

```bash
pnpm install @cortex-os/local-memory
```

## Prerequisites

### 1Password CLI (Recommended)

Install the 1Password CLI for secure license storage:

```bash
# macOS
brew install 1password-cli

# Other platforms
# See: https://developer.1password.com/docs/cli/get-started/
```

Authenticate with 1Password:

```bash
op signin
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CORTEX_LICENSE_1P_ITEM` | 1Password item name | `brainwav-cortex-os-license` |
| `CORTEX_LICENSE_1P_VAULT` | 1Password vault name | `brAInwav` |
| `CORTEX_LICENSE_FALLBACK_PATH` | Local fallback file path | `~/.cortex-os/license.json` |
| `CORTEX_LICENSE_DATA` | Direct license JSON override | - |

### Usage Priority

1. **Environment Override** (`CORTEX_LICENSE_DATA`)
2. **1Password CLI** (primary method)
3. **Fallback File** (local storage)

## CLI Commands

### License Information

```bash
# View license details
pnpm license:info

# Check license validity
pnpm license info --validate
```

### 1Password Management

```bash
# Check 1Password CLI setup
pnpm license:check

# Store license in 1Password
pnpm license store --file license.json

# Store in custom vault/item
pnpm license store --file license.json --vault "Custom Vault" --item "custom-license"
```

### Development Tools

```bash
# Generate sample license file
pnpm license generate-sample --output sample-license.json

# Validate license file format
pnpm license validate-file --file license.json

# Clear license cache
pnpm license clear-cache
```

## Programmatic Usage

### Basic License Management

```typescript
import { LicenseManager, createLicenseManagerFromEnv } from '@cortex-os/local-memory/license';

// Create manager from environment
const manager = createLicenseManagerFromEnv();

// Get license (with caching)
const license = await manager.getLicense();

// Validate license
const validation = await manager.validateLicense();
if (!validation.valid) {
  throw new Error(`License invalid: ${validation.reason}`);
}

console.log(`License valid for ${license.brainwavOrganization}`);
console.log(`Days remaining: ${validation.daysRemaining}`);
```

### Custom Configuration

```typescript
import { LicenseManager } from '@cortex-os/local-memory/license';

const manager = new LicenseManager({
  onePasswordItem: 'my-custom-license',
  onePasswordVault: 'Corporate Vault',
  fallbackPath: '/secure/path/license.json',
  environmentOverride: 'MY_LICENSE_ENV',
});

const license = await manager.getLicense();
```

### Application Initialization

```typescript
import { initializeLicense } from '@cortex-os/local-memory/license';

try {
  const { manager, license } = await initializeLicense();
  
  // License is validated and ready to use
  console.log(`brAInwav License: ${license.brainwavOrganization}`);
  console.log(`Features: ${license.features.join(', ')}`);
  
} catch (error) {
  console.error('License initialization failed:', error.message);
  process.exit(1);
}
```

## License Storage

### 1Password CLI Storage

Store license securely in 1Password:

```bash
# Create license file (JSON format)
cat > license.json << EOF
{
  "licenseKey": "brainwav-prod-abc123...",
  "customerEmail": "customer@company.com",
  "brainwavOrganization": "Customer Organization",
  "expirationDate": "2025-12-31T23:59:59.000Z",
  "maxUsers": 100,
  "features": ["local-memory", "rag-processing", "evaluation-harness"],
  "issuedAt": "2024-01-01T00:00:00.000Z"
}
EOF

# Store in 1Password
pnpm license store --file license.json
```

### Environment Variable Override

For CI/CD environments:

```bash
export CORTEX_LICENSE_DATA='{"licenseKey":"...","customerEmail":"...","brainwavOrganization":"...","expirationDate":"...","maxUsers":100,"features":["local-memory"],"issuedAt":"..."}'
```

### Docker/Container Usage

```dockerfile
# Dockerfile
ENV CORTEX_LICENSE_DATA='{"licenseKey":"...", ...}'

# Or mount secret file
VOLUME ["/app/secrets"]
ENV CORTEX_LICENSE_FALLBACK_PATH="/app/secrets/license.json"
```

## Security Features

### 1Password CLI Security

- Licenses stored in encrypted 1Password vaults
- CLI authentication required for access
- Audit trail of license access
- Secure sharing within organization

### Fallback Security

- Local files should be encrypted at rest
- Restrictive file permissions (600)
- Consider using OS keychain integration

### Runtime Security

- License data cached securely in memory
- Cache expiration (5 minute default)
- No license data logged in production
- brAInwav error messages for audit trails

## Error Handling

The license system provides detailed error messages with brAInwav branding:

```typescript
try {
  const license = await manager.getLicense();
} catch (error) {
  // Errors include "brAInwav" prefix for identification
  console.error(error.message);
  // Example: "brAInwav license retrieval failed: 1Password CLI not authenticated"
}
```

### Common Error Scenarios

1. **1Password CLI Not Installed**
   - Automatic fallback to alternative methods
   - Clear installation instructions in error message

2. **License Expired**
   - Validation provides expiration details
   - Grace period warnings (7 days before expiration)

3. **Invalid License Format**
   - Detailed validation error messages
   - Schema validation with field-specific errors

4. **No License Found**
   - Checked all configured sources
   - Instructions for license installation

## Monitoring & Observability

### License Status Logging

```typescript
// License validation includes brAInwav branding
const validation = await manager.validateLicense();

// Logs include:
// [brAInwav] License loaded from 1Password CLI
// [brAInwav] License valid for Customer Org (45 days remaining)
// [brAInwav] License expires in 7 days - please renew
```

### Health Checks

```typescript
// Include license validation in health checks
app.get('/health', async (req, res) => {
  try {
    const validation = await manager.validateLicense();
    res.json({
      status: validation.valid ? 'healthy' : 'unhealthy',
      license: {
        valid: validation.valid,
        daysRemaining: validation.daysRemaining,
        organization: license.brainwavOrganization,
      },
      brainwav: true, // brAInwav branding
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      brainwav: true,
    });
  }
});
```

## Development & Testing

### Sample License Generation

```bash
# Generate development license
pnpm license generate-sample --output dev-license.json

# Validate format
pnpm license validate-file --file dev-license.json
```

### Testing Environment

```bash
# Use environment override for tests
export CORTEX_LICENSE_DATA='{"licenseKey":"test-key","customerEmail":"test@brainwav.com","brainwavOrganization":"Test Org","expirationDate":"2025-12-31T23:59:59.000Z","maxUsers":1,"features":["test"],"issuedAt":"2024-01-01T00:00:00.000Z"}'

# Run tests
pnpm test
```

## Migration Guide

### From Plaintext Files

If migrating from plaintext license.json files:

1. **Backup Existing License**

   ```bash
   cp ~/.local-memory/license.json license-backup.json
   ```

2. **Install 1Password CLI**

   ```bash
   brew install 1password-cli
   op signin
   ```

3. **Store in 1Password**

   ```bash
   pnpm license store --file license-backup.json
   ```

4. **Test Retrieval**

   ```bash
   pnpm license:info
   ```

5. **Remove Plaintext File** (after verification)

   ```bash
   rm ~/.local-memory/license.json
   ```

## Troubleshooting

### 1Password CLI Issues

```bash
# Check CLI installation
op --version

# Check authentication
op account list

# Test vault access
op vault list

# Run brAInwav diagnostics
pnpm license:check
```

### License Loading Issues

```bash
# Check all sources in order
pnpm license info

# Clear cache and retry
pnpm license clear-cache
pnpm license info --validate
```

### Permission Issues

```bash
# Check file permissions
ls -la ~/.cortex-os/license.json

# Fix permissions
chmod 600 ~/.cortex-os/license.json
```

## Support

For license-related issues:

1. **Check CLI diagnostics**: `pnpm license:check`
2. **Validate license format**: `pnpm license validate-file --file your-license.json`
3. **Review error messages**: All errors include "brAInwav" prefix for identification
4. **Contact brAInwav Support**: Include license validation output and error messages

---

**brAInwav Cortex-OS License Management System**  
**Version**: 1.0.0  
**Maintained by**: brAInwav Development Team
