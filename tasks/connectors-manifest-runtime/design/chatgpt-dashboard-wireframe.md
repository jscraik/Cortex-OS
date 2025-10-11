# ChatGPT Connectors Dashboard Wireframe

```
┌────────────────────────────────────────────────────────────┐
│  brAInwav Connectors (brand)                               │
│  Generated at: 2025-10-10T00:00:00Z      Refresh [button]  │
│  TTL: ~120s                       Signature: p1BDrO…       │
├────────────────────────────────────────────────────────────┤
│  [Status legend: ● Enabled  ○ Disabled]                    │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Alpha Connector                     ● Enabled        │  │
│  │ Version: 2.0.0                                         │  │
│  │ Endpoint: https://example.invalid/alpha               │  │
│  │ Auth: bearer (Authorization)                          │  │
│  │ TTL: 90s                                              │  │
│  │ Tags: alpha, core                                     │  │
│  │ Scopes:                                               │  │
│  │   • alpha:read                                        │  │
│  │   • alpha:write                                       │  │
│  │ Headers: Authorization: Bearer ${ALPHA}               │  │
│  │ Metadata: owner=integrations, category=search         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Beta Connector                       ○ Disabled      │  │
│  │ Version: 1.0.0                                         │  │
│  │ Endpoint: https://example.invalid/beta                │  │
│  │ Auth: apiKey (X-Api-Key)                              │  │
│  │ TTL: 120s                                             │  │
│  │ Tags: beta                                            │  │
│  │ Scopes:                                               │  │
│  │   • beta:write                                        │  │
│  │ Headers: X-Api-Key: ${BETA_TOKEN}                      │  │
│  │ Metadata: notes=Disabled for preview                  │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

**Interaction Notes**
- Refresh button triggers a manual fetch via the `useConnectorState` hook.
- Status badges map to the `enabled` flag (● enabled / ○ disabled); additional future states (degraded/offline) can reuse the layout.
- Secondary metadata sections (headers, quotas, timeouts) collapse automatically when no data is present to keep cards compact.
- Layout flexes to a single-column list on narrow viewports; top summary and actions remain pinned.

