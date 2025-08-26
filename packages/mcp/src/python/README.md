# MCP Python Sidecar

Simple Python sidecar for executing small eval payloads over HTTP for local development/testing.

Usage (local):

python src/server.py

Docker build (if using provided container):

docker build -t cortex/mcp-python -f containers/mcp-python/Dockerfile .

docker run -p 8081:8081 cortex/mcp-python

Notes:

- This sidecar intentionally restricts network by default when used in CI; set `PYREPL_NO_NET=1` in Docker/compose if required.
- For security and production use, replace `exec()` with a sandboxed execution engine.

CI notes:

- The repository CI runs `.github/workflows/installer-assert.yml` which builds a wheel from this package and uploads the wheel and its sha256 as workflow artifacts named `mcp-python-wheel` for inspection.
