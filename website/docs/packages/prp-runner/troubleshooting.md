---
title: Troubleshooting
sidebar_label: Troubleshooting
---

# Troubleshooting Guide

### Semantic search returns no results
- Verify the `--dir` path contains markdown files.
- Ensure `CORTEX_DOCS_GLOB` matches filenames.

### MCP server fails to start
- Check that the chosen port is free.
- Confirm required environment variables are set.

### Still stuck?
Run with `DEBUG&#61;prp-runner:*` to enable verbose logging.
