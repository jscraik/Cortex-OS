---
title: Architecture
sidebar_label: Architecture
---

# Architecture

```text
┌────────────┐     ┌──────────┐     ┌─────────────────┐
│ SPIRE Agent│────►│SpiffeClient│───►│WorkloadIdentity │
└────────────┘     └──────────┘     └─────────────────┘
                                  │
                                  ▼
                           ┌─────────────┐
                           │ MTLSManager │
                           └─────────────┘
                                  │
                                  ▼
                         ┌────────────────────┐
                         │SecurityEventEmitter│
                         └────────────────────┘
```

- **SpiffeClient** fetches SVIDs from the SPIRE agent.
- **WorkloadIdentity** represents the SPIFFE ID and certificates.
- **MTLSManager** creates TLS contexts and rotates certificates.
- **SecurityEventEmitter** emits contract-validated CloudEvents.
