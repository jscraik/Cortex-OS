---
title: Architecture
sidebar_label: Architecture
---

# Architecture

```
Fastify (HTTP server)
 ├─ Plugins: helmet, cors, rate-limit, swagger
 ├─ Services
 │   ├─ RegistryService – fetches and caches registry data
 │   └─ MarketplaceService – aggregates servers and categories
 └─ Routes
     ├─ /api/v1/servers
     ├─ /api/v1/registries
     ├─ /api/v1/categories
     ├─ /api/v1/stats
     └─ /health
```
