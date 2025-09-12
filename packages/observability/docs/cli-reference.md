# CLI Reference

`@cortex-os/observability` does not ship a standalone CLI. Use the exported helpers in your own scripts.

Generate a flamegraph:
```bash
node -e "require('@cortex-os/observability').generateFlamegraph('app.js','./flame')"
```
