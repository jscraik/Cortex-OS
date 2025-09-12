# CLI Reference

PRP Runner ships with demo commands for exercising core features.

## Semantic Search

```bash
pnpm -C packages/prp-runner demo:semsearch -- --dir <path> --query <text> --topK <n>
```

Options:
- `--dir|-d` Directory of markdown files.
- `--query|-q` Search text.
- `--topK|-k` Number of results (default: 5).

## MCP HTTP Server

```bash
pnpm -C packages/prp-runner demo:mcp -- --port 8081
```

Starts a REST server exposing MCP tools. `Ctrl+C` stops the server.
