# Getting Started

## Prerequisites
- Python 3.11+
- `httpx` dependency (installed automatically)

## Installation
```bash
pip install cortex-mcp-bridge
```

## Quick Start
Forward stdin JSON lines to a remote endpoint:
```bash
echo '{"msg": "hi"}' | mcp-bridge --outbound-url https://example.com/ingest
```
Subscribe to SSE and print events:
```bash
echo '{"msg": "hi"}' | mcp-bridge --outbound-url https://example.com/ingest --sse-subscribe-url https://example.com/events
```
