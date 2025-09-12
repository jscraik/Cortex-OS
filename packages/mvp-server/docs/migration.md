# Migration Guide

## From Prototype Server
- Replace custom Express setup with `@cortex-os/mvp-server`.
- Move route handlers into plugins.
- Update environment variables to `MVP_SERVER_*` prefixes.
