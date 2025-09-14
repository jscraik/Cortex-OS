---
title: Configuration
sidebar_label: Configuration
---

# Configuration

The package reads configuration from environment variables and optional JSON files.

| Variable | Description | Default |
| --- | --- | --- |
| `SPIRE_SOCKET` | Path to the SPIRE agent Unix socket | `/tmp/spire-agent/public/api.sock` |
| `TRUST_DOMAIN` | SPIFFE trust domain | `cortex-os.local` |
| `CERT_TTL` | mTLS certificate lifetime in seconds | `3600` |

Configuration files may be supplied via `security.config.json` in the project root:

```json
{
  "socketPath": "/tmp/spire-agent/public/api.sock",
  "trustDomain": "cortex-os.local"
}

```