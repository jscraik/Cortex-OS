# Getting Started

## Prerequisites
- Python 3.13+
- Redis and a PostgreSQL or MySQL database
- `uv` or `pip` for dependency management

## Installation
```bash
# from repository root
cd packages/mcp
uv sync  # or: pip install -e .
```

## First Launch
```bash
# start the server
mcp-server serve --host 0.0.0.0 --port 8000
```

Visit `http://localhost:8000/docs` for the interactive API explorer.
