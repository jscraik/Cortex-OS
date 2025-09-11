# Migration Guide

For upgrades between major versions:

1. Read the [changelog](changelog.md) for breaking changes.
2. Update configuration files and ensure database migrations are applied with Alembic.
3. Rebuild custom plugins against the new API and re-run tests.
