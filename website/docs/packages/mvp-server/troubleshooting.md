---
title: Troubleshooting
sidebar_label: Troubleshooting
---

# Troubleshooting

| Issue | Cause | Resolution |
| ------- | ------- | ----------- |
| Port already in use | Another service running | Change `MVP_SERVER_PORT` |
| Plugin fails to load | Invalid export signature | Ensure `export default async function(app){}` |
| Missing metrics | `prom-client` not installed |`pnpm add prom-client`
