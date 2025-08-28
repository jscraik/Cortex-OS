# Database Scripts

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
