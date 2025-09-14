---
title: Faq
sidebar_label: Faq
---

# FAQ

**Q:** Why are messages dropped?
**A:** The queue is full. Increase `--queue-limit` or use `--drop-strategy block`.

**Q:** Does the bridge support websockets?
**A:** Not yet; only HTTP POST and SSE are supported.

**Q:** How do I add headers to requests?
**A:** Wrap `httpx.AsyncClient` with custom middleware or run behind a proxy.
