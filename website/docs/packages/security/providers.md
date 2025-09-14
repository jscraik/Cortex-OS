---
title: Providers
sidebar_label: Providers
---

# Providers & Setup

The package integrates with external SPIFFE/SPIRE services.

Set the following environment variables before startup:

```bash
export SPIRE_SOCKET=/tmp/spire-agent/public/api.sock
export TRUST_DOMAIN=cortex-os.local
```

Ensure the SPIRE agent is running and the service has read access to the Unix socket.
