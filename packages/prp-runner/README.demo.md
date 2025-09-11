# PRP Runner Demos: Semantic Search and MCP HTTP

This package exposes two small demos to help exercise the in-repo semantic search and MCP tool surfaces.

## 1) Semantic Search CLI

Index a directory of markdown (`.md`/`.mdx`) files and run a semantic query using the in-memory `EmbeddingAdapter`.

- Run via Nx:

```bash
# From repo root, the demo runs inside the package folder, so point to ../../docs
pnpm nx run @cortex-os/prp-runner:demo:semsearch -- --dir ../../docs --query "What is Cortex-OS?" --topK 5
```

- Or directly from the package folder:

```bash
pnpm -C packages/prp-runner demo:semsearch -- --dir ../../docs --query "What is Cortex-OS?" --topK 3
```

Or use the root wrapper script:

```bash
node scripts/semantic-search-demo.mjs --dir ./docs --query "What is Cortex-OS?" --topK 5
```

Flags:

- `--dir|-d` root folder to index (default: `./docs`)
- `--query|-q` query text (default: `What is this project about?`)
- `--topK|-k` number of results (default: 5)

## 2) MCP HTTP Demo Server

Start a local HTTP server that exposes MCP tools (including `ai_search_knowledge`) at REST endpoints.

- Run via Nx:

```bash
pnpm nx run @cortex-os/prp-runner:demo:mcp -- --port 8081
```

It prints endpoints and a ready-to-copy curl example. Example call:

```bash
curl -s http://127.0.0.1:8081/mcp/tools/call \
  -H 'Content-Type: application/json' \
  -d '{
    "method":"tools/call",
    "params":{
      "name":"ai_search_knowledge",
      "arguments": {"query":"project overview","topK":3,"minSimilarity":0.2}
    }
  }' | jq .
```

Or start via the root wrapper:

```bash
node scripts/mcp-http-demo.mjs --port 8081
```

### Optional: Docs Semantic Search Toggle

Enable automatic docs ingestion for the MCP demo by setting:

```bash
export CORTEX_DOCS_SEMSEARCH=1
# Optional overrides
export CORTEX_DOCS_DIR=docs
export CORTEX_DOCS_GLOB="**/*.md"
```

Then start the demo server. It will ingest docs on boot and `ai_search_knowledge` will search those docs.

Notes:

- The embedding and search are deterministic and dependency-free for local dev.
- This demo intentionally avoids heavy external model stacks.
