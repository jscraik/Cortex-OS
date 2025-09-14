# Troubleshooting Guide

## Dependency issues
Run `pnpm install --frozen-lockfile` to ensure consistent versions.

## Ports already in use
Check running processes: `lsof -i :3000` and stop conflicting services.

## Failing tests
Run `pnpm test --verbose` and inspect `reports/` for logs.
