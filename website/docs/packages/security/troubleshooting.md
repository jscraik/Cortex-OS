---
title: Troubleshooting
sidebar_label: Troubleshooting
---

# Troubleshooting

| Issue | Resolution |
| --- | --- |
| `UNAVAILABLE: no identity` | Ensure SPIRE agent socket is reachable and workload is registered. |
| Certificate expires early | Check system clock and `CERT_TTL` setting. |
| `emit` rejects event | Confirm schema ID exists in registry and policy allows it. |
