---
title: Architecture
sidebar_label: Architecture
---

# Architecture

Cortex WebUI is structured as a monorepo with separate frontend and backend packages sharing common code.

- **Frontend** - React + Vite application served on port 3000.
- **Backend** - Express server providing REST and WebSocket APIs on port 3001.
- **Shared** - TypeScript types and utilities consumed by both packages.

See [Project Structure](./project-structure.md) for a detailed directory layout.
