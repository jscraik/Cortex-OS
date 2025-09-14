---
title: Faq
sidebar_label: Faq
---

# FAQ

**Q: How do I add a new model provider?**
A: Implement a provider adapter in the Model Gateway and supply the API key via environment variables.

**Q: Requests return 401. Why?**
A: The provider token is missing or invalid. Check your environment variables.

**Q: How can I cancel a running workflow?**
A: Use `CancellationController` from the orchestration package.
