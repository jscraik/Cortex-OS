---
title: Examples
sidebar_label: Examples
---

# Examples & Tutorials

## Send a Chat Message via API

```bash
curl -X POST http://localhost:3001/api/conversations \
  -H "Authorization: Bearer &lt;TOKEN&gt;" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test"}'
```
