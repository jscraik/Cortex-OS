# Examples & Tutorials

The `examples` directory contains runnable demos. To list available examples:
```bash
ls packages/mcp/examples
```

A quick tutorial for building a plugin:
1. Copy `examples/plugin-template`.
2. Implement `register()` to expose tool functions.
3. Point `MCP_PLUGIN_DIR` to your plugin path and restart the server.
