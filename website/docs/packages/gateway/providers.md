---
title: Providers
sidebar_label: Providers
---

# Providers Setup

The gateway integrates with external services via environment variables.

## MCP Server
| Variable | Example |
| ---------- | --------- |
| `MCP_TRANSPORT` | `http` |
| `MCP_SERVER_URL` | `http://localhost:8080` |

## RAG Provider
| Variable | Example |
| ---------- | --------- |
| `RAG_BACKEND_URL` | `http://localhost:4000` |

Set these variables in `.env` or in your deployment environment before starting the gateway.
