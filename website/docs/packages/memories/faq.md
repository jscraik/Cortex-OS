---
title: Faq
sidebar_label: Faq
---

# FAQ

**Why use both Neo4j and Qdrant?**
Graph storage captures relationships while Qdrant provides fast vector similarity search.

**Can I run without external services?**
Yes. Use the `sqlite` or `memory` adapters for local development.

**How do I enable PII redaction?**
Set `redactPII: true` in the policy for the target namespace.
